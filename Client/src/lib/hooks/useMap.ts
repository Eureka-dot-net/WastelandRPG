import { useMutation, useQuery } from "@tanstack/react-query";
import { agent } from "../api/agent";
import type { MapResponse } from "../types/MapResponse ";
import type { Assignment } from "../types/assignment";

export function useMap(
  serverId: string | null,
  colonyId?: string | null,
  centerX = 0,
  centerY = 0
) {

  // --- FETCH 5x5 MAP GRID ---
  const {
    data: map,
    error: errorMap,
    isLoading: loadingMap,
    refetch,
  } = useQuery<MapResponse>({
    queryKey: ["map", colonyId, centerX, centerY],
    queryFn: async () => {
      const url = `/colonies/${colonyId}/map?x=${centerX}&y=${centerY}`;
      const response = await agent.get(url);
      return response.data as MapResponse;
    },
    enabled: !!colonyId && !!serverId,
  });

  // --- MUTATION: START EXPLORATION ---
  type StartExplorationContext = {
    prevData: MapResponse | undefined;
  };

  const startExploration = useMutation<
    Assignment, // backend returns assignment object
    Error,
    { row: number; col: number; settlerId: string },
    StartExplorationContext
  >({
    mutationFn: async ({ row, col, settlerId }) => {
      const url = `/colonies/${colonyId}/map/start`;
      const response = await agent.post(url, { row, col, settlerId });
      return response.data as Assignment;
    },
    // onMutate: async ({ row, col, settlerId }) => {
    //   await queryClient.cancelQueries({ queryKey: ["map", colonyId, centerX, centerY] });
    //   const prevData = queryClient.getQueryData<MapResponse>(["map", colonyId, centerX, centerY]);

    //   // Optimistically mark tile as explored (or "in-progress")
    //   if (prevData) {
    //     const newTiles = prevData.grid.tiles.map((gridRow, r) =>
    //       gridRow.map((tile, c) => {
    //         if (r === row && c === col) {
    //           return { ...tile, explored: true }; // optimistic
    //         }
    //         return tile;
    //       })
    //     );

    //     queryClient.setQueryData<MapResponse>(["map", colonyId, centerX, centerY], {
    //       ...prevData,
    //       grid: {
    //         ...prevData.grid,
    //         tiles: newTiles,
    //       },
    //     });
    //   }

    //   return { prevData };
    // },
    // onError: (_, __, context) => {
    //   // rollback if mutation fails
    //   if (context?.prevData) {
    //     queryClient.setQueryData(["map", colonyId, centerX, centerY], context.prevData);
    //   }
    // },
    // onSuccess: () => {
    //   // optionally refetch grid or rely on assignments for updates
    //   queryClient.invalidateQueries(["assignments", colonyId]);
    // },
  });

  return {
    map,
    errorMap,
    loadingMap,
    startExploration,
    refetch,
  };
}
