// Unified preview data types for standardized API responses

// Base preview result that both assignment and exploration previews share
export interface BasePreviewResult {
  settlerId: string;
  settlerName: string;
  baseDuration: number;
  basePlannedRewards: Record<string, number>;
  adjustments: {
    adjustedDuration: number;
    effectiveSpeed: number;
    lootMultiplier: number;
    adjustedPlannedRewards: Record<string, number>;
  };
}

// Assignment-specific preview result (extends base with no additional required fields)
export type AssignmentPreviewResult = BasePreviewResult;

// Map exploration-specific preview result  
export interface MapExplorationPreviewResult extends BasePreviewResult {
  // Map-specific fields
  coordinates: { x: number; y: number };
  alreadyExplored: boolean;
  estimatedLoot?: Record<string, { amount: number; itemId: string; name: string; type: string; }>;
  terrain?: {
    type: string;
    name: string;
    description: string;
    icon: string;
  };
}

// Batch results
export interface BatchAssignmentPreviewResult {
  results: Record<string, Record<string, AssignmentPreviewResult>>;
}

export interface BatchMapExplorationPreviewResult {
  results: Record<string, Record<string, MapExplorationPreviewResult>>;
}

export interface PreviewTerrain {
  type: string;
  name: string;
  description: string;
  icon: string;
}

// Assignment preview extends base with assignment-specific fields
export interface AssignmentPreview {
  type: 'assignment';
  settlerId: string;
  settlerName: string;
  duration: number;
  baseDuration: number;
  basePlannedRewards: Record<string, number>;
  adjustments: {
    adjustedDuration: number;
    lootMultiplier: number;
  };
}

// Map exploration preview extends base with exploration-specific fields
export interface MapExplorationPreview {
  type: 'exploration';
  settlerId: string;
  settlerName: string;
  duration: number;
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