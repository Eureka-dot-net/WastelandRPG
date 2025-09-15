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

// Sleep-specific preview result
export interface SleepPreviewResult extends BasePreviewResult {
  // Sleep-specific fields
  bedLevel: number;
  canSleep: boolean;
  reason?: string;
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

export function isAssignmentPreview(preview: BasePreviewResult): preview is AssignmentPreviewResult {
  return !('coordinates' in preview) && !('bedLevel' in preview);
}

export function isMapExplorationPreview(preview: BasePreviewResult): preview is MapExplorationPreviewResult {
  return 'coordinates' in preview;
}

export function isSleepPreview(preview: BasePreviewResult): preview is SleepPreviewResult {
  return 'bedLevel' in preview;
}