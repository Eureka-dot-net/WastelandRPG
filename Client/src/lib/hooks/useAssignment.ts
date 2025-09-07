import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { Assignment } from "../types/assignment";
import type { Colony } from "../types/colony";
import type { Settler } from "../types/settler";
import type { MapResponse } from "../types/mapResponse";

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
                predicate: (query) => {
                    const key = query.queryKey as unknown[];
                    return key[0] === "assignments" && key[1] === colonyId;
                },
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

            // Also mark the settler as working
            queryClient.setQueryData<Colony>(["colony", serverId], (old) => {
                if (!old) return old;

                // Determine status based on assignment type
                let settlerStatus: 'working' | 'questing' | 'crafting' = 'working';
                const assignment = assignments?.find(a => a._id === assignmentId);
                if (assignment?.type === 'quest') {
                    settlerStatus = 'questing';
                } else if (assignment?.type === 'crafting') {
                    settlerStatus = 'crafting';
                }

                return {
                    ...old,
                    settlers: old.settlers.map((s) =>
                        s._id === settlerId ? { ...s, status: settlerStatus } : s
                    )
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

            // Rollback settler status to idle
            if (context?.settlerId) {
                queryClient.setQueryData<Colony>(["colony", serverId], (old) => {
                    if (!old) return old;

                    return {
                        ...old,
                        settlers: old.settlers.map((s) =>
                            s._id === context.settlerId ? { ...s, status: "idle" } : s
                        )
                    };
                });
            }
        },
        onSuccess: () => {
            // Patch all assignment caches with confirmed server data
            queryClient.invalidateQueries({
                queryKey: ["assignments", colonyId],
                exact: false
            });
        },
    });

    type InformAssignmentResult = {
        _id: string;
        state: string;
        foundSettler?: Settler;
        unlocks?: string; // e.g. "inventory"
        actualTransferredItems?: Record<string, number>;
        actualNewInventoryStacks?: number;
    };

    //TODO: I don't really understand why we need readonly here. Investigate
    type InformAssignmentContext = {
        prevData: { key: readonly unknown[]; data: Assignment[] | undefined }[];
        settlerId?: string;
        prevColonyData?: Colony;
        prevMapData?: { key: readonly unknown[]; data: MapResponse | undefined }[];
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

            // Find the assignment data to get its location for map grid updates
            let assignmentLocation: { x: number; y: number } | undefined;
            queries.forEach((query) => {
                const data = query.state.data as Assignment[] | undefined;
                const assignment = data?.find((a) => a._id === assignmentId);
                if (assignment?.location) {
                    assignmentLocation = assignment.location;
                }
            });

            // Optimistically update assignment state in all map grid caches that might contain this assignment
            let prevMapData: InformAssignmentContext["prevMapData"] = [];
            if (assignmentLocation) {
                const mapQueries = queryClient.getQueryCache().findAll({
                    queryKey: ["map", colonyId],
                    exact: false
                });

                // Store previous map data for rollback
                prevMapData = mapQueries.map((query) => ({
                    key: query.queryKey,
                    data: query.state.data as MapResponse | undefined,
                }));

                mapQueries.forEach((mapQuery) => {
                    queryClient.setQueryData<MapResponse>(mapQuery.queryKey, (old) => {
                        if (!old) return old;

                        // Update the top-level assignments array
                        const updatedAssignments = old.assignments?.map(a =>
                            a._id === assignmentId ? { ...a, state: "informed" as const } : a
                        ) || [];

                        // Update assignments in specific grid tiles that match the location
                        const updatedGrid = {
                            ...old.grid,
                            tiles: old.grid.tiles.map((tileRow) =>
                                tileRow.map((tile) => {
                                    // Check if this tile contains the assignment by location match
                                    const hasTargetAssignment = tile.assignments?.some(a =>
                                        a._id === assignmentId &&
                                        a.location?.x === assignmentLocation!.x &&
                                        a.location?.y === assignmentLocation!.y
                                    );

                                    if (hasTargetAssignment) {
                                        return {
                                            ...tile,
                                            assignments: tile.assignments?.map(a =>
                                                a._id === assignmentId ? { ...a, state: "informed" as const } : a
                                            )
                                        };
                                    }
                                    return tile;
                                })
                            )
                        };

                        return {
                            ...old,
                            assignments: updatedAssignments,
                            grid: updatedGrid
                        };
                    });
                });
            }

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


            return { prevData, settlerId, prevColonyData, prevMapData };
        },
        onSuccess: (result) => {
            if (!serverId) return;

            const newStacks = result.actualNewInventoryStacks || 0;
            if (newStacks <= 0) return; // Nothing to update

            queryClient.setQueryData<Colony>(["colony", serverId], (old) => {
                if (!old) return old;

                return {
                    ...old,
                    currentInventoryStacks: (old.currentInventoryStacks || 0) + newStacks,
                };
            });
        },
        onError: (_, __, context) => {
            // Rollback assignment data
            context?.prevData?.forEach(({ key, data }) =>
                queryClient.setQueryData(key, data)
            );

            // Rollback map data
            context?.prevMapData?.forEach(({ key, data }) =>
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
