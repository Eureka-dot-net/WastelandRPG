import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Settler } from "../types/settler";
import { agent } from "../api/agent";

export function useSettler() {
  const queryClient = useQueryClient();
  
  // Onboard Settler
  const onboardSettler = useMutation({
    mutationFn: async (colonyId: string) => {
      const res = await agent.post(`/colonies/${colonyId}/settlers/onboard`, {
        headers: { "Content-Type": "application/json" },
      });
      return res.data.settlers as Settler[];
    },
  });

  // Select Settler (Accept/Recruit)
  const selectSettler = useMutation({
    mutationFn: async ({
      colonyId,
      settlerId,
    }: {
      colonyId: string;
      settlerId: string;
    }) => {
      const res = await agent.post(
        `/colonies/${colonyId}/settlers/${settlerId}/select`,
        {}, // body is empty
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return res.data as Settler;
    },
    onSuccess: (_, variables) => {
      // Invalidate the colony query so it refetches updated settlers
      queryClient.invalidateQueries({ queryKey: ["colony", variables.colonyId] });
    },
  });

  // Reject Settler (when you get the endpoint)
  const rejectSettler = useMutation({
    mutationFn: async ({
      colonyId,
      settlerId,
    }: {
      colonyId: string;
      settlerId: string;
    }) => {
      // Replace this with your actual endpoint when available
      const res = await agent.delete(
        `/colonies/${colonyId}/settlers/${settlerId}/reject`,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the colony query if needed
      queryClient.invalidateQueries({ queryKey: ["colony", variables.colonyId] });
    },
  });

  return { 
    onboardSettler, 
    selectSettler, 
    rejectSettler 
  };
}