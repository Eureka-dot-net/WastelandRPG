import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { MapResponse } from "../types/MapResponse";
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          completedAt: undefined,
          plannedRewards: {},
          adjustments: undefined
        };

        // Add assignment to the assignments array in the map response
        queryClient.setQueryData<MapResponse>(["map", colonyId, centerX, centerY], {
          ...prevMapData,
          assignments: [...(prevMapData.assignments || []), newAssignment],
        });
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
      // Replace the temporary assignment with the real one from the server
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
