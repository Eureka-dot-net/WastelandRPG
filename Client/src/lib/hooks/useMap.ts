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
    previewDuration?: number;
  };

  const startExploration = useMutation<
    Assignment, // backend returns assignment object
    Error,
    { row: number; col: number; settlerId: string; previewDuration?: number },
    StartExplorationContext
  >({
    mutationFn: async ({ row, col, settlerId }) => {
      const url = `/colonies/${colonyId}/map/start?settlerId=${settlerId}&x=${col}&y=${row}`;
      const response = await agent.post(url, { row, col, settlerId });
      return response.data as Assignment;
    },
    onMutate: async ({ row, col, settlerId, previewDuration }) => {
      await queryClient.cancelQueries({ queryKey: ["map", colonyId, centerX, centerY] });
      const prevMapData = queryClient.getQueryData<MapResponse>(["map", colonyId, centerX, centerY]);

      // Add the new assignment optimistically to the map grid
      if (prevMapData) {
        // Use preview duration if available, otherwise fall back to 5 minutes default
        const estimatedDuration = previewDuration || 300000; // 5 minutes in milliseconds
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
          location: { x: col, y: row }, // These are world coordinates (row=y, col=x)
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

        // Clone the map data to avoid mutations
        const updatedMapData = { 
          ...prevMapData,
          assignments: [...(prevMapData.assignments || []), newAssignment],
          grid: {
            ...prevMapData.grid,
            tiles: prevMapData.grid.tiles.map((tileRow, rowIndex) => 
              tileRow.map((tile, colIndex) => {
                // Calculate world coordinates for this grid position
                const tileWorldX = centerX - 2 + colIndex;
                const tileWorldY = centerY + 2 - rowIndex;
                
                // Check if this is the tile where the assignment should be added
                if (tileWorldX === col && tileWorldY === row) {
                  return {
                    ...tile,
                    assignments: [...(tile.assignments || []), newAssignment]
                  };
                }
                return tile;
              })
            )
          }
        };

        // Add assignment to both the assignments array and the specific grid tile
        queryClient.setQueryData<MapResponse>(["map", colonyId, centerX, centerY], updatedMapData);

        // Also add the assignment to the general assignments query so timer system can see it
        queryClient.setQueryData<Assignment[]>(["assignments", colonyId], (old) =>
          old ? [...old, newAssignment] : [newAssignment]
        );
      }

      // Mark the settler as exploring in colony data
      queryClient.setQueryData<Colony>(["colony", serverId], (old) =>
        old
          ? {
              ...old,
              settlers: old.settlers.map((s) =>
                s._id === settlerId ? { ...s, status: "exploring" } : s
              ),
            }
          : old
      );

      return { prevMapData, settlerId, previewDuration };
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


        // Also update the specific grid tile's assignments
        const updatedGrid = {
          ...old.grid,
          tiles: old.grid.tiles.map((tileRow, rowIndex) => 
            tileRow.map((tile, colIndex) => {
              // Calculate world coordinates for this grid position
              const tileWorldX = centerX - 2 + colIndex;
              const tileWorldY = centerY + 2 - rowIndex;
              
              // Check if this tile matches the assignment location
              if (updatedAssignment.location && 
                  tileWorldX === updatedAssignment.location.x && 
                  tileWorldY === updatedAssignment.location.y) {
                return {
                  ...tile,
                  assignments: (tile.assignments || []).map(a =>
                    a._id.startsWith('temp-') && 
                    a.settlerId === updatedAssignment.settlerId &&
                    a.location?.x === updatedAssignment.location?.x &&
                    a.location?.y === updatedAssignment.location?.y
                      ? updatedAssignment
                      : a
                  )
                };
              }
              return tile;
            })
          )
        };

        return {
          ...old,
          grid: updatedGrid
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
