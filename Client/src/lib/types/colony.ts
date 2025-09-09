import type { Settler } from "./settler";
import type { ColonyEvent } from "./event";

export interface ColonyHomestead {
  x: number;
  y: number;
}

export interface Colony {
  _id: string;
  userId: string;              // ObjectId as string
  serverId: string;
  serverName: string;          // Server name from catalogue
  serverType: string;          // PvE, PvP, Extreme
  colonyName: string;
  level: number;
  notoriety: number;
  homesteadLocation: ColonyHomestead;
  settlers: Settler[];          // Array of Settler ObjectId strings
  inventory: string;           // Inventory ObjectId as string
  createdAt?: string;          // ISO date string
  settlerCount: number;
  currentInventoryStacks: number;
  maxInventory: number;
  maxSettlers: number;
  unlocks: Record<string, boolean>;
  daysFood: number;
  scrapMetal: number;
  wood: number;
  logs: ColonyEvent[];         // Colony event logs
}