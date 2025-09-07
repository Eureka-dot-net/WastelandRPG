export interface SettlerItem {
  itemId: string;
  name: string;
  type: string;
  description?: string;
  quantity?: number; // Added for carry items
}

export interface Equipment {
  [slot: string]: SettlerItem | null; // e.g., { head: ..., body: ..., ... }
}

export interface SettlerTrait {
  traitId: string;
  name?: string; // Added optional name property
  type: string;
  description: string;
  icon: string;
}

export interface Settler {
  _id: string;                      // Settler ObjectId as string
  colonyId: string;                 // ObjectId as string
  isActive: boolean;
  nameId: string;
  name: string;
  backstory: string;
  theme?: string;

  stats: {
    strength: number;
    speed: number;
    intelligence: number;
    resilience: number;
  };

  skills: {
    combat: number;
    scavenging: number;
    farming: number;
    crafting: number;
    medical: number;
    engineering: number;
  };

  interests: string[];

  traits: SettlerTrait[];

  status: 'idle' | 'working' | 'resting' | 'exploring' | 'crafting';
  health: number;
  morale: number;
  hunger: number;
  energy: number;
  isFemale: boolean;
  carry: SettlerItem[];
  equipment: Equipment;
  foodConsumption: number;
  maxCarrySlots: number;
  createdAt: string;               // ISO date string
}