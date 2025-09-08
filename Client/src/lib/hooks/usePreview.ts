// Simple preview hooks without complex caching

import { useQuery } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { AssignmentPreviewResult, MapExplorationPreviewResult } from "../types/preview";

export interface Coordinate {
  x: number;
  y: number;
}

/**
 * Individual assignment preview hook
 */
export function usePreviewAssignment(
  colonyId: string,
  assignmentId: string,
  settlerId: string,
  enabled = true
) {
  return useQuery<AssignmentPreviewResult, Error>({
    queryKey: ["assignmentPreview", colonyId, assignmentId, settlerId],
    queryFn: async () => {
      const url = `/colonies/${colonyId}/assignments/${assignmentId}/preview?settlerId=${settlerId}`;
      const response = await agent.get(url);
      return response.data as AssignmentPreviewResult;
    },
    enabled: enabled && !!assignmentId && !!settlerId && !!colonyId,
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });
}

/**
 * Individual map exploration preview hook
 */
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