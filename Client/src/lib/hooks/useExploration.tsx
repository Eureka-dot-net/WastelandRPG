import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { MapGrid5x5Response, MapTile } from "../types/MapTile";
import type { Exploration } from "../types/exploration";

export interface ExplorationAdjustments {
  adjustedDuration: number;
  effectiveSpeed: number;
  lootMultiplier: number;
  adjustedPlannedRewards: Record<string, number>;
  effects: {
    speedEffects: string[];
    lootEffects: string[];
    traitEffects: string[];
  };
}


export function useExploration(serverId: string | null, colonyId?: string | null) {
    console.log(serverId);
  const queryClient = useQueryClient();

  // Fetch 5x5 map grid
  const { data: mapGrid, error: errorMap, isLoading: loadingMap, refetch: refetchMap } = useQuery<MapGrid5x5Response>({
    queryKey: ["mapGrid5x5", colonyId],
    queryFn: async () => {
      if (!colonyId) throw new Error("Colony ID is required");
      const response = await agent.get(`/colonies/${colonyId}/map/0/0`); // default center (0,0) first load
      return response.data as MapGrid5x5Response;
    },
    enabled: !!colonyId,
  });

  // Start an exploration
  const startExploration = useMutation({
    mutationFn: async ({ x, y, settlerId }: { x: number; y: number; settlerId: string }) => {
      const response = await agent.post(`/colonies/${colonyId}/map/${x}/${y}/start`, { settlerId });
      return response.data as { exploration: Exploration };
    },
    onSuccess: () => {
      // Optional: update 5x5 map cache if you want immediate visual feedback
      if (colonyId) {
        queryClient.invalidateQueries({ queryKey: ["mapGrid5x5", colonyId] });
      }
    },
  });

  // Preview an exploration
  const previewExploration = useMutation<
    { terrain: MapTile["terrain"]; adjustedLoot: Record<string, number>; adjustedDuration: number },
    Error,
    { x: number; y: number; settlerId: string }
  >({
    mutationFn: async ({ x, y, settlerId }) => {
      const response = await agent.post(`/colonies/${colonyId}/map/${x}/${y}/preview`, { settlerId });
      return response.data.preview;
    },
  });

  // Inform about a completed exploration
  const informExploration = useMutation({
    mutationFn: async ({ x, y }: { x: number; y: number }) => {
      const response = await agent.post(`/colonies/${colonyId}/map/${x}/${y}/inform`);
      return response.data as Exploration;
    },
    onSuccess: () => {
      // Optional: update the cache for map grid or colony state if needed
      if (colonyId) {
        queryClient.invalidateQueries({ queryKey: ["mapGrid5x5", colonyId] });
      }
    },
  });

  return {
    mapGrid,
    errorMap,
    loadingMap,
    refetchMap,
    startExploration,
    previewExploration,
    informExploration,
  };
}
