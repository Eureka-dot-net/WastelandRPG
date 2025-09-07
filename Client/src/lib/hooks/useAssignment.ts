import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { Assignment } from "../types/assignment";
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


    // --- MUTATIONS ---



    // Start assignment (with invalidation instead of optimistic updates)
    const startAssignment = useMutation<
        Assignment, // return type from mutationFn
        Error, // error type
        { assignmentId: string; settlerId: string }, // variables type
        never // no context needed since we're not doing optimistic updates
    >({
        mutationFn: async ({ assignmentId, settlerId }) => {
            const response = await agent.post(
                `/colonies/${colonyId}/assignments/${assignmentId}/start`,
                { settlerId }
            );
            return response.data as Assignment;
        },
        onSuccess: () => {
            // Invalidate all relevant queries to refetch fresh data
            queryClient.invalidateQueries({
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
        onSuccess: () => {
            // Invalidate all relevant queries to refetch fresh data
            queryClient.invalidateQueries({
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
