import {
  Nature, Build, Restaurant, Science, LocalHospital, Lock
} from "@mui/icons-material";
import {
  Container, Paper, Typography, Grid, useTheme, useMediaQuery
} from "@mui/material";
import { useMemo } from "react";
import "react-toastify/dist/ReactToastify.css";

import { useAssignment } from "../../lib/hooks/useAssignment";
import { useAssignmentPage, createQuestPageConfig } from "../../lib/hooks/useAssignmentPage";
import { useColony } from "../../lib/hooks/useColony";
import type { Assignment } from "../../lib/types/assignment";
import SettlerSelectorDialog from "../../app/shared/components/settlers/SettlerSelectorDialog";
import TaskCard from "../../app/shared/components/tasks/TaskCard";
import ErrorDisplay from "../../app/shared/components/ui/ErrorDisplay";
import LoadingDisplay from "../../app/shared/components/ui/LoadingDisplay";
import ProgressHeader from "../../app/shared/components/ui/ProgressHeader";
import { useServerContext } from "../../lib/contexts/ServerContext";
import { formatTimeRemaining } from "../../lib/utils/timeUtils";
import LatestEventCard from "../../components/events/LatestEventCard";

function QuestPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentServerId: serverId } = useServerContext();
  
  const { colony } = useColony(serverId);

  // Get assignments with colony id from colony
  const { assignments, loadingAssignment, startAssignment } = useAssignment(serverId, colony?._id, { type: ['quest'] });

  // Create a wrapper for the mutation to match StartAssignmentMutation interface
  const startAssignmentWrapper = useMemo(() => ({
    mutate: (params: Record<string, unknown>, options?: { onSettled?: () => void }) => {
      const { assignmentId, settlerId } = params;
      startAssignment.mutate(
        { assignmentId: assignmentId as string, settlerId: settlerId as string },
        options
      );
    },
    isPending: startAssignment.isPending,
  }), [startAssignment]);

  // Create configuration for useAssignmentPage hook - memoized to prevent infinite loops
  const config = useMemo(() => createQuestPageConfig(startAssignmentWrapper, assignments || []), [startAssignmentWrapper, assignments]);

  // Use the common assignment page hook
  const {
    colony: assignmentPageColony,
    colonyLoading,
    availableSettlers,
    handleTargetSelect: handleAssignClick,
    handleSettlerSelect,
    handleDialogClose,
    settlerDialogOpen,
    selectedTarget: selectedTask,
    settlerPreviews,
    previewsLoading,
    previewsError,
    isTargetStarting,
    getTargetTimeRemaining,
    isTargetInforming,
  } = useAssignmentPage(serverId || '', assignments || [], config);

  // Use both colony sources for display - prefer assignmentPageColony for consistency
  const displayColony = assignmentPageColony || colony;


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

  if (!assignments || !displayColony) {
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
  const latestEvent = displayColony.logs && displayColony.logs.length > 0
    ? [...displayColony.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
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
            timeRemaining = getTargetTimeRemaining(assignment._id);
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
            ? displayColony?.settlers?.find(s => s._id === assignment.settlerId)
            : null;

          // Determine task status
          const dependencyMet = isDependencyMet(assignment);
          let status: 'available' | 'blocked' | 'in-progress' | 'completed' | 'starting' | 'unloading';

          if (assignment.state === 'completed' || assignment.state === 'informed') {
            status = 'completed';
          } else if (assignment.state === 'in-progress') {
            // Check if this assignment is being informed (unloading)
            if (isTargetInforming(assignment._id)) {
              status = 'unloading';
            } else {
              status = 'in-progress';
            }
          } else if (isTargetStarting(assignment)) {
            status = 'starting';
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
              onClick: () => handleAssignClick(assignment),
              variant: 'contained' as const,
              disabled: isTargetStarting(assignment)
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
          } else if (status === 'starting') {
            actions.push({
              label: "Gathering gear...",
              onClick: () => { },
              variant: 'outlined' as const,
              color: 'warning' as const,
              disabled: true
            });
          } else if (status === 'unloading') {
            actions.push({
              label: "Unloading inventory...",
              onClick: () => { },
              variant: 'outlined' as const,
              color: 'info' as const,
              disabled: true
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
        onClose={handleDialogClose}
        onSelect={handleSettlerSelect}
        settlers={availableSettlers}
        title={`Assign Settler to: ${(selectedTask as Assignment)?.name || ''}`}
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