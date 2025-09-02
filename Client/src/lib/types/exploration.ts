import type { Settler } from "./settler";

export interface ExplorationRewardItem {
  itemId: string;
  name: string;
  type: string;
  tradeValue: number;
  rarity: string;
  description?: string;
  icon?: string;
  properties?: {
    stackable: boolean;
  };
  obtainMethods?: string[];
  amount: number;
}

export interface PlannedExplorationRewards {
  [key: string]: ExplorationRewardItem;
}

export interface ExplorationAdjustments {
  adjustedDuration: number;
  effectiveSpeed: number;
  lootMultiplier: number;
  adjustedPlannedRewards: Record<string, number>;
  effects: {
    speedEffects: string[];
    lootEffects: string[];
    traitEffects: string[];
  };
}

export interface Exploration {
  _id: string;
  serverId: string;
  colonyId: string;
  settlerId: string;
  x: number;
  y: number;
  state: "in-progress" | "completed" | "informed";
  startedAt: string;           // ISO date string
  completedAt: string;         // ISO date string
  plannedRewards: PlannedExplorationRewards;
  settlerFound?: Settler;
  adjustments: ExplorationAdjustments;
  createdAt: string;           // ISO date string
  updatedAt: string;           // ISO date string
}
