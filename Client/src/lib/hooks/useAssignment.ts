import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { Assignment } from "../types/assignment";

export function useAssignment(colonyId?: string) {
    const queryClient = useQueryClient();

    // Fetch assignments
    const { data, error: errorAssignment, isLoading: loadingAssignment, refetch } = useQuery<Assignment[]>({
        queryKey: ["assignments", colonyId],
        queryFn: async () => {
            const response = await agent.get(`/colonies/${colonyId}/assignments`);
            return response.data.assignments as Assignment[];
        },
       enabled: !!colonyId,
    });

    // Mutation to start an assignment with a settler
    const startAssignment = useMutation({
        mutationFn: async ({ assignmentId, settlerId }: { assignmentId: string; settlerId: string }) => {
            const response = await agent.post(
                `/colonies/${colonyId}/assignments/${assignmentId}/start`,
                { settlerId }
            );
            return response.data as Assignment;
        },
        onSuccess: (updatedAssignment) => {
            // Update cached assignments so UI reflects the new state immediately
            queryClient.setQueryData<Assignment[]>(["assignments", colonyId], (old) =>
                old?.map((a) => (a._id === updatedAssignment._id ? updatedAssignment : a)) ?? []
            );
        },
    });

    return {
        data,
        errorAssignment,
        loadingAssignment,
        startAssignment,
        refetch
    };
}