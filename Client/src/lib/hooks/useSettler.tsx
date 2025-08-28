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

  // Select Settler
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
    onSuccess: (_, variables) => async () => {
      // Invalidate the colony query so it refetches updated settlers
      await queryClient.invalidateQueries({ queryKey: ["colony", variables.colonyId] });
    },
  });

  return { onboardSettler, selectSettler };
}