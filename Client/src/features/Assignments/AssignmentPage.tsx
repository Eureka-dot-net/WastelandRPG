import  { useState, useEffect } from "react";
import {
  Nature, Build, Restaurant, Science, LocalHospital, Lock
} from "@mui/icons-material";
import {
  Container, Paper, Typography, Grid, Box, Button
} from "@mui/material";
import "react-toastify/dist/ReactToastify.css";

import { useColony } from "../../lib/hooks/useColony";
import { useAssignment } from "../../lib/hooks/useAssignment";
import { useAssignmentNotifications } from "../../lib/hooks/useAssignmentNotifications";
import type { Settler } from "../../lib/types/settler";
import type { Assignment, AssignmentAdjustments } from "../../lib/types/assignment";
import { useQueryClient } from "@tanstack/react-query";
import SettlerSelectorDialog from "../../app/shared/components/settlers/SettlerSelectorDialog";
import TaskCard from "../../app/shared/components/tasks/TaskCard";
import ErrorDisplay from "../../app/shared/components/ui/ErrorDisplay";
import LoadingDisplay from "../../app/shared/components/ui/LoadingDisplay";
import ProgressHeader from "../../app/shared/components/ui/ProgressHeader";
import AssignmentEffectsPreview from "../../app/shared/components/assignments/AssignmentEffectsPreview";


type Props = {
  serverId: string;
}

function AssignmentPage({ serverId = "server-1" }: Props) {
  const [settlerDialogOpen, setSettlerDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    adjustments: AssignmentAdjustments;
    settlerName: string;
    baseDuration: number;
  } | null>(null);

  const { colony, colonyLoading } = useColony(serverId);
  const colonyId = colony?._id;
  const queryClient = useQueryClient();
  const { assignments, loadingAssignment, startAssignment, previewAssignment } = useAssignment(serverId, colonyId);
  
  // Use the simplified notification system
  const { timers, startAssignment: startNotificationTimer } = useAssignmentNotifications();

  useEffect(() => {
    if (colonyId) {
      queryClient.invalidateQueries({ queryKey: ["assignments", colonyId] });
    }
  }, [colonyId, queryClient]);

  const handleAssignClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setSettlerDialogOpen(true);
  };

  const handleSettlerSelect = (settler: Settler) => {
    if (selectedTaskId) {
      // First get the preview
      previewAssignment.mutate(
        { assignmentId: selectedTaskId, settlerId: settler._id },
        {
          onSuccess: (previewResult) => {
            // Show preview data
            setPreviewData({
              adjustments: previewResult.adjustments,
              settlerName: previewResult.settlerName,
              baseDuration: previewResult.baseDuration
            });
          },
          onError: (error) => {
            console.error("Error previewing assignment:", error);
            // If preview fails, still allow assignment but without effects display
            confirmAssignment(settler);
          }
        }
      );
    }
  };

  const confirmAssignment = (settler: Settler) => {
    if (selectedTaskId) {
      startAssignment.mutate(
        { assignmentId: selectedTaskId, settlerId: settler._id },
        {
          onSuccess: (updatedAssignment) => {
            // Start the notification timer
            startNotificationTimer(updatedAssignment);
            setPreviewData(null);
          }
        }
      );
    }
    setSettlerDialogOpen(false);
    setSelectedTaskId(null);
  };

  const cancelAssignment = () => {
    setPreviewData(null);
    setSettlerDialogOpen(false);
    setSelectedTaskId(null);
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
    if (!colony?.settlers) return [];

    // Get settlers who aren't currently assigned to in_progress tasks
    const assignedSettlerIds = assignments
      ?.filter(a => a.state === "in-progress")
      .map(a => a.settlerId)
      .filter(Boolean) || [];

    return colony.settlers.filter(settler => !assignedSettlerIds.includes(settler._id));
  };

  const isDependencyMet = (assignment: Assignment) => {
    if (!assignment.dependsOn) return true;
    const dependentTask = assignments?.find(a => a.taskId === assignment.dependsOn);
    return dependentTask?.state === "informed";
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

  if (colonyLoading || loadingAssignment) {
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

  const completedTasks = assignments.filter(a => a.state === "informed").length;
  const availableSettlers = getAvailableSettlers();

  return (
    <Container maxWidth="lg">

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

      {/* Tasks Grid */}
      <Grid container spacing={3}>
        {assignments.map(assignment => {
          const timeRemaining = timers[assignment._id] || 0;

          // Calculate progress correctly
          let progress = 0;
          if (assignment.state === "in-progress" && assignment.duration) {
            if (assignment.startedAt && timeRemaining > 0) {
              progress = ((assignment.duration - timeRemaining) / assignment.duration) * 100;
            } else if (!assignment.startedAt) {
              progress = 0;
            } else if (timeRemaining <= 0 && Date.now() - new Date(assignment.startedAt).getTime() < assignment.duration) {
              progress = 0;
            } else {
              progress = 100;
            }
          }

          const assignedSettler = assignment.settlerId
            ? colony.settlers.find(s => s._id === assignment.settlerId)
            : null;

          // Determine task states
          const dependencyMet = isDependencyMet(assignment);
          let status: 'available' | 'blocked' | 'in-progress' | 'completed';
          
          if (assignment.state === "informed") {
            status = 'completed';
          } else if (assignment.state === "in-progress") {
            status = 'in-progress';
          } else if (assignment.state === "available" && !dependencyMet) {
            status = 'blocked';
          } else {
            status = 'available';
          }

          // Build actions array
          const actions = [];
          
          if (status === 'available' && dependencyMet && availableSettlers.length > 0) {
            actions.push({
              label: "Assign Settler",
              onClick: () => handleAssignClick(assignment._id),
              variant: 'contained' as const,
              disabled: startAssignment.isPending
            });
          } else if (status === 'available' && dependencyMet && availableSettlers.length === 0) {
            actions.push({
              label: "No Available Settlers",
              onClick: () => {},
              variant: 'outlined' as const,
              disabled: true
            });
          } else if (status === 'blocked') {
            actions.push({
              label: "Dependency Required",
              onClick: () => {},
              variant: 'outlined' as const,
              disabled: true, //this is 265
              startIcon: <Lock fontSize="small" />
            });
          } else if (status === 'in-progress') {
            actions.push({
              label: `In Progress... ${timeRemaining > 0 ? `(${Math.ceil(timeRemaining / 60000)}m)` : "(Finishing...)"}`,
              onClick: () => {},
              variant: 'outlined' as const,
              disabled: true
            });
          } else if (status === 'completed') {
            actions.push({
              label: "✓ Completed",
              onClick: () => {},
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
            <Grid size={{ xs: 12, md: 6 }} key={assignment._id}>
              <TaskCard
                id={assignment._id}
                name={assignment.name}
                description={assignment.description}
                icon={getRewardIcon(Object.keys(assignment.plannedRewards || {})[0] || "scrap")}
                status={status}
                progress={progress}
                timeRemaining={timeRemaining}
                assignedEntityName={assignedSettler?.name}
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

      {/* Effects Preview */}
      {previewData && (
        <Box sx={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1300, width: '90%', maxWidth: 600 }}>
          <Paper elevation={8} sx={{ p: 3 }}>
            <AssignmentEffectsPreview
              adjustments={previewData.adjustments}
              settlerName={previewData.settlerName}
              baseDuration={previewData.baseDuration}
            />
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={cancelAssignment} disabled={startAssignment.isPending}>
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={() => {
                  const selectedSettler = availableSettlers.find(s => s.name === previewData.settlerName);
                  if (selectedSettler) confirmAssignment(selectedSettler);
                }}
                disabled={startAssignment.isPending}
              >
                {startAssignment.isPending ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Settler Selection Dialog */}
      <SettlerSelectorDialog
        open={settlerDialogOpen}
        onClose={() => setSettlerDialogOpen(false)}
        onSelect={handleSettlerSelect}
        settlers={availableSettlers}
        title="Select Settler to Assign"
        emptyStateMessage="No available settlers"
        emptyStateSubMessage="All settlers are currently assigned to other tasks."
        showSkills={true}
        showStats={false}
      />

      {/* Task Queue Placeholder */}
      <Paper elevation={2} sx={{ p: 3, mt: 4, opacity: 0.6 }}>
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

export default AssignmentPage;