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
    }: {
      settlerId: string;
    }) => {
      if (!colonyId) throw new Error("colonyId is required to select a settler.");
      const res = await agent.post(
        `/colonies/${colonyId}/settlers/${settlerId}/select`,
        {}, // body is empty
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return res.data as Settler;
    },
    onSuccess: (returnedSettler) => {
      if (!colonyId) return;
      // Update the colony data in the cache
      queryClient.setQueryData<Colony>(
        ["colony", serverId],
        (oldColony) => {
          if (!oldColony) return oldColony;
          return {
            ...oldColony,
            settlers: [...oldColony.settlers, returnedSettler],
            settlerCount: oldColony.settlerCount + 1,
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