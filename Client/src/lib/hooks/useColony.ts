import { useQuery } from "@tanstack/react-query";
import type { Colony } from "../types/colony";
import { agent } from "../api/agent";

export function useColony(serverId: string = "server-1") {

    const { data : colony, isLoading : colonyLoading, error: colonyError, refetch } = useQuery<Colony>({
        queryKey: ["colony", serverId],
        queryFn: async () => {
            const res = await agent.get(`/servers/${serverId}/colony`);
            return res.data as Colony;
        },

        staleTime: 3600000, // 1 hour
        gcTime: 3600000, // 1 hour
    });

    return { 
        colony, 
        colonyLoading, 
        colonyError ,
        refetch
    };
}