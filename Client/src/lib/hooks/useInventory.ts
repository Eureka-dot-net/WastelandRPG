import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Inventory } from "../types/inventory";
import { agent } from "../api/agent";

export function useInventory(colonyId: string) {
    const queryClient = useQueryClient();
    
    const { data : inventory, isLoading : loadingInventory, error : errorInventory } = useQuery<Inventory>({
        queryKey: ['inventory', colonyId],
        queryFn:  async () => {
            const res = await agent.get(`/colonies/${colonyId}/inventory`);
            return res.data;
        }
    });

    // Drop item from colony inventory
    const dropColonyItem = useMutation({
        mutationFn: async (itemId: string) => {
            const res = await agent.delete(`/colonies/${colonyId}/inventory/${itemId}`);
            return res.data;
        },
        onMutate: async (itemId) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['inventory', colonyId] });

            // Snapshot the previous value
            const previousInventory = queryClient.getQueryData<Inventory>(['inventory', colonyId]);

            // Optimistically update to the new value
            if (previousInventory) {
                queryClient.setQueryData<Inventory>(['inventory', colonyId], {
                    ...previousInventory,
                    items: previousInventory.items.filter(item => item.itemId !== itemId)
                });
            }

            // Return a context object with the snapshotted value
            return { previousInventory };
        },
        onError: (_error, _itemId, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousInventory) {
                queryClient.setQueryData(['inventory', colonyId], context.previousInventory);
            }
        },
        onSettled: () => {
            // Always refetch after error or success to ensure data consistency
            queryClient.invalidateQueries({ queryKey: ['inventory', colonyId] });
        },
    });

   

    return {
        inventory,
        loadingInventory,
        errorInventory,
        dropColonyItem,
    };
}