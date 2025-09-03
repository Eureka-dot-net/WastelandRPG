import { useQuery } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { MapGrid5x5Response } from "../types/MapTile";

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


  return {
    mapGrid,
    errorMap,
    loadingMap,
    refetchMap
  };
}
