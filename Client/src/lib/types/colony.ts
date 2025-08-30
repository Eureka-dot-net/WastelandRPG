import type { Settler } from "./settler";

export interface Colony {
  _id: string;
  userId: string;              // ObjectId as string
  serverId: string;
  colonyName: string;
  level: number;
  notoriety: number;
  settlers: Settler[];          // Array of Settler ObjectId strings
  inventory: string;           // Inventory ObjectId as string
  createdAt?: string;          // ISO date string
  hasSettlers: boolean;
  inventorySize?: number;
  unlocks: Record<string, boolean>;
  daysFood: number;
  scrapMetal: number;
  wood: number;
}