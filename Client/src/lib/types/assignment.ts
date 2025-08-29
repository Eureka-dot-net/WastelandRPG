export interface AssignmentRewardItem {
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

export interface PlannedRewards {
  [key: string]: AssignmentRewardItem;
}

export interface Assignment {
  _id: string;
  colonyId: string;
  taskId: string;
  type: string;
  state: 'available' | 'in-progress' | 'completed' | 'informed';
  dependsOn?: string;
  name: string;
  settlerId: string;
  description: string;
  duration: number;
  unlocks: string;
  completionMessage?: string;
  plannedRewards: PlannedRewards;
  createdAt: string;      // ISO date string
  updatedAt: string;      // ISO date string
  startedAt?: string;     // ISO date string
  completedAt?: string;   // ISO date string
}
