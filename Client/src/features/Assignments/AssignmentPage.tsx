import {
  Nature, Build, Restaurant, Science, LocalHospital, CheckCircle, Assignment as AssignmentIcon, Timer, Lock, Launch
} from "@mui/icons-material";
import {
  Container, Paper, Typography, Alert, Box, LinearProgress, Avatar, Chip, Grid, Card, CardContent, Divider,
  CardActions, Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Link
} from "@mui/material";
import { useState, useEffect } from "react";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { useColony } from "../../lib/hooks/useColony";
import { useAssignment } from "../../lib/hooks/useAssignment";
import type { Settler } from "../../lib/types/settler";
import { useQueryClient } from "@tanstack/react-query";
import type { Assignment } from "../../lib/types/assignment";


type Props = {
  serverId: string;
}

function AssignmentPage({ serverId = "server-1" }: Props) {
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});
  const [settlerDialogOpen, setSettlerDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { colony, colonyLoading, refetch: refetchColony } = useColony(serverId);

  const colonyId = colony?._id;

  const queryClient = useQueryClient();
  const { assignments, loadingAssignment, startAssignment, refetch: refetchAssignments } = useAssignment(serverId, colonyId);

  useEffect(() => {
    if (colonyId) {
      queryClient.invalidateQueries({ queryKey: ["assignments", colonyId] });
    }
  }, [colonyId, queryClient]);

  // Timer effect - improved logic
  useEffect(() => {
    if (!assignments) return;

    const intervalIds: number[] = [];

    // Set up timers for all active assignments
    Object.entries(activeTimers).forEach(([assignmentId, timeRemaining]) => {
      if (timeRemaining > 0) {
        const intervalId = setInterval(() => {
          setActiveTimers(prev => {
            const newTimeRemaining = Math.max((prev[assignmentId] || 0) - 1000, 0);

            // If timer just hit zero, trigger completion check
            if (newTimeRemaining === 0 && prev[assignmentId] > 0) {
              // Use setTimeout to avoid state update during render
              setTimeout(() => {

                handleTaskCompletion(assignmentId);
              }, 100);
            }

            return {
              ...prev,
              [assignmentId]: newTimeRemaining
            };
          });
        }, 1000);

        intervalIds.push(intervalId);
      }
    });

    return () => {
      intervalIds.forEach(clearInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimers]);

  const handleTaskCompletion = async (assignmentId: string) => {
    try {

      // Remove the timer for this assignment
      setActiveTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[assignmentId];
        return newTimers;
      });
      const assignment = assignments?.find(a => a._id === assignmentId);
      if (assignment?.state === "in-progress") {
        queryClient.setQueryData<Assignment[]>(["assignments", colonyId], (old) =>
          old?.map(a => a._id === assignmentId ? { ...a, state: "completed" } : a) ?? []
        );
      }

    } catch (error) {
      console.error("Error notifying server about task completion:", error);

      // Fallback: refetch everything to resync state
      await refetchAssignments();
      await refetchColony();

      setActiveTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[assignmentId];
        return newTimers;
      });
    }
  };

  const handleAssignClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setSettlerDialogOpen(true);
  };

  const handleSettlerSelect = (settler: Settler) => {
    if (selectedTaskId) {
      startAssignment.mutate(
        { assignmentId: selectedTaskId, settlerId: settler._id },
        {
          onSuccess: (updatedAssignment) => {
            console.log("starting timer: ", updatedAssignment.duration);
            // Start timer for this assignment
            setActiveTimers(prev => ({
              ...prev,
              [updatedAssignment._id]: updatedAssignment.duration
            }));
          }
        }
      );
    }
    setSettlerDialogOpen(false);
    setSelectedTaskId(null);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "scrap": return <Build />;
      case "wood": return <Nature />;
      case "food": return <Restaurant />;
      case "electronics": return <Science />;
      case "medicine": return <LocalHospital />;
      case "carrot_seeds": return <Nature />;
      case "map": return <Science />;
      case "metal": return <Build />;
      default: return <Build />;
    }
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

  // Check if a task's dependencies are met
  const isDependencyMet = (assignment: Assignment) => {
    if (!assignment.dependsOn) return true;

    const dependentTask = assignments?.find(a => a.taskId === assignment.dependsOn);
    return dependentTask?.state === "informed";
  };

  // Get navigation link for unlocked functionality
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
      <Container maxWidth="lg" sx={{ mt: 20, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!assignments || !colony) {
    return (
      <Container maxWidth="lg" sx={{ mt: 20 }}>
        <Alert severity="error">Failed to load assignment data</Alert>
      </Container>
    );
  }

  const completedTasks = assignments.filter(a => a.state === "informed").length;
  const availableSettlers = getAvailableSettlers();

  return (
    <Container maxWidth="lg" >
      <ToastContainer />

      {/* Welcome / Progress */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, bgcolor: 'rgba(211, 47, 47, 0.1)', border: '1px solid rgba(211, 47, 47, 0.3)' }}>
        <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>🏚️ Homestead Cleanup</Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Your camp is overrun with debris. Assign settlers to tasks to restore it.
        </Alert>
        <Box sx={{ mt: 3 }}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">Cleanup Progress</Typography>
            <Typography variant="body2" color="text.secondary">{completedTasks}/{assignments.length} tasks completed</Typography>
          </Box>
          <LinearProgress variant="determinate" value={(completedTasks / assignments.length) * 100} color="secondary" sx={{ height: 8, borderRadius: 4 }} />
        </Box>
      </Paper>

      {/* Tasks Grid */}
      <Grid container spacing={3}>
        {assignments.map(assignment => {
          const timeRemaining = activeTimers[assignment._id] || 0;

          // Calculate progress correctly: 0% at start, 100% when complete
          let progress = 0;
          if (assignment.state === "in-progress" && assignment.duration) {
            if (timeRemaining > 0) {
              // Timer is active - calculate based on remaining time
              progress = ((assignment.duration - timeRemaining) / assignment.duration) * 100;
            } else {
              // Timer finished but assignment might not be updated yet
              progress = 100;
            }
          }

          const assignedSettler = assignment.settlerId
            ? colony.settlers.find(s => s._id === assignment.settlerId)
            : null;

          // Determine task states
          const isAvailable = assignment.state === "available";
          const isInProgress = assignment.state === "in-progress";
          const isCompleted = assignment.state === "informed";
          const dependencyMet = isDependencyMet(assignment);
          const isBlocked = isAvailable && !dependencyMet;

          return (
            <Grid size={{ xs: 12, md: 6 }} key={assignment._id}>
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                opacity: isCompleted ? 0.7 : (isBlocked ? 0.5 : 1),
                border: isInProgress ? '2px solid #4caf50' : (isBlocked ? '1px solid #666' : '1px solid #333'),
              }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {isBlocked && <Lock color="disabled" fontSize="small" />}
                      {getRewardIcon(Object.keys(assignment.plannedRewards || {})[0] || "scrap")}
                      <Typography variant="h6">{assignment.name}</Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                      {assignment.unlocks && assignment.unlocks.length > 0 && (
                        <Chip size="small" label={`Unlocks: ${assignment.unlocks}`} variant="outlined" />
                      )}
                      {isCompleted && <CheckCircle color="success" />}
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {assignment.description}
                  </Typography>

                  {/* Show dependency message if blocked */}
                  {isBlocked && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Requires completion of: {assignments?.find(a => a.taskId === assignment.dependsOn)?.name || assignment.dependsOn}
                      </Typography>
                    </Alert>
                  )}

                  {/* Show completion message and unlock button */}
                  {isCompleted && assignment.completionMessage && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="success.main" sx={{ fontStyle: 'italic', mb: 2 }}>
                        {assignment.completionMessage}
                      </Typography>
                      {assignment.unlocks && (
                        <Button
                          variant="outlined"
                          color="success"
                          startIcon={<Launch />}
                          component={Link}
                          href={getUnlockLink(assignment.unlocks)}
                          sx={{ mb: 1 }}
                        >
                          Go to {assignment.unlocks.charAt(0).toUpperCase() + assignment.unlocks.slice(1)}
                        </Button>
                      )}
                    </Box>
                  )}

                  {isInProgress && assignedSettler && (
                    <Box sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" color="secondary.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AssignmentIcon fontSize="small" /> {assignedSettler.name} is working...
                        </Typography>
                        <Typography variant="body2" color="secondary.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Timer fontSize="small" /> {timeRemaining > 0 ? formatTime(timeRemaining) : "Finishing..."}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(progress, 100)}
                        color="secondary"
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ p: 2 }}>
                  {isAvailable && dependencyMet && availableSettlers.length > 0 && (
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => handleAssignClick(assignment._id)}
                      sx={{ fontWeight: 600 }}
                      disabled={startAssignment.isPending}
                    >
                      Assign Settler
                    </Button>
                  )}
                  {isAvailable && dependencyMet && availableSettlers.length === 0 && (
                    <Button variant="outlined" fullWidth disabled sx={{ fontWeight: 600 }}>
                      No Available Settlers
                    </Button>
                  )}
                  {isBlocked && (
                    <Button variant="outlined" fullWidth disabled sx={{ fontWeight: 600 }}>
                      <Lock fontSize="small" sx={{ mr: 1 }} />
                      Dependency Required
                    </Button>
                  )}
                  {isInProgress && (
                    <Button variant="outlined" fullWidth disabled sx={{ fontWeight: 600 }}>
                      In Progress... {timeRemaining > 0 ? `(${formatTime(timeRemaining)})` : "(Finishing...)"}
                    </Button>
                  )}
                  {isCompleted && (
                    <Button variant="outlined" fullWidth disabled color="success" sx={{ fontWeight: 600 }}>
                      ✓ Completed
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Settler Selection Dialog */}
      <Dialog
        open={settlerDialogOpen}
        onClose={() => setSettlerDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'background.paper', border: '1px solid #333' }
        }}
      >
        <DialogTitle sx={{ color: 'primary.main', pb: 1 }}>
          Select Settler to Assign
        </DialogTitle>
        <DialogContent sx={{ pt: 2, maxHeight: '60vh', overflowY: 'auto' }}>
          <Box display="flex" flexDirection="column" gap={2}>
            {availableSettlers.map((settler, index) => {
              // Generate different colors for each settler
              const avatarColors = ['primary.main', 'secondary.main', 'success.main', 'warning.main', 'info.main', 'error.main'];
              const avatarColor = avatarColors[index % avatarColors.length];

              return (
                <Card
                  key={settler._id}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid #333',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => handleSettlerSelect(settler)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Avatar
                        sx={{
                          bgcolor: avatarColor,
                          width: 48,
                          height: 48,
                          fontSize: '1.25rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {settler.name.charAt(0)}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                          {settler.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          {settler.backstory}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                      Skills:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {Object.entries(settler.skills).map(([skill, level]) => (
                        <Chip
                          key={skill}
                          size="small"
                          label={`${skill}: ${level}`}
                          variant="filled"
                          color="secondary"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {availableSettlers.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No available settlers
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                All settlers are currently assigned to other tasks.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettlerDialogOpen(false)} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Queue Placeholder */}
      <Paper elevation={2} sx={{ p: 3, mt: 4, opacity: 0.6 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon color="secondary" /> Task Queue (Coming Soon)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Future feature: Queue multiple tasks for settlers and manage complex work schedules.
        </Typography>
      </Paper>
    </Container>
  );
};

export default AssignmentPage;