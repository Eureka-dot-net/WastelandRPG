import type { ExplorationRewardItem } from "./exploration";

// Each tile in the map grid
export interface MapTile {
  x: number;
  y: number;
  terrain: {
    type: string;
    name: string;
    description: string;
    icon: string;
  };
  loot?: ExplorationRewardItem[];           // Optional loot items on the tile
  threat?: number;                           // Optional threat level
  event?: string;                            // Optional event description
  exploredBy: string[];                      // Names of settlers who explored the tile
}

// The full 5x5 grid response from the API
export interface MapGrid5x5Response {
  center: { x: number; y: number };         // The coordinates of the center tile
  grid: MapTile[][];                         // 2D array of tiles: grid[row][column]
}
