import { useMutation, useQueryClient } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { Colony } from "../types/colony";

interface UpdateEnergyRequest {
  settlerId: string;
  energy: number;
}

interface UpdateEnergyResponse {
  success: boolean;
  settler: {
    _id: string;
    name: string;
    energy: number;
  };
}

export function useDevTools(serverId: string | null) {
  const queryClient = useQueryClient();

  // --- MUTATION: UPDATE SETTLER ENERGY ---
  const updateSettlerEnergy = useMutation<
    UpdateEnergyResponse,
    Error,
    UpdateEnergyRequest,
    { prevColony: Colony | undefined }
  >({
    mutationFn: async ({ settlerId, energy }) => {
      const url = `/dev/settler/${settlerId}/energy`;
      const response = await agent.patch(url, { energy });
      return response.data;
    },
    onMutate: async ({ settlerId, energy }) => {
      // Cancel any outgoing colony queries to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["colony", serverId] });
      
      // Snapshot previous colony data for rollback
      const prevColony = queryClient.getQueryData<Colony>(["colony", serverId]);
      
      // Optimistically update settler energy
      queryClient.setQueryData<Colony>(["colony", serverId], (oldColony) => {
        if (!oldColony) return oldColony;
        
        return {
          ...oldColony,
          settlers: oldColony.settlers.map(settler => 
            settler._id === settlerId 
              ? { ...settler, energy }
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
    onSuccess: () => {
      // Invalidate colony data to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: ["colony", serverId]
      });
    },
  });

  return {
    updateSettlerEnergy,
  };
}