import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { Assignment } from "../types/assignment";
import { useRef, useEffect } from "react";
import { showTaskCompletionToast } from "../../app/shared/components/toast/toastHelpers";

export function useAssignment(serverId: string, colonyId?: string) {
    const queryClient = useQueryClient();
    const prevAssignmentsRef = useRef<Assignment[]>([]);

    // Fetch assignments
    const { data: assignments, error: errorAssignment, isLoading: loadingAssignment, refetch } = useQuery<Assignment[]>({
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

    useEffect(() => {
        if (!assignments) return;

        const prevAssignments = prevAssignmentsRef.current;
        const newlyCompleted = assignments.filter(
            a => a.state === "completed" && !prevAssignments.some(pa => pa._id === a._id && pa.state === "completed")
        );
        console.log('starting assignment completion')

        for (const assignment of newlyCompleted) {
            const colony = queryClient.getQueryData<{ settlers: { _id: string; name: string }[] }>(["colony", serverId]);
            const settler = colony?.settlers?.find(s => s._id === assignment.settlerId) || null;
            console.log('assignment' + assignment.name);
            console.log('settler:' + (settler ? settler.name : 'unknown')); //this is returning unknown
            console.log('settlerId: ' + assignment.settlerId);
            console.log('dependson: ' + (assignment.dependsOn || 'none'));
            console.log('dependson: ' + (assignment.dependsOn || 'none'));
            console.log('completion message: ' + (assignment.completionMessage || 'none'));
            if (assignment.plannedRewards && settler) {
                const rewards: Record<string, number> = {};
                Object.entries(assignment.plannedRewards).forEach(([key, reward]) => {
                    rewards[key] = reward.amount;
                });

                showTaskCompletionToast(
                    { name: assignment.name, purpose: assignment.description },
                    { name: settler.name },
                    rewards
                );
            }
        }

        prevAssignmentsRef.current = assignments;
    }, [assignments]);

    return {
        assignments,
        errorAssignment,
        loadingAssignment,
        startAssignment,
        refetch
    };
}