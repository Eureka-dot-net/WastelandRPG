import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { MapResponse } from "../types/mapResponse";
import type { Assignment } from "../types/assignment";
import type { Colony } from "../types/colony";

export function useMap(
  serverId: string | null,
  colonyId?: string | null,
  centerX = 0,
  centerY = 0
) {
  const queryClient = useQueryClient();

  // --- FETCH 5x5 MAP GRID ---
  const {
    data: map,
    error: errorMap,
    isLoading: loadingMap,
    refetch,
  } = useQuery<MapResponse>({
    queryKey: ["map", colonyId, centerX, centerY],
    queryFn: async () => {
      const url = `/colonies/${colonyId}/map?x=${centerX}&y=${centerY}`;
      const response = await agent.get(url);
      return response.data as MapResponse;
    },
    enabled: !!colonyId && !!serverId,
  });

  // --- MUTATION: START EXPLORATION ---
  type StartExplorationContext = {
    prevMapData: MapResponse | undefined;
    settlerId: string;
  };

  const startExploration = useMutation<
    Assignment, // backend returns assignment object
    Error,
    { row: number; col: number; settlerId: string },
    StartExplorationContext
  >({
    mutationFn: async ({ row, col, settlerId }) => {
      const url = `/colonies/${colonyId}/map/start?settlerId=${settlerId}&x=${col}&y=${row}`;
      const response = await agent.post(url, { row, col, settlerId });
      return response.data as Assignment;
    },
    onMutate: async ({ row, col, settlerId }) => {
      await queryClient.cancelQueries({ queryKey: ["map", colonyId, centerX, centerY] });
      const prevMapData = queryClient.getQueryData<MapResponse>(["map", colonyId, centerX, centerY]);

      // Add the new assignment optimistically to the map grid
      if (prevMapData) {
        // Estimate duration (5 minutes as default, matches server base duration)
        const estimatedDuration = 300000; // 5 minutes in milliseconds
        const now = new Date();
        const completionTime = new Date(now.getTime() + estimatedDuration);

        const newAssignment: Assignment = {
          _id: `temp-${Date.now()}`, // temporary ID
          colonyId: colonyId!,
          taskId: 'exploration',
          type: 'exploration',
          state: 'in-progress',
          name: 'Exploration',
          settlerId,
          description: 'Exploring new territory',
          duration: 0,
          unlocks: '',
          location: { x: col, y: row },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          startedAt: now.toISOString(),
          completedAt: completionTime.toISOString(),
          plannedRewards: {},
          adjustments: {
            adjustedDuration: estimatedDuration,
            effectiveSpeed: 1.0,
            lootMultiplier: 1.0,
            adjustedPlannedRewards: {},
            effects: {
              speedEffects: [],
              lootEffects: [],
              traitEffects: []
            }
          }
        };

        // Add assignment to the assignments array in the map response
        queryClient.setQueryData<MapResponse>(["map", colonyId, centerX, centerY], {
          ...prevMapData,
          assignments: [...(prevMapData.assignments || []), newAssignment],
        });

        // Also add the assignment to the general assignments query so timer system can see it
        queryClient.setQueryData<Assignment[]>(["assignments", colonyId], (old) =>
          old ? [...old, newAssignment] : [newAssignment]
        );
      }

      // Mark the settler as busy in colony data
      queryClient.setQueryData<Colony>(["colony", serverId], (old) =>
        old
          ? {
              ...old,
              settlers: old.settlers.map((s) =>
                s._id === settlerId ? { ...s, status: "busy" } : s
              ),
            }
          : old
      );

      return { prevMapData, settlerId };
    },
    onError: (_, __, context) => {
      // rollback if mutation fails
      if (context?.prevMapData) {
        queryClient.setQueryData(["map", colonyId, centerX, centerY], context.prevMapData);
      }
      
      // Rollback assignment from general assignments query
      queryClient.setQueryData<Assignment[]>(["assignments", colonyId], (old) =>
        old ? old.filter(a => !a._id.startsWith('temp-')) : old
      );
      
      // Rollback settler status
      queryClient.setQueryData<Colony>(["colony", serverId], (old) =>
        old
          ? {
              ...old,
              settlers: old.settlers.map((s) =>
                s._id === context?.settlerId ? { ...s, status: "idle" } : s
              ),
            }
          : old
      );
    },
    onSuccess: (updatedAssignment) => {
      // Replace the temporary assignment with the real one from the server in map data
      queryClient.setQueryData<MapResponse>(["map", colonyId, centerX, centerY], (old) => {
        if (!old) return old;
        
        return {
          ...old,
          assignments: old.assignments?.map(a => 
            a._id.startsWith('temp-') && 
            a.settlerId === updatedAssignment.settlerId &&
            a.location?.x === updatedAssignment.location?.x &&
            a.location?.y === updatedAssignment.location?.y
              ? updatedAssignment 
              : a
          ) || [updatedAssignment]
        };
      });
      
      // Replace the temporary assignment in the general assignments query
      queryClient.setQueryData<Assignment[]>(["assignments", colonyId], (old) => {
        if (!old) return [updatedAssignment];
        
        return old.map(a => 
          a._id.startsWith('temp-') && 
          a.settlerId === updatedAssignment.settlerId &&
          a.location?.x === updatedAssignment.location?.x &&
          a.location?.y === updatedAssignment.location?.y
            ? updatedAssignment 
            : a
        );
      });
      
      // Invalidate assignments query to keep it in sync
      queryClient.invalidateQueries({queryKey: ["assignments", colonyId]});
    },
  });

  return {
    map,
    errorMap,
    loadingMap,
    startExploration,
    refetch,
  };
}
