import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { Assignment } from "../types/assignment";
import type { Colony } from "../types/colony";
import type { Settler } from "../types/settler";

interface UseAssignmentOptions {
    type?: string[];   // e.g. ['quest', 'exploration']
    status?: string[]; // e.g. ['in-progress', 'completed']
}

export function useAssignment(
    serverId: string | null,
    colonyId?: string | null,
    options: UseAssignmentOptions = {}
) {
    const queryClient = useQueryClient();
    const { type, status } = options;

    const queryParams = new URLSearchParams();
    if (type?.length) queryParams.set("type", type.join(","));
    if (status?.length) queryParams.set("status", status.join(","));

    // Fetch assignments
    const {
        data: assignments,
        error: errorAssignment,
        isLoading: loadingAssignment,
        refetch,
    } = useQuery<Assignment[]>({
        queryKey: ["assignments", colonyId, type ?? null, status ?? null],
        queryFn: async () => {
            const url = `/colonies/${colonyId}/assignments${queryParams.toString() ? `?${queryParams}` : ""
                }`;
            const response = await agent.get(url);
            return response.data.assignments as Assignment[];
        },
        enabled: !!colonyId,
    });

    /**
     * Helper: Patch a single updated assignment into *all* cached queries for this colony
     */
    const patchAllAssignmentCaches = (updated: Assignment) => {
        const queries = queryClient.getQueryCache().findAll({
            queryKey: ["assignments", colonyId],
        });

        queries.forEach((query) => {
            queryClient.setQueryData<Assignment[]>(query.queryKey, (old) =>
                old?.map((a) => (a._id === updated._id ? updated : a)) ?? []
            );
        });
    };

    // --- MUTATIONS ---

    type StartAssignmentContext = {
        prevData: { key: unknown[]; data: Assignment[] | undefined }[];
        settlerId: string;
    };

    // Start assignment (optimistic)
    const startAssignment = useMutation<
        Assignment, // return type from mutationFn
        Error, // error type
        { assignmentId: string; settlerId: string }, // variables type
        StartAssignmentContext // context type for onError/onSettled
    >({
        mutationFn: async ({ assignmentId, settlerId }) => {
            const response = await agent.post(
                `/colonies/${colonyId}/assignments/${assignmentId}/start`,
                { settlerId }
            );
            return response.data as Assignment;
        },
        onMutate: async ({ assignmentId, settlerId }) => {
            // Cancel any outgoing fetches for assignments to avoid overwriting our optimistic update
            await queryClient.cancelQueries({ queryKey: ["assignments", colonyId] });

            // Grab all cached queries for this colony
            const queries = queryClient.getQueryCache().findAll({
                queryKey: ["assignments", colonyId],
            });

            // Snapshot previous data for rollback
            const prevData: StartAssignmentContext["prevData"] = queries.map((query) => ({
                key: query.queryKey as unknown[],
                data: query.state.data as Assignment[] | undefined,
            }));

            // Optimistically mark assignment as in-progress
            queries.forEach((query) => {
                queryClient.setQueryData<Assignment[]>(query.queryKey, (old) =>
                    old?.map((a) =>
                        a._id === assignmentId ? { ...a, state: "in-progress", settlerId } : a
                    ) ?? []
                );
            });

            // Also mark the settler as working and optimistically update inventory stacks
            queryClient.setQueryData<Colony>(["colony", serverId], (old) => {
                if (!old) return old;
                
                let optimisticInventoryIncrease = 0;
                
                // Try to get the assignment data to find expectedNewItems
                const assignment = assignments?.find(a => a._id === assignmentId);
                if (assignment && assignment.expectedNewItems) {
                    optimisticInventoryIncrease = assignment.expectedNewItems;
                }
                
                // Determine status based on assignment type
                let settlerStatus: 'working' | 'questing' | 'crafting' = 'working';
                if (assignment?.type === 'quest') {
                    settlerStatus = 'questing';
                } else if (assignment?.type === 'crafting') {
                    settlerStatus = 'crafting';
                }
                
                return {
                    ...old,
                    settlers: old.settlers.map((s) =>
                        s._id === settlerId ? { ...s, status: settlerStatus } : s
                    ),
                    currentInventoryStacks: old.currentInventoryStacks + optimisticInventoryIncrease
                };
            });

            // Return snapshot for rollback in onError
            return { prevData, settlerId };
        },
        onError: (_, __, context) => {
            // Rollback previous cache if mutation failed
            context?.prevData?.forEach(({ key, data }) =>
                queryClient.setQueryData(key, data)
            );
            
            // Rollback settler status to idle and undo inventory update
            if (context?.settlerId) {
                queryClient.setQueryData<Colony>(["colony", serverId], (old) => {
                    if (!old) return old;
                    
                    let optimisticInventoryDecrease = 0;
                    // Try to get the assignment data to find expectedNewItems for rollback
                    const assignment = assignments?.find(a => a._id.toString().includes(context.settlerId));
                    if (assignment && assignment.expectedNewItems) {
                        optimisticInventoryDecrease = assignment.expectedNewItems;
                    }
                    
                    return {
                        ...old,
                        settlers: old.settlers.map((s) =>
                            s._id === context.settlerId ? { ...s, status: "idle" } : s
                        ),
                        currentInventoryStacks: Math.max(0, old.currentInventoryStacks - optimisticInventoryDecrease)
                    };
                });
            }
        },
        onSuccess: (updatedAssignment) => {
            // Patch all assignment caches with confirmed server data
            patchAllAssignmentCaches(updatedAssignment);
            
            // Update colony cache with actual server data
            if (updatedAssignment.expectedNewItems !== undefined) {
                queryClient.setQueryData<Colony>(["colony", serverId], (old) => {
                    if (!old) return old;
                    
                    // Find the difference between what we optimistically added and actual server response
                    const expectedOptimistic = assignments?.find(a => a._id === updatedAssignment._id)?.expectedNewItems || 0;
                    const actualFromServer = updatedAssignment.expectedNewItems || 0;
                    const adjustmentNeeded = actualFromServer - expectedOptimistic;
                    
                    return {
                        ...old,
                        currentInventoryStacks: old.currentInventoryStacks + adjustmentNeeded
                    };
                });
            }
        },
    });

    type InformAssignmentResult = {
        _id: string;
        state: string;
        foundSettler?: Settler;
        unlocks?: string; // e.g. "inventory"
    };

    //TODO: I don't really understand why we need readonly here. Investigate
    type InformAssignmentContext = {
        prevData: { key: readonly unknown[]; data: Assignment[] | undefined }[];
        settlerId?: string;
        prevColonyData?: Colony;
    };

    // Inform assignment (optimistic)
    const informAssignment = useMutation<
        InformAssignmentResult, // return type from mutationFn
        Error,                  // error type
        string,                 // variables type (assignmentId)
        InformAssignmentContext  // context type for onError/onSettled
    >({
        mutationFn: async (assignmentId: string) => {
            const response = await agent.patch(
                `/colonies/${colonyId}/assignments/${assignmentId}/informed`
            );
            return response.data;
        },
        onMutate: async (assignmentId) => {
            // Cancel ongoing queries for assignments
            await queryClient.cancelQueries({ queryKey: ["assignments", colonyId] });

            // Snapshot previous assignment data
            const queries = queryClient.getQueryCache().findAll({
                queryKey: ["assignments", colonyId],
            });
            const prevData: InformAssignmentContext["prevData"] = queries.map((query) => ({
                key: query.queryKey,
                data: query.state.data as Assignment[] | undefined,
            }));

            // Snapshot previous colony data
            const prevColonyData = queryClient.getQueryData<Colony>(["colony", serverId]);

            // Find the settlerId from the cached assignment
            let settlerId: string | undefined;
            let newUnlock: string | undefined;
            queries.forEach((query) => {
                const data = query.state.data as Assignment[] | undefined;
                const assignment = data?.find((a) => a._id === assignmentId);
                console.log("Found assignment for informing:", assignment);
                if (assignment?.settlerId) {
                    settlerId = assignment.settlerId;
                }
                if (assignment?.unlocks) {
                    newUnlock = assignment.unlocks;
                }
            });

            // Optimistically update assignment state to informed
            queries.forEach((query) => {
                queryClient.setQueryData<Assignment[]>(query.queryKey, (old) =>
                    old?.map((a) =>
                        a._id === assignmentId ? { ...a, state: "informed" } : a
                    ) ?? []
                );
            });

            // Optimistically update settler to idle (if found)
            if (settlerId) {
                queryClient.setQueryData<Colony>(["colony", serverId], (old) => {
                    if (!old) return old;
                
                    const newUnlocks = { ...old.unlocks };
                    if (newUnlock) {
                        newUnlocks[newUnlock as keyof typeof old.unlocks] = true;
                        console.log(`Unlocked feature: ${newUnlock}`);
                    }

                    return {
                        ...old,
                        unlocks: newUnlocks,
                        settlers: old.settlers.map((s) =>
                            s._id === settlerId ? { ...s, status: "idle" } : s
                        ),
                    };
                });
            }


            return { prevData, settlerId, prevColonyData };
        },
        onError: (_, __, context) => {
            // Rollback assignment data
            context?.prevData?.forEach(({ key, data }) =>
                queryClient.setQueryData(key, data)
            );
            
            // Rollback colony data (settler status and unlocks)
            if (context?.prevColonyData) {
                queryClient.setQueryData<Colony>(["colony", serverId], context.prevColonyData);
            }
        },

    });


    return {
        assignments,
        errorAssignment,
        loadingAssignment,
        startAssignment,
        informAssignment,
        refetch,
    };
}
