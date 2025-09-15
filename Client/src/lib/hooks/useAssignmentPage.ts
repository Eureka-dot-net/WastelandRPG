import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useColony } from "../../lib/hooks/useColony";
import { useAssignmentNotifications } from "../../lib/hooks/useAssignmentNotifications";
import type { Settler } from "../../lib/types/settler";
import type { BasePreviewResult } from "../types/preview";
import type { Assignment } from "../types/assignment";

// Generic target type
export interface GenericTarget {
  _id?: string;
  id?: string;
  x?: number;
  y?: number;
}

// Mutation type for assignment starting
export interface StartAssignmentMutation {
  mutate: (params: Record<string, unknown>, options?: { onSettled?: () => void }) => void;
  isPending: boolean;
}

// Configuration for different assignment page types
export interface AssignmentPageConfig<T extends GenericTarget> {
  previewType: 'assignment' | 'map-exploration';
  getTargetId: (target: T) => string;
  getTargetKey: (target: T) => string;
  getAvailableTargets: (allTargets: T[]) => T[];
  startAssignment: StartAssignmentMutation;
  // New: Functions to calculate base duration and rewards for frontend preview
  getBaseDuration?: (target: T) => number;
  getBasePlannedRewards?: (target: T) => Record<string, number>;
}

// Helper function to generate preview data using settler adjustments
function generatePreviewData(
  settler: Settler, 
  baseDuration: number, 
  basePlannedRewards: Record<string, number>,
  activityType: string
): BasePreviewResult {
  const settlerAdjustments = settler.adjustments[activityType] || { loot: 1, speed: 1 };
  
  return {
    settlerId: settler._id,
    settlerName: settler.name,
    baseDuration,
    basePlannedRewards,
    adjustments: {
      adjustedDuration: Math.round(baseDuration * settlerAdjustments.speed),
      effectiveSpeed: settlerAdjustments.speed,
      lootMultiplier: settlerAdjustments.loot
    }
  };
}

export function useAssignmentPage<T extends GenericTarget>(
  serverId: string,
  allTargets: T[],
  config: AssignmentPageConfig<T>
) {
  const [settlerDialogOpen, setSettlerDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<T | null>(null);
  const [startingTargetKey, setStartingTargetKey] = useState<string | null>(null);
  const [settlerPreviews, setSettlerPreviews] = useState<Record<string, BasePreviewResult>>({});

  const { colony, colonyLoading } = useColony(serverId);
  const queryClient = useQueryClient();
  const { timers, informingAssignments } = useAssignmentNotifications();

  // Extract colonyId from the colony data
  const colonyId = colony?._id;

  // Get available settlers
  const availableSettlers = useMemo<Settler[]>(() => {
    return colony?.settlers?.filter(settler => settler.status === "idle") ?? [];
  }, [colony?.settlers]);

  // Get available targets
  const availableTargets = useMemo<T[]>(() => {
    return config.getAvailableTargets(allTargets);
  }, [allTargets, config]);

  // Build unified preview data when a target is selected - no more API calls needed
  useEffect(() => {
    if (!selectedTarget || !availableSettlers.length) {
      setSettlerPreviews({});
      return;
    }

    const previews: Record<string, BasePreviewResult> = {};
    
    // Get base values for the selected target
    const baseDuration = config.getBaseDuration?.(selectedTarget) ?? 300000; // 5 minutes default
    const basePlannedRewards = config.getBasePlannedRewards?.(selectedTarget) ?? {};
    const activityType = config.previewType === 'assignment' ? 'quest' : 'exploration';

    availableSettlers.forEach(settler => {
      previews[settler._id!] = generatePreviewData(
        settler,
        baseDuration,
        basePlannedRewards,
        activityType
      );
    });

    setSettlerPreviews(previews);
  }, [selectedTarget, availableSettlers, config]);

  // Invalidate queries when colony changes
  useEffect(() => {
    if (colonyId) {
      queryClient.invalidateQueries({ queryKey: ["assignments", colonyId] });
    }
  }, [colonyId, queryClient]);

  // Action handlers
  const handleTargetSelect = useCallback((target: T) => {
    if (!availableSettlers.length) return;

    setSelectedTarget(target);
    setSettlerDialogOpen(true);
  }, [availableSettlers.length]);

  const handleSettlerSelect = useCallback(
    (settler: Settler, additionalParams: Record<string, unknown> = {}) => {
      if (!selectedTarget) return;

      const targetKey = config.getTargetKey(selectedTarget);
      setStartingTargetKey(targetKey);

      const settlerPreview = settlerPreviews[settler._id!];
      const previewDuration: number | undefined = settlerPreview?.baseDuration;

      const baseParams: Record<string, unknown> = {
        settlerId: settler._id,
        ...(previewDuration && { previewDuration }),
        ...additionalParams,
      };

      if (config.previewType === 'assignment') {
        baseParams.assignmentId = config.getTargetId(selectedTarget);
      } else if (config.previewType === 'map-exploration') {
        baseParams.row = selectedTarget.y!;
        baseParams.col = selectedTarget.x!;
      }

      config.startAssignment.mutate(baseParams, {
        onSettled: () => {
          setStartingTargetKey(null);
        },
      });

      setSettlerDialogOpen(false);
      setSelectedTarget(null);
    },
    [selectedTarget, settlerPreviews, config]
  );

  const handleDialogClose = useCallback(() => {
    setSettlerDialogOpen(false);
    setSelectedTarget(null);
  }, []);

  // Utility functions
  const isTargetStarting = useCallback(
    (target: T) => startingTargetKey === config.getTargetKey(target),
    [startingTargetKey, config]
  );

  const getTargetTimeRemaining = useCallback(
    (targetId: string) => timers[targetId],
    [timers]
  );

  const isTargetInforming = useCallback(
    (targetId: string) => informingAssignments.has(targetId),
    [informingAssignments]
  );

  return {
    // State
    colony,
    colonyLoading,
    availableSettlers,
    availableTargets,
    selectedTarget,
    settlerDialogOpen,
    startingTargetKey,
    settlerPreviews,
    previewsLoading: false, // No longer needed since we calculate on frontend
    previewsError: null,   // No longer needed since we calculate on frontend
    timers,

    // Actions
    handleTargetSelect,
    handleSettlerSelect,
    handleDialogClose,

    // Utilities
    isTargetStarting,
    getTargetTimeRemaining,
    isTargetInforming,

    // Assignment mutation state
    assignmentPending: config.startAssignment.isPending,
  };
}

// Quest page configuration
export const createQuestPageConfig = (
  startAssignment: StartAssignmentMutation,
  assignments: Assignment[] = []
): AssignmentPageConfig<{ _id: string; state: string; dependsOn?: string; taskId?: string }> => ({
  previewType: 'assignment',
  getTargetId: assignment => assignment._id,
  getTargetKey: assignment => assignment._id,
  getAvailableTargets: allAssignments =>
    allAssignments?.filter(a =>
      a.state === "available" &&
      (!a.dependsOn ||
        ["informed", "completed"].includes(
          allAssignments.find(d => d.taskId === a.dependsOn)?.state ?? ""
        ))
    ) || [],
  startAssignment,
  getBaseDuration: assignment => {
    const fullAssignment = assignments.find(a => a._id === assignment._id);
    return fullAssignment?.duration ?? 300000; // 5 minutes default
  },
  getBasePlannedRewards: assignment => {
    const fullAssignment = assignments.find(a => a._id === assignment._id);
    const rewards: Record<string, number> = {};
    if (fullAssignment?.plannedRewards) {
      Object.entries(fullAssignment.plannedRewards).forEach(([key, item]) => {
        rewards[key] = item.amount || 1;
      });
    }
    return rewards;
  }
});

// Map exploration page configuration
export const createMapExplorationConfig = (
  startExploration: StartAssignmentMutation,
  homesteadLocation?: { x: number; y: number }
): AssignmentPageConfig<{ x: number; y: number }> => ({
  previewType: 'map-exploration',
  getTargetId: coord => `${coord.x}:${coord.y}`,
  getTargetKey: coord => `${coord.x}:${coord.y}`,
  getAvailableTargets: coordinates => coordinates,
  startAssignment: startExploration,
  getBaseDuration: coord => {
    if (!homesteadLocation) return 300000; // 5 minutes default
    
    // Calculate Manhattan distance from homestead
    const distance = Math.abs(coord.x - homesteadLocation.x) + Math.abs(coord.y - homesteadLocation.y);
    
    // Base 5 minutes + 2 minutes per distance unit (same as server logic)
    const baseDurationMs = 300000; // 5 minutes
    const additionalTime = distance * 120000; // 2 minutes per distance unit
    
    return baseDurationMs + additionalTime;
  },
  getBasePlannedRewards: () => ({
    // Map exploration rewards are dynamic based on terrain, 
    // for preview we'll just show base loot multiplier effects
  })
});

// Usage example for quest page:
/*
const config = createQuestPageConfig(assignments, startAssignment);
const {
  colony,
  colonyLoading,
  availableSettlers,
  availableTargets: availableAssignments,
  handleTargetSelect: handleAssignClick,
  handleSettlerSelect,
  handleDialogClose,
  settlerDialogOpen,
  selectedTarget: selectedTask,
  settlerPreviews,
  previewsLoading,
  previewsError,
  isTargetStarting,
  assignmentPending
} = useAssignmentPage(serverId, colonyId, assignments || [], config);
*/

// Lodging/sleep page configuration
export const createLodgingPageConfig = (
  startSleep: StartAssignmentMutation
): AssignmentPageConfig<{ level: number; index: number; _id: string }> => ({
  previewType: 'assignment', 
  getTargetId: bed => bed._id,
  getTargetKey: bed => bed._id,
  getAvailableTargets: allBeds => allBeds, // All beds are available for selection
  startAssignment: startSleep,
  getBaseDuration: bed => {
    // Calculate base sleep duration for a settler with 0 energy using bed level
    const baseEnergyDelta = 10; // 10 energy per hour for resting
    const bedMultiplier = 1 + (bed.level - 1) * 0.3; // Higher level beds = faster recovery
    const effectiveEnergyDelta = baseEnergyDelta * bedMultiplier;
    const energyNeeded = 100; // Assume worst case scenario for preview
    const hoursNeeded = energyNeeded / effectiveEnergyDelta;
    return Math.ceil(hoursNeeded * 60 * 60 * 1000); // Convert to milliseconds
  },
  getBasePlannedRewards: () => ({
    // Sleep doesn't provide item rewards, just energy recovery
    energy: 100
  })
});

// Usage example for map page:
/*
const explorableCoordinates: { x: number; y: number }[] = getExplorableCoordinates();
const config = createMapExplorationConfig(startExploration);
const {
  colony,
  colonyLoading,
  availableSettlers,
  handleTargetSelect: handleTileClick,
  handleSettlerSelect,
  handleDialogClose,
  settlerDialogOpen,
  selectedTarget: selectedCoordinate,
  settlerPreviews,
  previewsLoading,
  previewsError,
  isTargetStarting,
  assignmentPending
} = useAssignmentPage(serverId, colonyId, explorableCoordinates, config);
*/