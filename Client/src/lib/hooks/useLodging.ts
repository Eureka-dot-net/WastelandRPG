import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { 
  LodgingResponse, 
  StartSleepRequest, 
  StartSleepResponse
} from "../types/lodgingResponse";
import type { Colony } from "../types/colony";

export function useLodging(
  serverId: string | null,
  colonyId?: string | null
) {
  const queryClient = useQueryClient();

  // --- FETCH LODGING DATA ---
  const {
    data: lodging,
    error: errorLodging,
    isLoading: loadingLodging,
    refetch,
  } = useQuery<LodgingResponse>({
    queryKey: ["lodging", colonyId],
    queryFn: async () => {
      const url = `/colonies/${colonyId}/lodging/beds`;
      const response = await agent.get(url);
      return response.data as LodgingResponse;
    },
    enabled: !!colonyId && !!serverId,
  });

  // --- MUTATION: START SLEEP ---
  const startSleep = useMutation<
    StartSleepResponse,
    Error,
    StartSleepRequest,
    { prevColony: Colony | undefined }
  >({
    mutationFn: async ({ settlerId, bedLevel }) => {
      const url = `/colonies/${colonyId}/lodging/start-sleep`;
      const response = await agent.post(url, { settlerId, bedLevel });
      return response.data;
    },
    onMutate: async ({ settlerId }) => {
      // Cancel any outgoing colony queries to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["colony", serverId] });
      
      // Snapshot previous colony data for rollback
      const prevColony = queryClient.getQueryData<Colony>(["colony", serverId]);
      
      // Optimistically update settler status to prevent double assignment
      queryClient.setQueryData<Colony>(["colony", serverId], (oldColony) => {
        if (!oldColony) return oldColony;
        
        return {
          ...oldColony,
          settlers: oldColony.settlers.map(settler => 
            settler._id === settlerId 
              ? { ...settler, status: "resting" as const }
              : settler
          )
        };
      });
      
      return { prevColony };
    },
    onError: (_, __, context) => {
      // Rollback colony data if mutation failed
      if (context?.prevColony) {
        queryClient.setQueryData<Colony>(["colony", serverId], context.prevColony);
      }
    },
    onSuccess: async () => {
      // Invalidate all relevant queries to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: ["lodging", colonyId],
        exact: false
      });
      await queryClient.invalidateQueries({
        queryKey: ["assignments", colonyId],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ["colony", serverId]
      });
    },
  });

  return {
    lodging,
    errorLodging,
    loadingLodging,
    startSleep,
    refetch,
  };
}