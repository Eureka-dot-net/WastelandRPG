export interface ItemProperty {
  [key: string]: any;
}

export interface RecipeComponent {
  itemId: string;
  quantity: number;
}

export interface ItemCatalogueEntry {
  itemId: string;
  name: string;
  type: string;
  tradeValue: number;
  rarity: string;
  properties?: ItemProperty;
  recipe?: RecipeComponent[];
  description?: string;
  craftingTime?: number;
  obtainMethods: string[];
}