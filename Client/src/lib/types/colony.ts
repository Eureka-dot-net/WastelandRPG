export interface Colony {
  _id: string;
  userId: string;              // ObjectId as string
  serverId: string;
  colonyName: string;
  level: number;
  notoriety: number;
  settlers: string[];          // Array of Settler ObjectId strings
  inventory: string;           // Inventory ObjectId as string
  createdAt?: string;          // ISO date string
}