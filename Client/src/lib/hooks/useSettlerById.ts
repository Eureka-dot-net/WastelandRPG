import { useQuery } from '@tanstack/react-query';
import { agent } from '../api/agent';
import type { Settler } from '../types/settler';

export const useSettlerById = (serverId: string | null, colonyId: string | undefined, settlerId: string | undefined) => {
  return useQuery({
    queryKey: ['settler', colonyId, settlerId],
    queryFn: async (): Promise<Settler> => {
      if (!serverId || !colonyId || !settlerId) {
        throw new Error('Missing required parameters');
      }
      const res = await agent.get(`/colonies/${colonyId}/settlers/${settlerId}`);
      return res.data;
    },
    enabled: !!serverId && !!colonyId && !!settlerId,
    staleTime: 30000, // 30 seconds
  });
};