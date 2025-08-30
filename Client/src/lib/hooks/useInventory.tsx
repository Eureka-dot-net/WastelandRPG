import { useQuery } from "@tanstack/react-query";
import type { Inventory } from "../types/inventory";
import { agent } from "../api/agent";

export function useInventory(colonyId: string) {
    const { data : inventory, isLoading : loadingInventory, error : errorInventory } = useQuery<Inventory>({
        queryKey: ['inventory', colonyId],
        queryFn:  async () => {
            const res = await agent.get(`/colonies/${colonyId}/inventory`);
            return res.data;
        }
    });

    return {
        inventory,
        loadingInventory,
        errorInventory
    };
}