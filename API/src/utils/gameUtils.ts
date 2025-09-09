// utils/gameUtils.ts
import itemsCatalogue from '../data/itemsCatalogue.json';
import terrainCatalogue from '../data/terrainCatalogue.json';

export interface AdjustmentEffects {
  speedEffects: string[];
  lootEffects: string[];
  traitEffects: string[];
}

export interface GameAdjustments {
  adjustedDuration: number;
  effectiveSpeed: number;
  lootMultiplier: number;
}

/**
 * Calculate the Manhattan distance between two points
 */
export function calculateDistance(
  fromX: number, 
  fromY: number, 
  toX: number, 
  toY: number
): number {
  return Math.abs(toX - fromX) + Math.abs(toY - fromY);
}

/**
 * Calculate base exploration time and loot multiplier based on distance from homestead
 */
export function calculateDistanceModifiers(distance: number): {
  durationMultiplier: number;
  lootMultiplier: number;
  distanceEffects: string[];
} {
  const distanceEffects: string[] = [];
  
  // Base 5 minutes, add 2 minutes per distance unit
  const durationMultiplier = 1 + (distance * 0.4); // +40% time per distance unit
  distanceEffects.push(`Distance (${distance}): +${Math.round((durationMultiplier - 1) * 100)}% time`);
  
  // Increase loot by 15% per distance unit (risk vs reward)
  const lootMultiplier = 1 + (distance * 0.15); // +15% loot per distance unit
  distanceEffects.push(`Distance (${distance}): +${Math.round((lootMultiplier - 1) * 100)}% loot`);
  
  return {
    durationMultiplier,
    lootMultiplier,
    distanceEffects
  };
}

/**
 * Generate rewards based on a template with random amounts and chances
 */
export function generateRewards(rewardTemplate: any): Record<string, number> {
  const rewards: Record<string, number> = {};
  Object.entries(rewardTemplate).forEach(([key, val]: any) => {
    const chance = val.chance ?? 1;
    if (Math.random() <= chance) {
      rewards[key] = Math.floor(Math.random() * (val.max - val.min + 1)) + val.min;
    }
  });
  return rewards;
}

export function generateRewardsFromDefinition(rewardsDefinition: Record<string, {min: number, max: number, chance: number}>): Record<string, number> {
  const rewards: Record<string, number> = {};
  
  for (const [itemId, config] of Object.entries(rewardsDefinition)) {
    // Roll for chance
    if (Math.random() <= config.chance) {
      // Generate amount within min/max range
      const amount = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
      rewards[itemId] = amount;
    }
  }
  
  return rewards;
}

/**
 * Enrich rewards with metadata from items catalogue
 */
export function enrichRewardsWithMetadata(plannedRewards: Record<string, number> = {}) {
  const enriched: Record<string, any> = {};
  for (const [key, amount] of Object.entries(plannedRewards)) {
    const itemMeta = itemsCatalogue.find(i => i.itemId === key);
    if (itemMeta) {
      enriched[key] = { ...itemMeta, amount };
    } else {
      enriched[key] = { itemId: key, name: key, description: '', icon: null, amount };
    }
  }
  return enriched;
}

/**
 * Get terrain details from catalogue
 */
export function getTerrainCatalogue(terrainId?: string) {
  if (!terrainId) return null;
  return terrainCatalogue.find(terrain => terrain.terrainId === terrainId);
}

/**
 * Generate loot for a tile based on terrain type
 */
export function generateTileLoot(terrain: string): Array<{item: string, amount: number}> {
  const terrainData = getTerrainCatalogue(terrain);
  if (!terrainData?.rewards) return [];

  // Use shared reward generation function - ensure we only process defined rewards
  const definedRewards: Record<string, {min: number, max: number, chance: number}> = {};
  for (const [itemId, config] of Object.entries(terrainData.rewards)) {
    if (config && typeof config === 'object' && 'min' in config && 'max' in config && 'chance' in config) {
      definedRewards[itemId] = config;
    }
  }
  
  const rewards = generateRewardsFromDefinition(definedRewards);
  
  // Convert to the expected format
  return Object.entries(rewards).map(([item, amount]) => ({ item, amount }));
}

/**
 * Generate threat for a tile based on terrain type
 */
export function generateTileThreat(terrain: string): {type: string, level: number} | null {
  const terrainData = getTerrainCatalogue(terrain);
  if (!terrainData) return null;

  // Base threat chance based on terrain threat level
  if (Math.random() > terrainData.threatLevel) return null;

  const threatTypes = terrainData.threats;
  if (threatTypes.length === 0) return null;

  const selectedThreat = threatTypes[Math.floor(Math.random() * threatTypes.length)];
  const level = Math.floor(Math.random() * 5) + 1; // 1-5 threat level

  return { type: selectedThreat, level };
}

/**
 * Generate event for a tile based on terrain type
 */
export function generateTileEvent(terrain: string): {type: string, description: string} | null {
  const terrainData = getTerrainCatalogue(terrain);
  if (!terrainData) return null;

  // Base event chance based on terrain event chance
  if (Math.random() > terrainData.eventChance) return null;

  const eventTypes = terrainData.events;
  if (eventTypes.length === 0) return null;

  const selectedEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  
  return { 
    type: selectedEvent, 
    description: `You discovered a ${selectedEvent.replace('_', ' ')} in the ${terrainData.name}.`
  };
}

/**
 * Get a random terrain type from catalogue
 */
export function getRandomTerrain(): string {
  const terrains = terrainCatalogue.map(t => t.terrainId);
  return terrains[Math.floor(Math.random() * terrains.length)];
}

/**
 * Get adjacent tile coordinates
 */
export function getAdjacentCoordinates(x: number, y: number): Array<{x: number, y: number}> {
  return [
    { x: x, y: y - 1 }, // top
    { x: x, y: y + 1 }, // bottom
    { x: x - 1, y: y }, // left
    { x: x + 1, y: y }  // right
  ];
}