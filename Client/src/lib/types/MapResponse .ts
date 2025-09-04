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
    [key: string]: unknown; // e.g. additional terrain catalog info
  };
  icon?: string;
  loot?: {
    item: string;
    amount: number;
  }[];
  threat?: {
    type: string;
    level: number;
  } | null;
  event?: {
    type: string;
    description: string;
  } | null;
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
}
