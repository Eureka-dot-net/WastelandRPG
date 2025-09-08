import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { Assignment } from "../types/assignment";
import type { Settler } from "../types/settler";
import type { Colony } from "../types/colony";

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

    // Start assignment (with optimistic settler status update)
    const startAssignment = useMutation<
        { success: true; assignmentId: string; settlerId: string }, // return type from mutationFn
        Error, // error type
        { assignmentId: string; settlerId: string }, // variables type
        { prevColony: Colony | undefined } // context for rollback
    >({
        mutationFn: async ({ assignmentId, settlerId }) => {
            const response = await agent.post(
                `/colonies/${colonyId}/assignments/${assignmentId}/start`,
                { settlerId }
            );
            return response.data;
        },
        onMutate: async ({ settlerId }) => {
            // Cancel any outgoing colony queries to avoid overwriting our optimistic update
            await queryClient.cancelQueries({ queryKey: ["colony", serverId] });
            
            // Snapshot previous colony data for rollback
            const prevColony = queryClient.getQueryData<Colony>(["colony", serverId]);
            
            // Optimistically update settler status to prevent double assignment
            queryClient.setQueryData<Colony>(["colony", serverId], (oldColony) => {
                if (!oldColony) return oldColony;
                
                return {
                    ...oldColony,
                    settlers: oldColony.settlers.map(settler => 
                        settler._id === settlerId 
                            ? { ...settler, status: "questing" as const }
                            : settler
                    )
                };
            });
            
            return { prevColony };
        },
        onError: (_, __, context) => {
            // Rollback colony data if mutation failed
            if (context?.prevColony) {
                queryClient.setQueryData<Colony>(["colony", serverId], context.prevColony);
            }
        },
        onSuccess: async () => {
            // Invalidate all relevant queries to refetch fresh data
            await queryClient.invalidateQueries({
                queryKey: ["assignments", colonyId],
                exact: false
            });
            queryClient.invalidateQueries({
                queryKey: ["colony", serverId]
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

    // Inform assignment (with invalidation instead of optimistic updates)
    const informAssignment = useMutation<
        InformAssignmentResult, // return type from mutationFn
        Error,                  // error type
        string,                 // variables type (assignmentId)
        never                   // no context needed since we're not doing optimistic updates
    >({
        mutationFn: async (assignmentId: string) => {
            const response = await agent.patch(
                `/colonies/${colonyId}/assignments/${assignmentId}/informed`
            );
            return response.data;
        },
        onSuccess: async () => {
            // Invalidate all relevant queries to refetch fresh data
            await queryClient.invalidateQueries({
                queryKey: ["assignments", colonyId],
                exact: false
            });
            queryClient.invalidateQueries({
                queryKey: ["colony", serverId]
            });
            queryClient.invalidateQueries({
                queryKey: ["map", colonyId],
                exact: false
            });
            // Invalidate settler and inventory caches as requested
            queryClient.invalidateQueries({
                queryKey: ["settler"],
                exact: false
            });
            queryClient.invalidateQueries({
                queryKey: ["inventory"],
                exact: false
            });
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
