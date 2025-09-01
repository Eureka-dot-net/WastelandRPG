import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useUserColonies } from '../hooks/useUserColonies';
import type { Server } from '../hooks/useServers';
import type { Colony } from '../types/colony';

interface ColonyWithServer extends Colony {
  server: Server;
}

interface ServerContextType {
  currentServerId: string | null;
  currentColony: ColonyWithServer | null;
  userColonies: ColonyWithServer[];
  isLoading: boolean;
  error: Error | null;
  setCurrentServer: (serverId: string) => void;
  hasMultipleServers: boolean;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const useServerContext = () => {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error('useServerContext must be used within a ServerProvider');
  }
  return context;
};

interface ServerProviderProps {
  children: ReactNode;
}

export const ServerProvider = ({ children }: ServerProviderProps) => {
  const [currentServerId, setCurrentServerId] = useState<string | null>(() => {
    // Try to get from localStorage first
    return localStorage.getItem('currentServerId');
  });

  const { data: coloniesData, isLoading, error } = useUserColonies();
  const userColonies = coloniesData?.colonies || [];

  // Auto-select first server if none is selected and user has colonies
  useEffect(() => {
    if (!currentServerId && userColonies.length > 0) {
      const firstServerId = userColonies[0].serverId;
      setCurrentServerId(firstServerId);
      localStorage.setItem('currentServerId', firstServerId);
    }
  }, [currentServerId, userColonies]);

  const setCurrentServer = (serverId: string) => {
    setCurrentServerId(serverId);
    localStorage.setItem('currentServerId', serverId);
  };

  const currentColony = userColonies.find(colony => colony.serverId === currentServerId) || null;
  const hasMultipleServers = userColonies.length > 1;

  const contextValue: ServerContextType = {
    currentServerId,
    currentColony,
    userColonies,
    isLoading,
    error,
    setCurrentServer,
    hasMultipleServers,
  };

  return (
    <ServerContext.Provider value={contextValue}>
      {children}
    </ServerContext.Provider>
  );
};