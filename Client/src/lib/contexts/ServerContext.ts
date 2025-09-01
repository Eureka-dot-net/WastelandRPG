import { createContext, useContext } from 'react';
import type { Server } from '../hooks/useServers';
import type { Colony } from '../types/colony';

interface ColonyWithServer extends Colony {
  server: Server;
}

export interface ServerContextType {
  currentServerId: string | null;
  currentColony: ColonyWithServer | null;
  userColonies: ColonyWithServer[];
  isLoading: boolean;
  error: Error | null;
  setCurrentServer: (serverId: string) => void;
  hasMultipleServers: boolean;
}

export const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const useServerContext = () => {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error('useServerContext must be used within a ServerProvider');
  }
  return context;
};

