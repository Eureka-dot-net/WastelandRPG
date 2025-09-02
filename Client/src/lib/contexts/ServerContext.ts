import { createContext, useContext } from 'react';

export interface ServerContextType {
  currentServerId: string | null;
  colonyId: string | null;
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

