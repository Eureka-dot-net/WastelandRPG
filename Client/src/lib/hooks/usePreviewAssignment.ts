import { useQuery } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { AssignmentAdjustments } from "../types/assignment";

export interface PreviewAssignmentResult {
  settlerId: string;
  settlerName: string;
  baseDuration: number;
  basePlannedRewards: Record<string, number>;
  adjustments: AssignmentAdjustments;
}

export function usePreviewAssignment(
  colonyId: string,
  assignmentId: string,
  settlerId: string,
  enabled = true
) {
  return useQuery<PreviewAssignmentResult, Error>({
    queryKey: ["assignmentPreview", colonyId, assignmentId, settlerId],
    queryFn: async () => {
      const url = `/colonies/${colonyId}/assignments/${assignmentId}/preview?settlerId=${settlerId}`;
      const response = await agent.get(url);
      return response.data as PreviewAssignmentResult;
    },
    enabled: enabled && !!assignmentId && !!settlerId,
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });
}
