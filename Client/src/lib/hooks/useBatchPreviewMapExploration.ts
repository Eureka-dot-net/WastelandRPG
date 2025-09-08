// Batch preview hooks for efficient multiple settler/coordinate combinations

import { useQuery } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { BatchMapExplorationPreviewResult, Coordinate } from "./useSmartBatchPreview";

/**
 * Hook to get preview data for multiple explorations and settlers in a single request
 */
export function useBatchPreviewMapExploration(
  colonyId: string,
  settlerIds: string[],
  coordinates: Coordinate[],
  enabled = true
) {
  return useQuery<BatchMapExplorationPreviewResult, Error>({
    queryKey: ["mapExplorationPreviewBatch", colonyId, settlerIds.sort(), coordinates],
    queryFn: async () => {
      if (settlerIds.length === 0 || coordinates.length === 0) {
        return { results: {} };
      }
      
      const settlerIdsParam = settlerIds.join(',');
      const coordinatesParam = coordinates.map(coord => `${coord.x}:${coord.y}`).join(',');
      const url = `/colonies/${colonyId}/map/preview-batch?settlerIds=${settlerIdsParam}&coordinates=${coordinatesParam}`;
      const response = await agent.get(url);
      return response.data as BatchMapExplorationPreviewResult;
    },
    enabled: enabled && !!colonyId && settlerIds.length > 0 && coordinates.length > 0,
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });
}