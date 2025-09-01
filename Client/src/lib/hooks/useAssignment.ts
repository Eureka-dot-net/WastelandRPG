import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { Assignment, AssignmentAdjustments } from "../types/assignment";
import type { Colony } from "../types/colony";
import type { Settler } from "../types/settler";

export function useAssignment(serverId: string, colonyId?: string) {
    const queryClient = useQueryClient();
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

    // Mutation to preview assignment adjustments with a settler
    const previewAssignment = useMutation({
        mutationFn: async ({ assignmentId, settlerId }: { assignmentId: string; settlerId: string }) => {
            const response = await agent.post(
                `/colonies/${colonyId}/assignments/${assignmentId}/preview`,
                { settlerId }
            );
            return response.data as {
                settlerId: string;
                settlerName: string;
                baseDuration: number;
                basePlannedRewards: Record<string, number>;
                adjustments: AssignmentAdjustments;
            };
        },
    });

    type InformAssignmentResult = {
        _id: string;
        state: string;
        foundSettler?: Settler; // SettlerType is whatever structure you expect
        // ...other fields
    };

    const informAssignment = useMutation<InformAssignmentResult, Error, string>({
        mutationFn: async (assignmentId: string) => {
            // Call PATCH endpoint
            const response = await agent.patch(`/colonies/${colonyId}/assignments/${assignmentId}/informed`);
            return response.data; // returns updated assignment or just state
        },
        onSuccess: (data) => {
            // Update cache for just this assignment
            if (data.state === "informed") {
                queryClient.setQueryData<Assignment[]>(["assignments", colonyId], (old) =>
                    old?.map(a => a._id === data._id ? { ...a, state: "informed" } : a) ?? [] //this isn't working
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
        }
    });

    return {
        assignments,
        errorAssignment,
        loadingAssignment,
        startAssignment,
        previewAssignment,
        informAssignment,
        refetch
    };
}