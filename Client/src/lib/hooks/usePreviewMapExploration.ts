import { useQuery } from "@tanstack/react-query";
import { agent } from "../api/agent";

export interface MapExplorationPreviewResult {
  coordinates: {
    x: number;
    y: number;
  };
  settler: {
    id: string;
    name: string;
    stats: Record<string, number>;
    skills: Record<string, number>;
    traits: string[];
  };
  preview: {
    terrain?: {
      type: string;
      name: string;
      description: string;
      icon: string;
    };
    loot?: Record<string, { amount: number; itemId: string; name: string; type: string; }>;
    adjustedLoot?: Record<string, { amount: number; itemId: string; name: string; type: string; }>;
    estimatedLoot?: Record<string, { amount: number; itemId: string; name: string; type: string; }>;
    adjustedEstimatedLoot?: Record<string, { amount: number; itemId: string; name: string; type: string; }>;
    threat?: { type: string; level: number } | null;
    event?: { type: string; description: string } | null;
    duration?: number;
    estimatedDuration?: number;
    adjustments: {
      speedEffects: string[];
      lootEffects: string[];
      traitEffects: string[];
    };
    alreadyExplored: boolean;
  };
}

export function usePreviewMapExploration(
  colonyId: string,
  x: number,
  y: number,
  settlerId: string,
  enabled = true
) {
  return useQuery<MapExplorationPreviewResult, Error>({
    queryKey: ["mapExplorationPreview", colonyId, x.toString(), y.toString(), settlerId],
    queryFn: async () => {
      const url = `/colonies/${colonyId}/map/preview?x=${x}&y=${y}&settlerId=${settlerId}`;
      const response = await agent.get(url);
      return response.data as MapExplorationPreviewResult;
    },
    enabled: enabled && !!colonyId && !!settlerId && !isNaN(x) && !isNaN(y),
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });
}