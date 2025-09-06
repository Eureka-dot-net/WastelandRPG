import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Settler } from "../types/settler";
import { agent } from "../api/agent";
import type { Colony } from "../types/colony";

/**
 * Custom hook for settler mutations.
 * If colonyId is not defined, mutation functions will throw and not run.
 */
export function useSettler(serverId: string | null, colonyId?: string | null) {
  const queryClient = useQueryClient();

  // Onboard Settler
  const onboardSettler = useMutation({
    mutationFn: async () => {
      if (!colonyId) throw new Error("colonyId is required to onboard a settler.");
      const res = await agent.post(
        `/colonies/${colonyId}/settlers/onboard`,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return res.data.settlers as Settler[];
    }
  });

  // Select Settler (Accept/Recruit)
  const selectSettler = useMutation({
    mutationFn: async ({
      settlerId,
      interests
    }: {
      settlerId: string;
      interests?: string[];
    }) => {
      if (!colonyId) throw new Error("colonyId is required to select a settler.");
      const res = await agent.post(
        `/colonies/${colonyId}/settlers/${settlerId}/select`,
        { interests }, // Send interests in the body
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return res.data as Settler;
    },
    onMutate: async ({ settlerId, interests }) => {
      if (!colonyId) return;
      
      // Cancel any outgoing colony queries to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["colony", serverId] });
      
      // Snapshot previous colony data for rollback
      const prevColonyData = queryClient.getQueryData<Colony>(["colony", serverId]);
      
      // Create a temporary settler object for optimistic update
      const tempSettler: Settler = {
        _id: settlerId,
        colonyId: colonyId,
        isActive: true,
        nameId: "temp-settler",
        name: "New Settler", // Placeholder - will be replaced by server response
        backstory: "A new settler joining the colony",
        theme: "default",
        stats: {
          strength: 1,
          speed: 1,
          intelligence: 1,
          resilience: 1
        },
        skills: {
          combat: 1,
          scavenging: 1,
          farming: 1,
          crafting: 1,
          medical: 1,
          engineering: 1
        },
        interests: interests || [],
        traits: [],
        status: "idle",
        health: 100,
        morale: 100,
        hunger: 100,
        energy: 100,
        carry: [],
        equipment: {},
        foodConsumption: 1,
        maxCarrySlots: 10,
        createdAt: new Date().toISOString()
      };
      
      // Optimistically add the settler to colony data
      queryClient.setQueryData<Colony>(["colony", serverId], (oldColony) => {
        if (!oldColony) return oldColony;
        return {
          ...oldColony,
          settlers: [...oldColony.settlers, tempSettler],
          settlerCount: oldColony.settlerCount + 1,
        };
      });
      
      return { prevColonyData, settlerId };
    },
    onError: (_, __, context) => {
      // Rollback colony data if mutation failed
      if (context?.prevColonyData) {
        queryClient.setQueryData<Colony>(["colony", serverId], context.prevColonyData);
      }
    },
    onSuccess: (returnedSettler, _, context) => {
      if (!colonyId) return;
      // Replace the temporary settler with the real one from the server
      queryClient.setQueryData<Colony>(
        ["colony", serverId],
        (oldColony) => {
          if (!oldColony) return oldColony;
          return {
            ...oldColony,
            settlers: oldColony.settlers.map(s => 
              s._id === context?.settlerId ? returnedSettler : s
            ),
          };
        }
      );
    },
  });

  // Reject Settler (when you get the endpoint)
  const rejectSettler = useMutation({
    mutationFn: async ({
      settlerId,
    }: {
      settlerId: string;
    }) => {
      if (!colonyId) throw new Error("colonyId is required to reject a settler.");
      // Replace this with your actual endpoint when available
      const res = await agent.delete(
        `/colonies/${colonyId}/settlers/${settlerId}/reject`,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return res.data;
    }
  });

  return { 
    onboardSettler, 
    selectSettler, 
    rejectSettler 
  };
}