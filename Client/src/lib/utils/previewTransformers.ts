// Utility functions to transform API responses to unified preview format

import type { AssignmentPreviewResult, MapExplorationPreviewResult } from '../types/preview';
import type { AssignmentPreview, MapExplorationPreview } from '../types/preview';

/**
 * Transform assignment preview API response to unified format
 */
export function transformAssignmentPreview(
  apiResponse: AssignmentPreviewResult
): AssignmentPreview {
  return {
    type: 'assignment',
    settlerId: apiResponse.settlerId,
    settlerName: apiResponse.settlerName,
    duration: apiResponse.adjustments.adjustedDuration,
    baseDuration: apiResponse.baseDuration,
    basePlannedRewards: apiResponse.basePlannedRewards,
    adjustments: {
      adjustedDuration: apiResponse.adjustments.adjustedDuration,
      lootMultiplier: apiResponse.adjustments.lootMultiplier,
      // Note: effects are no longer returned by the API
      speedEffects: [],
      lootEffects: [],
      traitEffects: []
    }
  };
}

/**
 * Transform map exploration preview API response to unified format
 */
export function transformMapExplorationPreview(
  apiResponse: MapExplorationPreviewResult
): MapExplorationPreview {
  return {
    type: 'exploration',
    settlerId: apiResponse.settlerId,
    settlerName: apiResponse.settlerName,
    duration: apiResponse.adjustments.adjustedDuration,
    coordinates: apiResponse.coordinates,
    terrain: apiResponse.terrain,
    estimatedLoot: apiResponse.estimatedLoot,
    alreadyExplored: apiResponse.alreadyExplored,
    adjustments: {
      // Note: effects are no longer returned by the API
      speedEffects: [],
      lootEffects: [],
      traitEffects: []
    }
  };
}