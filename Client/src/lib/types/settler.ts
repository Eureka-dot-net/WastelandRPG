export interface SettlerItem {
  itemId: string;
  name: string;
  type: string;
  description?: string;
}

export interface Equipment {
  [slot: string]: SettlerItem | null; // e.g., { head: ..., body: ..., ... }
}

export interface SettlerTrait {
  traitId: string;
  type: string;
  description: string;
  icon: string;
}

export interface Settler {
  _id: string;                      // Settler ObjectId as string
  playerId: string;                 // ObjectId as string
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

  status: string;
  health: number;
  morale: number;
  carry: SettlerItem[];
  equipment: Equipment;
  maxCarrySlots: number;
  createdAt: string;               // ISO date string
}