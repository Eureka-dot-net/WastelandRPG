import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useColony } from "../../lib/hooks/useColony";
import { useAssignmentNotifications } from "../../lib/hooks/useAssignmentNotifications";
import { useSmartBatchPreviewAssignment, useSmartBatchPreviewMapExploration } from "../../lib/hooks/usePreview";
import type { Settler } from "../../lib/types/settler";
import type { UnifiedPreview, AssignmentPreviewResult, MapExplorationPreviewResult } from "../../lib/types/preview";
import { transformAssignmentPreview, transformMapExplorationPreview } from "../../lib/utils/previewTransformers";

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
}

export function useAssignmentPage<T extends GenericTarget>(
  serverId: string,
  colonyId: string | undefined,
  allTargets: T[],
  config: AssignmentPageConfig<T>
) {
  const [settlerDialogOpen, setSettlerDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<T | null>(null);
  const [startingTargetKey, setStartingTargetKey] = useState<string | null>(null);
  const [settlerPreviews, setSettlerPreviews] = useState<Record<string, UnifiedPreview>>({});

  const { colony, colonyLoading } = useColony(serverId);
  const queryClient = useQueryClient();
  const { timers, informingAssignments } = useAssignmentNotifications();

  // Get available settlers
  const availableSettlers = useMemo<Settler[]>(() => {
    return colony?.settlers?.filter(settler => settler.status === "idle") ?? [];
  }, [colony?.settlers]);

  // Get available targets
  const availableTargets = useMemo<T[]>(() => {
    return config.getAvailableTargets(allTargets);
  }, [allTargets, config]);

  const settlerIds = availableSettlers.map(s => s._id!);
  const targetIds = availableTargets.map(target => config.getTargetId(target));
  
  // Only for map-exploration
  const coordinates = config.previewType === 'map-exploration' 
    ? availableTargets.map(t => ({ x: t.x!, y: t.y! }))
    : [];

  // Use appropriate batch preview hook
  const assignmentPreviewQuery = useSmartBatchPreviewAssignment(
    colonyId ?? '',
    settlerIds,
    targetIds,
    config.previewType === 'assignment' && !!(colonyId && settlerIds.length > 0 && targetIds.length > 0)
  );

  const mapPreviewQuery = useSmartBatchPreviewMapExploration(
    colonyId ?? '',
    settlerIds,
    coordinates,
    config.previewType === 'map-exploration' && !!(colonyId && settlerIds.length > 0 && coordinates.length > 0)
  );

  // Select the appropriate query data
  const batchPreviewData =
    config.previewType === 'assignment'
      ? assignmentPreviewQuery.data
      : mapPreviewQuery.data;
  const previewsLoading =
    config.previewType === 'assignment'
      ? assignmentPreviewQuery.isLoading
      : mapPreviewQuery.isLoading;
  const previewsError =
    config.previewType === 'assignment'
      ? assignmentPreviewQuery.error
      : mapPreviewQuery.error;

  // Build unified preview data when batch data is available
  useEffect(() => {
    if (!batchPreviewData || !selectedTarget) {
      setSettlerPreviews({});
      return;
    }

    const previews: Record<string, UnifiedPreview> = {};
    const targetKey = config.getTargetKey(selectedTarget);

    availableSettlers.forEach(settler => {
      const settlerPreview =
        batchPreviewData.results[settler._id!]?.[targetKey];
      if (settlerPreview) {
        if (config.previewType === 'assignment') {
          previews[settler._id!] = transformAssignmentPreview(
            settlerPreview as AssignmentPreviewResult
          );
        } else {
          previews[settler._id!] = transformMapExplorationPreview(
            settlerPreview as MapExplorationPreviewResult
          );
        }
      }
    });

    setSettlerPreviews(previews);
  }, [
    batchPreviewData,
    selectedTarget,
    availableSettlers,
    config,
  ]);

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
      let previewDuration: number | undefined;

      if (settlerPreview) {
        if (settlerPreview.type === 'exploration') {
          previewDuration = settlerPreview.estimatedDuration;
        } else {
          previewDuration = settlerPreview.duration;
        }
      }

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
    previewsLoading,
    previewsError,
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
  startAssignment: StartAssignmentMutation
): AssignmentPageConfig<{ _id: string; state: string; dependsOn?: string; taskId?: string }> => ({
  previewType: 'assignment',
  getTargetId: assignment => assignment._id,
  getTargetKey: assignment => assignment._id,
  getAvailableTargets: assignments =>
    assignments?.filter(a =>
      a.state === "available" &&
      (!a.dependsOn ||
        ["informed", "completed"].includes(
          assignments.find(d => d.taskId === a.dependsOn)?.state ?? ""
        ))
    ) || [],
  startAssignment,
});

// Map exploration page configuration
export const createMapExplorationConfig = (
  startExploration: StartAssignmentMutation
): AssignmentPageConfig<{ x: number; y: number }> => ({
  previewType: 'map-exploration',
  getTargetId: coord => `${coord.x}:${coord.y}`,
  getTargetKey: coord => `${coord.x}:${coord.y}`,
  getAvailableTargets: coordinates => coordinates,
  startAssignment: startExploration,
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