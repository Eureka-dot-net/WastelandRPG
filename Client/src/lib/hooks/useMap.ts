import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { MapResponse } from "../types/mapResponse";
import type { Colony } from "../types/colony";
import { useEffect } from "react";

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

  // --- PREFETCH ADJACENT TILES ---
  useEffect(() => {
    if (!colonyId || !serverId) return;

    const adjacentCoords = [
      [centerX - 1, centerY],
      [centerX + 1, centerY],
      [centerX, centerY - 1],
      [centerX, centerY + 1],
    ];

    adjacentCoords.forEach(([x, y]) => {
      queryClient.prefetchQuery({
        queryKey: ["map", colonyId, x, y],
        queryFn: async () => {
          const url = `/colonies/${colonyId}/map?x=${x}&y=${y}`;
          const response = await agent.get(url);
          return response.data as MapResponse;
        },
        staleTime: 60_000, // Cache for 1 minute
      });
    });
  }, [colonyId, serverId, centerX, centerY, queryClient]);

  // --- MUTATION: START EXPLORATION ---
  const startExploration = useMutation<
    { success: true; assignmentId: string; location: { x: number; y: number }; settlerId: string }, // backend returns minimal response
    Error,
    { row: number; col: number; settlerId: string; previewDuration?: number },
    { prevColony: Colony | undefined } // context for rollback
  >({
    mutationFn: async ({ row, col, settlerId }) => {
      const url = `/colonies/${colonyId}/map/start?settlerId=${settlerId}&x=${col}&y=${row}`;
      const response = await agent.post(url, { row, col, settlerId });
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
              ? { ...settler, status: "exploring" as const }
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
      queryClient.invalidateQueries({
        queryKey: ["map", colonyId],
        exact: false
      });
      await queryClient.invalidateQueries({
        queryKey: ["assignments", colonyId],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ["colony", serverId]
      });
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
