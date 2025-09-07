import { useState, useEffect, useMemo } from "react";
import {
  Nature, Build, Restaurant, Science, LocalHospital, Lock
} from "@mui/icons-material";
import {
  Container, Paper, Typography, Grid, useTheme, useMediaQuery
} from "@mui/material";
import "react-toastify/dist/ReactToastify.css";

import { useColony } from "../../lib/hooks/useColony";
import { useAssignment } from "../../lib/hooks/useAssignment";
import { useAssignmentNotifications } from "../../lib/hooks/useAssignmentNotifications";
import { useSmartBatchPreviewAssignment } from "../../lib/hooks/useSmartBatchPreview";
import type { Settler } from "../../lib/types/settler";
import type { Assignment } from "../../lib/types/assignment";
import type { UnifiedPreview } from "../../lib/types/preview";
import { useQueryClient } from "@tanstack/react-query";
import SettlerSelectorDialog from "../../app/shared/components/settlers/SettlerSelectorDialog";
import TaskCard from "../../app/shared/components/tasks/TaskCard";
import ErrorDisplay from "../../app/shared/components/ui/ErrorDisplay";
import LoadingDisplay from "../../app/shared/components/ui/LoadingDisplay";
import ProgressHeader from "../../app/shared/components/ui/ProgressHeader";
import { useServerContext } from "../../lib/contexts/ServerContext";
import { formatTimeRemaining } from "../../lib/utils/timeUtils";
import { transformAssignmentPreview } from "../../lib/utils/previewTransformers";
import LatestEventCard from "../../components/events/LatestEventCard";

function QuestPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentServerId: serverId } = useServerContext();
  const [settlerDialogOpen, setSettlerDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Assignment | null>(null);
  const [startingAssignmentId, setStartingAssignmentId] = useState<string | null>(null);
  const [settlerPreviews, setSettlerPreviews] = useState<Record<string, UnifiedPreview>>({});

  const { colony, colonyLoading } = useColony(serverId);
  const colonyId = colony?._id;
  const queryClient = useQueryClient();
  const { assignments, loadingAssignment, startAssignment } = useAssignment(serverId, colonyId, { type: ['quest'] });

  // Use the simplified notification system
  const { timers, startAssignment: startNotificationTimer } = useAssignmentNotifications();

  // Get available settlers and assignments for batch preview
  const availableSettlers = useMemo(() => {
    return colony?.settlers?.filter(
      settler => settler.status === "idle"
    ) || [];
  }, [colony?.settlers]);

  const availableAssignments = useMemo(() => {
    return assignments?.filter(a =>
      a.state === "available" &&
      (!a.dependsOn || ["informed", "completed"].includes(
        assignments.find(d => d.taskId === a.dependsOn)?.state ?? ""
      ))
    ) || [];
  }, [assignments]);

  // Use smart batch preview hook - always prefetch all available assignments
  const settlerIds = availableSettlers.map(s => s._id);
  const assignmentIds = availableAssignments.map(a => a._id);
  
  const { data: batchPreviewData, isLoading: previewsLoading, error: previewsError } = useSmartBatchPreviewAssignment(
    colonyId || '',
    settlerIds,
    assignmentIds,
    !!(colonyId && settlerIds.length > 0 && assignmentIds.length > 0)
  );

  // Build unified preview data when batch data is available
  useEffect(() => {
    if (!batchPreviewData || !selectedTask) return;
    
    const previews: Record<string, UnifiedPreview> = {};
    const assignmentId = selectedTask._id;
    
    // Build preview for each available settler with the selected task
    availableSettlers.forEach(settler => {
      const settlerPreview = batchPreviewData.results[settler._id]?.[assignmentId];
      if (settlerPreview) {
        previews[settler._id] = transformAssignmentPreview(settlerPreview);
      }
    });
    
    setSettlerPreviews(previews);
  }, [batchPreviewData, selectedTask, availableSettlers]);

  useEffect(() => { //This can stay. If a colony changes then we do want to invalidate the queries
    if (colonyId) {
      queryClient.invalidateQueries({ queryKey: ["assignments", colonyId] });
    }
  }, [colonyId, queryClient]);

  const handleAssignClick = (taskId: string) => {
    const task = assignments?.find(a => a._id === taskId);
    if (task) {
      setSelectedTask(task);
      setSettlerDialogOpen(true);
    }
  };

  const handleSettlerSelect = (settler: Settler) => {
    if (selectedTask) {
      setStartingAssignmentId(selectedTask._id);
      startAssignment.mutate(
        { assignmentId: selectedTask._id, settlerId: settler._id },
        {
          onSuccess: (updatedAssignment) => {
            // Start the notification timer
            startNotificationTimer(updatedAssignment);
          }
        }
      );
    }
    setSettlerDialogOpen(false);
    setSelectedTask(null);
  };


  const getRewardIcon = (type: string) => {
    const icons = {
      scrap: <Build />,
      wood: <Nature />,
      food: <Restaurant />,
      electronics: <Science />,
      medicine: <LocalHospital />,
      carrot_seeds: <Nature />,
      map: <Science />,
      metal: <Build />
    };
    return icons[type as keyof typeof icons] || <Build />;
  };

  const getAvailableSettlers = () => {
    return availableSettlers;
  };

  const isDependencyMet = (assignment: Assignment) => {
    if (!assignment.dependsOn) return true;
    const dependentTask = assignments?.find(a => a.taskId === assignment.dependsOn);
    return dependentTask?.state === "informed" || dependentTask?.state === "completed";
  };

  const getUnlockLink = (unlocks: string) => {
    const linkMap: Record<string, string> = {
      'homestead': '/homestead',
      'sleepingQuarters': '/sleeping-quarters',
      'farming': '/farming',
      'map': '/map',
      'crafting': '/crafting',
      'defence': '/defence'
    };
    return linkMap[unlocks] || `/${unlocks}`;
  };

  if (colonyLoading || loadingAssignment || !serverId) {
    return (
      <LoadingDisplay
        showContainer={true}
        minHeight="100vh"
        size={80}
      />
    );
  }

  if (!assignments || !colony) {
    return (
      <ErrorDisplay
        error="Failed to load assignment data"
        showContainer={true}
      />
    );
  }

  const completedTasks = assignments.filter(a => a.state === "informed" || a.state === "completed").length;
  const availableSettlersForDisplay = getAvailableSettlers();

  // Get the latest event for display
  const latestEvent = colony.logs && colony.logs.length > 0
    ? [...colony.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null;

  return (
    <Container maxWidth="lg" sx={{ px: isMobile ? 0 : 2 }}>
      <ProgressHeader
        title="Homestead Cleanup"
        emoji="🏚️"
        alertMessage="Your camp is overrun with debris. Assign settlers to tasks to restore it."
        alertSeverity="warning"
        progressLabel="Cleanup Progress"
        currentValue={completedTasks}
        totalValue={assignments.length}
        progressColor="secondary"
      />

      {/* Latest Event Card */}
      <LatestEventCard event={latestEvent} />

      {/* Tasks Grid */}
      <Grid container spacing={isMobile ? 1.5 : 3}>
        {assignments.map(assignment => {
          // Determine time remaining
          let timeRemaining: number | undefined;
          if (assignment.state === 'in-progress') {
            timeRemaining = timers[assignment._id];
          } else if (assignment.state === 'completed' || assignment.state === 'informed') {
            timeRemaining = 0;
          } else {
            timeRemaining = undefined;
          }

          // Calculate progress
          const progress = assignment.adjustments?.adjustedDuration && timeRemaining != null
            ? Math.max(0, Math.min(100, ((assignment.adjustments.adjustedDuration - timeRemaining) / assignment.adjustments.adjustedDuration) * 100))
            : assignment.state === 'completed' || assignment.state === 'informed'
              ? 100
              : 0;

          const assignedSettler = assignment.settlerId
            ? colony.settlers.find(s => s._id === assignment.settlerId)
            : null;

          // Determine task status
          const dependencyMet = isDependencyMet(assignment);
          let status: 'available' | 'blocked' | 'in-progress' | 'completed';

          if (assignment.state === 'completed' || assignment.state === 'informed') {
            status = 'completed';
          } else if (assignment.state === 'in-progress') {
            status = 'in-progress';
          } else if (assignment.state === 'available' && !dependencyMet) {
            status = 'blocked';
          } else {
            status = 'available';
          }

          // Build actions array
          const actions = [];
          if (status === 'available' && dependencyMet && availableSettlersForDisplay.length > 0) {
            actions.push({
              label: "Assign Settler",
              onClick: () => handleAssignClick(assignment._id),
              variant: 'contained' as const,
              disabled: startingAssignmentId === assignment._id
            });
          } else if (status === 'available' && dependencyMet && availableSettlersForDisplay.length === 0) {
            actions.push({
              label: "No Available Settlers",
              onClick: () => { },
              variant: 'outlined' as const,
              disabled: true
            });
          } else if (status === 'blocked') {
            actions.push({
              label: "Dependency Required",
              onClick: () => { },
              variant: 'outlined' as const,
              disabled: true,
              startIcon: <Lock fontSize="small" />
            });
          } else if (status === 'in-progress') {
            let label = "In Progress...";
            if (timeRemaining == null) {
              label = "Starting...";
            } else if (timeRemaining > 0) {
              label = `In Progress... (${formatTimeRemaining(timeRemaining)})`;
            } else {
              label = "Finishing...";
            }

            actions.push({
              label,
              onClick: () => { },
              variant: 'outlined' as const,
              disabled: true
            });
          } else if (status === 'completed') {
            actions.push({
              label: "✓ Completed",
              onClick: () => { },
              variant: 'outlined' as const,
              color: 'success' as const,
              disabled: true
            });
          }

          // Build chips array
          const chips = [];
          if (assignment.unlocks && assignment.unlocks.length > 0) {
            chips.push({
              label: `Unlocks: ${assignment.unlocks}`,
              variant: 'outlined' as const
            });
          }

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={assignment._id}>
              <TaskCard
                id={assignment._id}
                name={assignment.name}
                description={assignment.description}
                icon={getRewardIcon(Object.keys(assignment.plannedRewards || {})[0] || "scrap")}
                status={status}
                progress={progress}
                timeRemaining={timeRemaining}
                assignedEntityName={assignedSettler?.name}
                assignedSettler={assignedSettler || undefined}
                completionMessage={assignment.completionMessage}
                unlocks={assignment.unlocks}
                unlockLink={assignment.unlocks ? getUnlockLink(assignment.unlocks) : undefined}
                blockingReason={status === 'blocked' ? `Requires completion of: ${assignments?.find(a => a.taskId === assignment.dependsOn)?.name || assignment.dependsOn}` : undefined}
                chips={chips}
                actions={actions}
              />
            </Grid>
          );
        })}
      </Grid>


      {/* Enhanced Settler Selection Dialog with Assignment Effects */}
      <SettlerSelectorDialog
        open={settlerDialogOpen}
        onClose={() => setSettlerDialogOpen(false)}
        onSelect={handleSettlerSelect}
        settlers={availableSettlersForDisplay}
        title={`Assign Settler to: ${selectedTask?.name || ''}`}
        emptyStateMessage="No available settlers"
        emptyStateSubMessage="All settlers are currently assigned to other tasks."
        showSkills={true}
        showStats={false}
        confirmPending={startAssignment.isPending}
        settlerPreviews={settlerPreviews}
        previewsLoading={previewsLoading}
        previewsError={previewsError}
      />

      {/* Task Queue Placeholder */}
      <Paper elevation={2} sx={{ p: isMobile ? 2 : 3, mt: isMobile ? 2 : 4, opacity: 0.6 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Science color="secondary" /> Task Queue (Coming Soon)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Future feature: Queue multiple tasks for settlers and manage complex work schedules.
        </Typography>
      </Paper>
    </Container>
  );
};

export default QuestPage;
