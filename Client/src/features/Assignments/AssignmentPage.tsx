import { useState, useEffect } from "react";
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
import type { Settler } from "../../lib/types/settler";
import type { Assignment } from "../../lib/types/assignment";
import { useQueryClient } from "@tanstack/react-query";
import SettlerSelectorDialog from "../../app/shared/components/settlers/SettlerSelectorDialog";
import TaskCard from "../../app/shared/components/tasks/TaskCard";
import ErrorDisplay from "../../app/shared/components/ui/ErrorDisplay";
import LoadingDisplay from "../../app/shared/components/ui/LoadingDisplay";
import ProgressHeader from "../../app/shared/components/ui/ProgressHeader";
import { useServerContext } from "../../lib/contexts/ServerContext";
import { formatTimeRemaining } from "../../lib/utils/timeUtils";
import { agent } from "../../lib/api/agent";
import LatestEventCard from "../../components/events/LatestEventCard";

function AssignmentPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentServerId: serverId } = useServerContext();
  const [settlerDialogOpen, setSettlerDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Assignment | null>(null);
  const [startingAssignmentId, setStartingAssignmentId] = useState<string | null>(null);

  const { colony, colonyLoading } = useColony(serverId);
  const colonyId = colony?._id;
  const queryClient = useQueryClient();
  const { assignments, loadingAssignment, startAssignment } = useAssignment(serverId, colonyId, { type: ['general'] });

  // Use the simplified notification system
  const { timers, startAssignment: startNotificationTimer } = useAssignmentNotifications();

  useEffect(() => { //This can stay. If a colony changes then we do want to invalidate the queries
    if (colonyId) {
      queryClient.invalidateQueries({ queryKey: ["assignments", colonyId] });
    }
  }, [colonyId, queryClient]);
  

useEffect(() => {
  if (!colonyId || !assignments || !colony?.settlers) return;

  // 1️⃣ Get settlers who aren't assigned to in-progress tasks
  const availableSettlers = colony.settlers.filter(
    settler => !assignments.some(a => a.state === "in-progress" && a.settlerId === settler._id)
  );

  if (availableSettlers.length === 0) return;

  // 2️⃣ Get assignments that are available and dependency-met
  const availableAssignments = assignments.filter(a =>
    a.state === "available" &&
    (!a.dependsOn || ["informed", "completed"].includes(
      assignments.find(d => d.taskId === a.dependsOn)?.state ?? ""
    ))
  );

  if (availableAssignments.length === 0) return;

  // 3️⃣ Prefetch all combinations of available assignments × available settlers
  availableAssignments.forEach(a => {
    availableSettlers.forEach(s => {
      queryClient.prefetchQuery({
        queryKey: ["assignmentPreview", colonyId, a._id, s._id],
        queryFn: async () => {
          const response = await agent.get(
            `/colonies/${colonyId}/assignments/${a._id}/preview?settlerId=${s._id}`
          );
          return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
      }).catch(err => {
        console.warn(`Failed to prefetch preview for assignment ${a._id} and settler ${s._id}:`, err);
      });
    });
  });

  console.log(
    `Prefetching ${availableAssignments.length * availableSettlers.length} assignment previews`
  );
}, [colonyId, assignments, colony?.settlers, queryClient]);

  // Invalidate assignment queries when colony changes to ensure fresh data
  useEffect(() => {
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
  const availableSettlers = getAvailableSettlers();

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
          // Determine time remaining and calculate progress
          let timeRemaining: number | undefined;
          let progress = 0;
          
          if (assignment.state === 'in-progress') {
            // For in-progress assignments, calculate both timeRemaining and progress
            if (assignment.completedAt && assignment.duration) {
              // Calculate directly from completion time for immediate feedback
              const now = Date.now();
              const completionTime = new Date(assignment.completedAt).getTime();
              const calculatedTimeRemaining = completionTime - now;
              
              if (calculatedTimeRemaining > 0) {
                timeRemaining = calculatedTimeRemaining;
                progress = ((assignment.duration - calculatedTimeRemaining) / assignment.duration) * 100;
              } else {
                timeRemaining = 0;
                progress = 100;
              }
            } else {
              // Fallback to timer context if completedAt not available
              timeRemaining = timers[assignment._id];
              if (timeRemaining != null && assignment.duration) {
                progress = ((assignment.duration - timeRemaining) / assignment.duration) * 100;
              }
            }
            progress = Math.max(0, Math.min(100, progress)); // clamp between 0-100
          } else if (assignment.state === 'completed' || assignment.state === 'informed') {
            timeRemaining = 0;
            progress = 100;
          } else {
            timeRemaining = undefined;
            progress = 0;
          }

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
          if (status === 'available' && dependencyMet && availableSettlers.length > 0) {
            actions.push({
              label: "Assign Settler",
              onClick: () => handleAssignClick(assignment._id),
              variant: 'contained' as const,
              disabled: startingAssignmentId === assignment._id
            });
          } else if (status === 'available' && dependencyMet && availableSettlers.length === 0) {
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
        settlers={availableSettlers}
        selectedTask={selectedTask}
        title={`Assign Settler to: ${selectedTask?.name || ''}`}
        emptyStateMessage="No available settlers"
        emptyStateSubMessage="All settlers are currently assigned to other tasks."
        showSkills={true}
        colonyId={colonyId}
        showStats={false}
        confirmPending={startAssignment.isPending}
        
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

export default AssignmentPage;
