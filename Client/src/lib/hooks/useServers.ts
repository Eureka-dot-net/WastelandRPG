import { useQuery } from '@tanstack/react-query';
import { agent } from '../api/agent';

export interface Server {
  id: string;
  name: string;
  type: string;
  description: string;
  features: {
    pvp: boolean;
    notoriety: boolean;
    cooperation: boolean;
  };
}

interface ServersResponse {
  servers: Server[];
}

export const useServers = () => {
  return useQuery<ServersResponse>({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await agent.get('/servers');
      return response.data;
    },
  });
};