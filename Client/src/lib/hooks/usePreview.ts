// Simplified batch-only preview hooks

import { useQuery } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { AssignmentPreviewResult, MapExplorationPreviewResult } from "../types/preview";

export interface Coordinate {
  x: number;
  y: number;
}

/**
 * Batch assignment preview hook for multiple settlers and assignments
 */
export function useBatchPreviewAssignment(
  colonyId: string,
  settlerIds: string[],
  assignmentIds: string[],
  enabled = true
) {
  return useQuery<{ results: Record<string, Record<string, AssignmentPreviewResult>> }, Error>({
    queryKey: ["assignmentPreviewBatch", colonyId, settlerIds.sort(), assignmentIds.sort()],
    queryFn: async () => {
      if (settlerIds.length === 0 || assignmentIds.length === 0) {
        return { results: {} };
      }
      
      const settlerIdsParam = settlerIds.join(',');
      const assignmentIdsParam = assignmentIds.join(',');
      const url = `/colonies/${colonyId}/assignments/preview-batch?settlerIds=${settlerIdsParam}&assignmentIds=${assignmentIdsParam}`;
      const response = await agent.get(url);
      return response.data;
    },
    enabled: enabled && !!colonyId && settlerIds.length > 0 && assignmentIds.length > 0,
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });
}

/**
 * Batch map exploration preview hook for multiple settlers and coordinates
 */
export function useBatchPreviewMapExploration(
  colonyId: string,
  settlerIds: string[],
  coordinates: Coordinate[],
  enabled = true
) {
  return useQuery<{ results: Record<string, Record<string, MapExplorationPreviewResult>> }, Error>({
    queryKey: ["mapExplorationPreviewBatch", colonyId, settlerIds.sort(), coordinates],
    queryFn: async () => {
      if (settlerIds.length === 0 || coordinates.length === 0) {
        return { results: {} };
      }
      
      const settlerIdsParam = settlerIds.join(',');
      const coordinatesParam = coordinates.map(coord => `${coord.x}:${coord.y}`).join(',');
      const url = `/colonies/${colonyId}/map/preview-batch?settlerIds=${settlerIdsParam}&coordinates=${coordinatesParam}`;
      const response = await agent.get(url);
      return response.data;
    },
    enabled: enabled && !!colonyId && settlerIds.length > 0 && coordinates.length > 0,
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });
}