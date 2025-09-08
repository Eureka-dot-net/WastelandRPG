// Enhanced batch preview hooks with smart caching

import { useQuery } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { AssignmentPreviewResult, MapExplorationPreviewResult } from "../types/preview";
import { useSmartBatchCache } from "./useSmartBatchCache";

export interface BatchAssignmentPreviewResult {
  results: Record<string, Record<string, AssignmentPreviewResult>>;
}

export interface BatchMapExplorationPreviewResult {
  results: Record<string, Record<string, MapExplorationPreviewResult>>;
}

export interface Coordinate {
  x: number;
  y: number;
}

// Re-export the individual result types for backward compatibility
export type { AssignmentPreviewResult as PreviewAssignmentResult, MapExplorationPreviewResult };

/**
 * Individual assignment preview hook - calls API directly
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
    enabled: enabled && !!assignmentId && !!settlerId,
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });
}

/**
 * Individual map exploration preview hook - calls API directly
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
 * Enhanced batch assignment preview hook with smart caching
 */
export function useSmartBatchPreviewAssignment(
  colonyId: string,
  settlerIds: string[],
  assignmentIds: string[],
  enabled = true
) {
  const { getSmartBatchData } = useSmartBatchCache<AssignmentPreviewResult>(
    (colonyId) => `/colonies/${colonyId}/assignments/preview-batch`,
    (settlerId, assignmentId) => `${settlerId}:${assignmentId}`
  );

  return useQuery<BatchAssignmentPreviewResult, Error>({
    queryKey: ["smartAssignmentPreviewBatch", colonyId, settlerIds.sort(), assignmentIds.sort()],
    queryFn: () => getSmartBatchData(
      colonyId,
      settlerIds,
      assignmentIds,
      'settlerIds',
      'assignmentIds'
    ),
    enabled: enabled && !!colonyId && settlerIds.length > 0 && assignmentIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Enhanced batch map exploration preview hook with smart caching
 */
export function useSmartBatchPreviewMapExploration(
  colonyId: string,
  settlerIds: string[],
  coordinates: Coordinate[],
  enabled = true
) {
  const { getSmartBatchData } = useSmartBatchCache<MapExplorationPreviewResult>(
    (colonyId) => `/colonies/${colonyId}/map/preview-batch`,
    (settlerId, coordStr) => `${settlerId}:${coordStr}`
  );

  return useQuery<BatchMapExplorationPreviewResult, Error>({
    queryKey: ["smartMapExplorationPreviewBatch", colonyId, settlerIds.sort(), coordinates],
    queryFn: () => {
      const coordStrings = coordinates.map(coord => `${coord.x}:${coord.y}`);
      return getSmartBatchData(
        colonyId,
        settlerIds,
        coordStrings,
        'settlerIds',
        'coordinates'
      );
    },
    enabled: enabled && !!colonyId && settlerIds.length > 0 && coordinates.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}