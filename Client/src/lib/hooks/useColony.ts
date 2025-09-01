import { useQuery } from "@tanstack/react-query";
import type { Colony } from "../types/colony";
import { agent } from "../api/agent";

export function useColony(serverId?: string | null) {

    const { data : colony, isLoading : colonyLoading, error: colonyError, refetch } = useQuery<Colony>({
        queryKey: ["colony", serverId],
        queryFn: async () => {
            if (!serverId) throw new Error("No serverId provided");
            const res = await agent.get(`/servers/${serverId}/colony`);
            return res.data as Colony;
        },
        enabled: !!serverId, // Only run query if serverId is provided
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