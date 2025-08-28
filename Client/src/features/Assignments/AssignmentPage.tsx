import {
  Nature, Build, Restaurant, Science, LocalHospital, CheckCircle, Assignment as AssignmentIcon, Timer
} from "@mui/icons-material";
import {
  Container, Paper, Typography, Alert, Box, LinearProgress, Avatar, Chip, Grid, Card, CardContent, Divider,
  CardActions, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton,
  ListItemAvatar, CircularProgress
} from "@mui/material";
import { useState, useEffect } from "react";
import "react-toastify/dist/ReactToastify.css";
import { showTaskCompletionToast } from "../../app/shared/components/toast/toastHelpers";
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
  const { data: assignments, loadingAssignment, startAssignment, refetch: refetchAssignments } = useAssignment(colonyId);

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
  }, [activeTimers]);

  const handleTaskCompletion = async (assignmentId: string) => {
    try {
      // Refetch assignments to get the latest state
      await refetchAssignments();

      await refetchColony();

      // Get the updated assignment data
      const updatedAssignments = queryClient.getQueryData<Assignment[]>([
        "assignments",
        colony?._id,
      ]);

      const assignment = updatedAssignments?.find(a => a._id === assignmentId);

      if (assignment?.state === "completed") {
        const settler = colony?.settlers.find(s => s._id === assignment.settlerId);
        if (settler && assignment.plannedRewards) {
          const rewards: Record<string, number> = {};
          Object.entries(assignment.plannedRewards).forEach(([key, reward]) => {
            rewards[key] = reward.amount;
          });

          showTaskCompletionToast(
            { name: assignment.name, purpose: assignment.description },
            { name: settler.name },
            rewards
          );
        }
      }

      // Remove the timer for this assignment
      setActiveTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[assignmentId];
        return newTimers;
      });
    } catch (error) {
      console.error("Error handling task completion:", error);
      // Remove timer even if there's an error to prevent infinite loops
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

  const completedTasks = assignments.filter(a => a.state === "completed").length;
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

          // Determine if task is available (not blocked by dependencies)
          const isAvailable = assignment.state === "available";
          const isInProgress = assignment.state === "in-progress";
          const isCompleted = assignment.state === "completed";

          return (
            <Grid size={{ xs: 12, md: 6 }} key={assignment._id}>
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                opacity: isCompleted ? 0.7 : 1,
                border: isInProgress ? '2px solid #4caf50' : '1px solid #333',
              }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getRewardIcon(Object.keys(assignment.plannedRewards || {})[0] || "scrap")}
                      <Typography variant="h6">{assignment.name}</Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                      {assignment.unlocks && assignment.unlocks.length > 0 && (
                        <Chip size="small" label={`Unlocks: ${assignment.unlocks.join(", ")}`} variant="outlined" />
                      )}
                      {isCompleted && <CheckCircle color="success" />}
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {assignment.description}
                  </Typography>

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

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom color="text.secondary">Rewards:</Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {assignment.plannedRewards && Object.entries(assignment.plannedRewards).map(([type, reward]) => (
                      <Chip key={type} size="small" icon={getRewardIcon(type)} label={`${reward.amount} ${reward.name}`} variant="outlined"
                        sx={{ color: '#ffc107', borderColor: '#ffc107' }} />
                    ))}
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2 }}>
                  {isAvailable && availableSettlers.length > 0 && (
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
                  {isAvailable && availableSettlers.length === 0 && (
                    <Button variant="outlined" fullWidth disabled sx={{ fontWeight: 600 }}>
                      No Available Settlers
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
        <DialogTitle sx={{ color: 'primary.main' }}>
          Select Settler to Assign
        </DialogTitle>
        <DialogContent>
          <List>
            {availableSettlers.map(settler => (
              <ListItem key={settler._id} disablePadding>
                <ListItemButton
                  onClick={() => handleSettlerSelect(settler)}
                  sx={{ borderRadius: 1, mb: 1 }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {settler.name.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight={600}>
                      {settler.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {settler.backstory}
                    </Typography>
                    <Box display="flex" gap={1}>
                      {Object.entries(settler.skills).slice(0, 3).map(([skill, level]) => (
                        <Chip
                          key={skill}
                          size="small"
                          label={`${skill}: ${level}`}
                          variant="outlined"
                          color="secondary"
                        />
                      ))}
                    </Box>
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          {availableSettlers.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No available settlers. All settlers are currently assigned to other tasks.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettlerDialogOpen(false)}>Cancel</Button>
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