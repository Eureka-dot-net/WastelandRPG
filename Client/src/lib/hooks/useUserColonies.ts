import { useQuery } from '@tanstack/react-query';
import { agent } from '../api/agent';
import type { Colony } from '../types/colony';
import type { Server } from './useServers';

interface ColonyWithServer extends Colony {
  server: Server;
}

interface ColoniesResponse {
  colonies: ColonyWithServer[];
}

export const useUserColonies = () => {
  return useQuery<ColoniesResponse>({
    queryKey: ['colonies'],
    queryFn: async () => {
      const response = await agent.get('/servers/colonies');
      return response.data;
    },
  });
};