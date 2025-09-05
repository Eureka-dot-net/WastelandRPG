// Enhanced batch preview hooks with smart caching

import { useQuery } from "@tanstack/react-query";
import type { PreviewAssignmentResult } from "./usePreviewAssignment";
import type { MapExplorationPreviewResult } from "./usePreviewMapExploration";
import { useSmartBatchCache } from "./useSmartBatchCache";

export interface BatchAssignmentPreviewResult {
  results: Record<string, Record<string, PreviewAssignmentResult>>;
}

export interface BatchMapExplorationPreviewResult {
  results: Record<string, Record<string, MapExplorationPreviewResult>>;
}

export interface Coordinate {
  x: number;
  y: number;
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
  const { getSmartBatchData } = useSmartBatchCache<PreviewAssignmentResult>(
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