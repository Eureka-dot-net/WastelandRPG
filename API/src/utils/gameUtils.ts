// utils/gameUtils.ts
import itemsCatalogue from '../data/itemsCatalogue.json';
import terrainCatalogue from '../data/terrainCatalogue.json';
import { generateRewardsFromDefinition } from '../services/gameEventsService';

export interface AdjustmentEffects {
  speedEffects: string[];
  lootEffects: string[];
  traitEffects: string[];
}

export interface GameAdjustments {
  adjustedDuration: number;
  effectiveSpeed: number;
  lootMultiplier: number;
  adjustedPlannedRewards: Record<string, number>;
  effects: AdjustmentEffects;
}

/**
 * Calculate adjustments based on settler stats, skills, and traits
 */
export function calculateSettlerAdjustments(
  baseDuration: number,
  baseRewards: Record<string, number>,
  settler: any
): GameAdjustments {
  // --- SPEED CALCULATION ---
  let effectiveSpeed = 1.0;
  const speedEffects: string[] = [];

  // Speed stat effect (0-20 scale, normalized to 0.5-1.5x multiplier)
  const speedMultiplier = 0.5 + (settler.stats.speed / 20) * 1.0;
  effectiveSpeed *= speedMultiplier;
  speedEffects.push(`Speed stat: ${speedMultiplier.toFixed(2)}x`);

  // --- LOOT CALCULATION ---
  let lootMultiplier = 1.0;
  const lootEffects: string[] = [];
  const traitEffects: string[] = [];

  // Scavenging skill effect (0-20 scale, normalized to 0.8-1.4x multiplier)
  const scavengingMultiplier = 0.8 + (settler.skills.scavenging / 20) * 0.6;
  lootMultiplier *= scavengingMultiplier;
  const scavengingPercent = ((scavengingMultiplier - 1) * 100).toFixed(0);
  lootEffects.push(`Scavenging skill: ${parseInt(scavengingPercent) > 0 ? "+" : ""}${scavengingPercent}%`);

  // Intelligence affects loot quality/variety
  const intelligenceMultiplier = 0.9 + (settler.stats.intelligence / 20) * 0.3;
  lootMultiplier *= intelligenceMultiplier;
  const intelligencePercent = ((intelligenceMultiplier - 1) * 100).toFixed(0);
  lootEffects.push(`Intelligence: ${parseInt(intelligencePercent) > 0 ? "+" : ""}${intelligencePercent}%`);

  // --- TRAIT EFFECTS ---
  if (settler.traits && Array.isArray(settler.traits)) {
    settler.traits.forEach((trait: any) => {
      switch (trait.traitId) {
        case 'scavenger':
          lootMultiplier *= 1.15;
          traitEffects.push(`${trait.name}: +15% loot`);
          break;
        case 'quick':
          effectiveSpeed *= 1.2;
          traitEffects.push(`${trait.name}: +20% speed`);
          break;
        case 'strong':
          lootMultiplier *= 1.1;
          traitEffects.push(`${trait.name}: +10% loot`);
          break;
        case 'lazy':
          effectiveSpeed *= 0.8;
          traitEffects.push(`${trait.name}: -20% speed`);
          break;
        case 'weak':
          lootMultiplier *= 0.9;
          traitEffects.push(`${trait.name}: -10% loot`);
          break;
      }
    });
  }

  // --- FINAL CALCULATIONS ---
  const adjustedDuration = Math.round(baseDuration / effectiveSpeed);

  // Apply loot multiplier to planned rewards
  const adjustedPlannedRewards: Record<string, number> = {};
  Object.entries(baseRewards).forEach(([key, amount]) => {
    adjustedPlannedRewards[key] = Math.max(1, Math.round(amount * lootMultiplier));
  });

  // --- RETURN STRUCTURE ---
  return {
    adjustedDuration,
    effectiveSpeed,
    lootMultiplier,
    adjustedPlannedRewards,
    effects: {
      speedEffects,
      lootEffects,
      traitEffects
    }
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