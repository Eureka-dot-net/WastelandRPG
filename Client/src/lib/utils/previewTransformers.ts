// Utility functions to transform API responses to unified preview format

import type { PreviewAssignmentResult } from '../hooks/usePreviewAssignment';
import type { MapExplorationPreviewResult } from '../hooks/usePreviewMapExploration';
import type { AssignmentPreview, MapExplorationPreview } from '../types/preview';

/**
 * Transform assignment preview API response to unified format
 */
export function transformAssignmentPreview(
  apiResponse: PreviewAssignmentResult
): AssignmentPreview {
  return {
    type: 'assignment',
    settlerId: apiResponse.settlerId,
    settlerName: apiResponse.settlerName,
    duration: apiResponse.adjustments.adjustedDuration,
    baseDuration: apiResponse.baseDuration,
    basePlannedRewards: apiResponse.basePlannedRewards,
    adjustments: {
      speedEffects: apiResponse.adjustments.effects.speedEffects,
      lootEffects: apiResponse.adjustments.effects.lootEffects,
      traitEffects: apiResponse.adjustments.effects.traitEffects,
      adjustedDuration: apiResponse.adjustments.adjustedDuration,
      lootMultiplier: apiResponse.adjustments.lootMultiplier,
      effects: apiResponse.adjustments.effects
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
    settlerId: apiResponse.settler.id,
    settlerName: apiResponse.settler.name,
    duration: apiResponse.preview.duration || apiResponse.preview.estimatedDuration || 300000,
    coordinates: apiResponse.coordinates,
    terrain: apiResponse.preview.terrain,
    loot: apiResponse.preview.loot,
    adjustedLoot: apiResponse.preview.adjustedLoot,
    estimatedLoot: apiResponse.preview.estimatedLoot,
    adjustedEstimatedLoot: apiResponse.preview.adjustedEstimatedLoot,
    threat: apiResponse.preview.threat,
    event: apiResponse.preview.event,
    estimatedDuration: apiResponse.preview.estimatedDuration,
    alreadyExplored: apiResponse.preview.alreadyExplored,
    adjustments: apiResponse.preview.adjustments
  };
}