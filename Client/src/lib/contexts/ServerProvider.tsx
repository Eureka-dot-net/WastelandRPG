import { type ReactNode, useState, useEffect, useMemo } from "react";
import { useUserColonies } from "../hooks/useUserColonies";
import { ServerContext, type ServerContextType } from "./ServerContext";

interface ServerProviderProps {
  children: ReactNode;
}

export const ServerProvider = ({ children }: ServerProviderProps) => {
  const [currentServerId, setCurrentServerId] = useState<string | null>(() => {
    // Try to get from localStorage first
    return localStorage.getItem('currentServerId');
  });

  const { data: coloniesData } = useUserColonies();
  const userColonies = useMemo(() => coloniesData?.colonies || [], [coloniesData]);

  // Auto-select first server if none is selected and user has colonies
  // Also handle case where stored serverId doesn't match any current colonies
  useEffect(() => {
    if (userColonies.length > 0) {
      const hasValidCurrentServer = currentServerId && userColonies.some(colony => colony.serverId === currentServerId);
      
      if (!hasValidCurrentServer) {
        const firstServerId = userColonies[0].serverId;
        setCurrentServerId(firstServerId);
        localStorage.setItem('currentServerId', firstServerId);
      }
    } else if (currentServerId) {
      // User has no colonies but has a stored serverId - clear it
      setCurrentServerId(null);
      localStorage.removeItem('currentServerId');
    }
  }, [currentServerId, userColonies]);

  const setCurrentServer = (serverId: string) => {
    setCurrentServerId(serverId);
    localStorage.setItem('currentServerId', serverId);
  };

  // Derive colonyId from current server selection
  const colonyId = useMemo(() => {
    if (!currentServerId) return null;
    const currentColony = userColonies.find(colony => colony.serverId === currentServerId);
    return currentColony?._id || null;
  }, [currentServerId, userColonies]);

  const hasMultipleServers = userColonies.length > 1;

  const contextValue: ServerContextType = {
    currentServerId,
    colonyId,
    setCurrentServer,
    hasMultipleServers,
  };

  return (
    <ServerContext.Provider value={contextValue}>
      {children}
    </ServerContext.Provider>
  );
};