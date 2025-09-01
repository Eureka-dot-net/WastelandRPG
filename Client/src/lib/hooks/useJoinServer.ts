import { useMutation, useQueryClient } from '@tanstack/react-query';
import { agent } from '../api/agent';

interface JoinServerData {
  serverId: string;
  colonyName?: string;
}

interface JoinServerResponse {
  message: string;
  colony: any; // Could type this more specifically later
}

export const useJoinServer = () => {
  const queryClient = useQueryClient();

  return useMutation<JoinServerResponse, Error, JoinServerData>({
    mutationFn: async (data: JoinServerData) => {
      const response = await agent.post(`/servers/${data.serverId}/join`, {
        colonyName: data.colonyName
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate colonies query to refetch user's colonies
      queryClient.invalidateQueries({ queryKey: ['colonies'] });
    },
  });
};