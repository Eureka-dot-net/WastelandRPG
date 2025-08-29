import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { Assignment } from "../types/assignment";
import { useEffect } from "react";
import { showTaskCompletionToast } from "../../app/shared/components/toast/toastHelpers";

export function useAssignment(serverId: string, colonyId?: string) {
    const queryClient = useQueryClient();
    console.log(serverId);
    // Fetch assignments
    const { data: assignments, error: errorAssignment, isLoading: loadingAssignment, refetch } = useQuery<Assignment[]>({
        queryKey: ["assignments", colonyId],
        queryFn: async () => {
            console.log("Fetching assignments for colony:", colonyId);
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

    const informAssignment = useMutation({
        mutationFn: async (assignmentId: string) => {
            // Call PATCH endpoint
            const response = await agent.patch(`/colonies/${colonyId}/assignments/${assignmentId}/informed`);
            return response.data; // returns updated assignment or just state
        },
        onSuccess: (data) => {
            // Update cache for just this assignment
            console.log("new state: " + data.state);
            console.log("new id: " + data._id);
            queryClient.setQueryData<Assignment[]>(["assignments", colonyId], (old) =>
                old?.map(a => a._id === data._id ? { ...a, state: data.state } : a) ?? [] //this isn't working
            );
             console.log("Assignments after cache update:", queryClient.getQueryData(["assignments", colonyId]));
        }
    });

    useEffect(() => {
        if (!assignments) return;

        const newlyCompleted = assignments.filter(
            a => a.state === "completed");
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

                informAssignment.mutateAsync(assignment._id)
                .then((data) => {
                   if (data.state === "informed") {
                       showTaskCompletionToast(
                           { name: assignment.name, purpose: assignment.description },
                           { name: settler.name },
                           rewards
                       );
                   }
               })
               .catch((error) => {
                   console.error("Inform assignment error:", error);
               });

           }
       }

   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [assignments]);

   return {
        assignments,
        errorAssignment,
        loadingAssignment,
        startAssignment,
        informAssignment,
        refetch
    };
}