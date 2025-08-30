import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { Assignment } from "../types/assignment";
import { useEffect } from "react";
import { showTaskCompletionToast } from "../../app/shared/components/toast/toastHelpers";
import type { Colony } from "../types/colony";

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
            queryClient.setQueryData<Colony>(["colony", serverId], (old) => {
                if (!old) return;

                // Update the colony's state or any other relevant data
                return {
                    ...old,
                    // Example: update the colony's active assignment count
                    settlers: old.settlers.map(
                        s => s._id === updatedAssignment.settlerId ?
                            { ...s, status: 'busy' } : s)
                };
            });
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

            queryClient.setQueryData<Assignment[]>(["assignments", colonyId], (old) =>
                old?.map(a => a._id === data._id ? { ...a, state: data.state } : a) ?? [] //this isn't working
            );
            queryClient.setQueryData<Colony>(["colony", serverId], (old) => {
                if (!old) return old;
                //update unlocks

                // Get assignments from cache
                const assignments = queryClient.getQueryData<Assignment[]>(["assignments", colonyId]);
                // Find the assignment you just updated
                const updatedAssignment = assignments?.find(a => a._id === data._id);

                const unlockKey = updatedAssignment?.unlocks; // e.g., "inventory"
                if (unlockKey) {
                    old.unlocks = { ...old.unlocks, [unlockKey]: true };
                }

                // If no settlerId, nothing to do
                if (!updatedAssignment?.settlerId) return old;

                return {
                    ...old,
                    unlocks: unlockKey ? { ...old.unlocks, [unlockKey]: true } : old.unlocks,
                    settlers: updatedAssignment?.settlerId
                        ? old.settlers.map(s =>
                            s._id === updatedAssignment.settlerId ? { ...s, status: "idle" } : s
                        )
                        : old.settlers
                };
            });
        }
    });

    function updateColonyResource(
        old: Colony | undefined,
        key: string,
        type: string,
        amount: number,
        properties: Record<string, unknown> = {}
    ): Colony | undefined {
        if (!old) return old;

        if (type === "food") {
            // Calculate daysFood based on settlers
            const settlerCount = Array.isArray(old.settlers) ? old.settlers.length : (old.settlers || 1);
            const currentFood = (old.daysFood || 0) * (settlerCount || 1);
            const addedFood = amount * (properties["foodValue"] as number || 0);
            const newFood = currentFood + addedFood;
            return { ...old, daysFood: Math.round((newFood / (settlerCount || 1)) * 10) / 10 };
        }

        if (key === "scrap") {
            return { ...old, scrapMetal: (old.scrapMetal || 0) + amount };
        }

        if (key === "wood") {
            return { ...old, wood: (old.wood || 0) + amount };
        }
    }

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
                    queryClient.setQueryData(["colony", serverId], (old: Colony | undefined) =>
                        updateColonyResource(old, key, reward.type, reward.amount, reward.properties)
                    );
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