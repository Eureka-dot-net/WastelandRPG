export interface InventoryItem {
  itemId: string;           // matches backend itemId
  name: string;             // display name
  icon: string;
  type: 'base' | 'crafted' | 'currency' | 'farming' | 'food' | 'medicine' | 'quest';
  quantity: number;
  properties?: Record<string, unknown>; // e.g. { stackable: true, foodValue: 0.5 }
}

export interface Inventory {
  colonyId: string;         // colony _id as string
  items: InventoryItem[];
}