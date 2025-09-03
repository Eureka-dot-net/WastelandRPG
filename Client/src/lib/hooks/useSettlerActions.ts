import { useMutation, useQueryClient } from '@tanstack/react-query';
import { agent } from '../api/agent';
import type { Settler } from '../types/settler';

interface AcceptSettlerParams {
  serverId: string;
  colonyId: string;
  settlerId: string;
}

interface RejectSettlerParams {
  serverId: string;
  colonyId: string;
  settlerId: string;
}

export const useAcceptSettler = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serverId, colonyId, settlerId }: AcceptSettlerParams): Promise<Settler> => {
      return agent.post(`/api/${serverId}/colony/${colonyId}/settler/${settlerId}/select`, {});
    },
    onSuccess: (_, { colonyId, serverId }) => {
      // Invalidate colony and settler queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['colony', serverId] });
      queryClient.invalidateQueries({ queryKey: ['settlers', colonyId] });
    },
  });
};

export const useRejectSettler = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ serverId, colonyId, settlerId }: RejectSettlerParams): Promise<{ success: boolean }> => {
      return agent.delete(`/api/${serverId}/colony/${colonyId}/settler/${settlerId}/reject`);
    },
    onSuccess: (_, { colonyId, serverId }) => {
      // Invalidate colony and settler queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['colony', serverId] });
      queryClient.invalidateQueries({ queryKey: ['settlers', colonyId] });
    },
  });
};