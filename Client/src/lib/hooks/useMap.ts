import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { MapResponse } from "../types/mapResponse";
import type { Assignment } from "../types/assignment";

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
  const startExploration = useMutation<
    Assignment, // backend returns assignment object
    Error,
    { row: number; col: number; settlerId: string; previewDuration?: number },
    never // no context needed since we're not doing optimistic updates
  >({
    mutationFn: async ({ row, col, settlerId }) => {
      const url = `/colonies/${colonyId}/map/start?settlerId=${settlerId}&x=${col}&y=${row}`;
      const response = await agent.post(url, { row, col, settlerId });
      return response.data as Assignment;
    },
    onSuccess: () => {
      // Invalidate all relevant queries to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: ["map", colonyId],
        exact: false
      });
      queryClient.invalidateQueries({
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
