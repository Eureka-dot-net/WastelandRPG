// Unified preview data types for SettlerPreviewCard

export interface PreviewAdjustments {
  speedEffects: string[];
  lootEffects: string[];
  traitEffects: string[];
}

export interface PreviewTerrain {
  type: string;
  name: string;
  description: string;
  icon: string;
}

// Base preview interface that all preview types should extend
export interface BasePreview {
  settlerId: string;
  settlerName: string;
  duration: number;
  adjustments: PreviewAdjustments;
}

// Assignment preview extends base with assignment-specific fields
export interface AssignmentPreview extends BasePreview {
  type: 'assignment';
  baseDuration: number;
  basePlannedRewards: Record<string, number>;
  adjustments: {
    speedEffects: string[];
    lootEffects: string[];
    traitEffects: string[];
    adjustedDuration: number;
    lootMultiplier: number;
    effects: PreviewAdjustments;
  };
}

// Map exploration preview extends base with exploration-specific fields
export interface MapExplorationPreview extends BasePreview {
  type: 'exploration';
  coordinates: { x: number; y: number };
  terrain?: PreviewTerrain;
  loot?: Record<string, { amount: number; itemId: string; name: string; type: string; }>;
  adjustedLoot?: Record<string, { amount: number; itemId: string; name: string; type: string; }>;
  estimatedLoot?: Record<string, { amount: number; itemId: string; name: string; type: string; }>;
  adjustedEstimatedLoot?: Record<string, { amount: number; itemId: string; name: string; type: string; }>;
  threat?: { type: string; level: number } | null;
  event?: { type: string; description: string } | null;
  estimatedDuration?: number;
  alreadyExplored: boolean;
}

// Union type for all preview types
export type UnifiedPreview = AssignmentPreview | MapExplorationPreview;

// Type guards
export function isAssignmentPreview(preview: UnifiedPreview): preview is AssignmentPreview {
  return preview.type === 'assignment';
}

export function isMapExplorationPreview(preview: UnifiedPreview): preview is MapExplorationPreview {
  return preview.type === 'exploration';
}