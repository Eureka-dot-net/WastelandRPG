import { useQuery } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { PreviewAssignmentResult } from "./usePreviewAssignment";


export function usePreviewMap(
  colonyId: string,
  x: string,
  y: string,
  settlerId: string,
  enabled = true
) {
  return useQuery<PreviewAssignmentResult, Error>({
    queryKey: ["assignmentPreview", colonyId, x, y, settlerId],
    queryFn: async () => {
      const url = `/colonies/${colonyId}/map/preview?settlerId=${settlerId}&x=${x}&y=${y}`;
      const response = await agent.get(url);
      return response.data as PreviewAssignmentResult;
    },
    enabled: enabled && !!x && !!y && !!settlerId,
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });
}
