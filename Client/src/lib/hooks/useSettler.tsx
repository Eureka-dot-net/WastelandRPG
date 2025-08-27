import { useMutation } from "@tanstack/react-query";
import type { Settler } from "../types/settler";
import { agent } from "../api/agent";

export function useSettler() {
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
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return res.data  as Promise<Settler>;
    },
  });

  return { onboardSettler, selectSettler };
}