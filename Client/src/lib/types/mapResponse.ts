import type { Assignment } from "./assignment";

export interface MapTileAPI {
  position: {
    row: number;
    col: number;
  };
  x?: number;
  y?: number;
  assignments: Assignment[] | undefined;
  terrain?: {
    type: string;
    description: string;
    icon: string;
    rewards: { [key: string]: number }; // e.g. { "scrap": 10, "food": 5 }
    [key: string]: unknown; // e.g. additional terrain catalog info
  };

  exploredAt?: string;
  colony?: string; // colonyId if this tile is a colony
  explored: boolean;
  canExplore: boolean;
}

export interface MapGridAPI {
  size: number; // 5
  tiles: MapTileAPI[][];
}

export interface MapResponse {
  center: {
    x: number;
    y: number;
  };
  grid: MapGridAPI;
  assignments: Assignment[];
}
