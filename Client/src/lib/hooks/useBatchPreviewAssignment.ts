// Batch preview hooks for efficient multiple settler/assignment combinations

import { useQuery } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { PreviewAssignmentResult } from "./usePreviewAssignment";

export interface BatchAssignmentPreviewResult {
  results: Record<string, Record<string, PreviewAssignmentResult>>;
}

/**
 * Hook to get preview data for multiple assignments and settlers in a single request
 */
export function useBatchPreviewAssignment(
  colonyId: string,
  settlerIds: string[],
  assignmentIds: string[],
  enabled = true
) {
  return useQuery<BatchAssignmentPreviewResult, Error>({
    queryKey: ["assignmentPreviewBatch", colonyId, settlerIds.sort(), assignmentIds.sort()],
    queryFn: async () => {
      if (settlerIds.length === 0 || assignmentIds.length === 0) {
        return { results: {} };
      }
      
      const settlerIdsParam = settlerIds.join(',');
      const assignmentIdsParam = assignmentIds.join(',');
      const url = `/colonies/${colonyId}/assignments/preview-batch?settlerIds=${settlerIdsParam}&assignmentIds=${assignmentIdsParam}`;
      const response = await agent.get(url);
      return response.data as BatchAssignmentPreviewResult;
    },
    enabled: enabled && !!colonyId && settlerIds.length > 0 && assignmentIds.length > 0,
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });
}