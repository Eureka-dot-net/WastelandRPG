import {
  Delete, Nature, Build, Restaurant, Science, LocalHospital, Person, CheckCircle, Assignment, Timer
} from "@mui/icons-material";
import {
  Container, Paper, Typography, Alert, Box, LinearProgress, Avatar, Chip, Grid, Card, CardContent, Divider,
  CardActions, Button
} from "@mui/material";
import { useState, useEffect, type JSX } from "react";
import "react-toastify/dist/ReactToastify.css";
import { showTaskCompletionToast } from "../../app/shared/components/toast/toastHelpers";
import { ToastContainer } from "react-toastify";

interface Settler {
  _id: string;
  name: string;
  skills: {
    scavenging: number;
    engineering: number;
    combat: number;
  };
  backstory: string;
}

interface Task {
  id: string;
  name: string;
  description: string;
  purpose: string; // new
  duration: number;
  rewards: Record<string, number>;
  difficulty: "Easy" | "Medium" | "Hard";
  icon: JSX.Element;
  status: "available" | "assigned" | "completed";
  assignedSettler?: Settler;
}

// Mock settler
const mockSettler: Settler = {
  _id: "settler-001",
  name: "Maya Rodriguez",
  skills: { scavenging: 7, engineering: 5, combat: 4 },
  backstory: "Former engineer turned scavenger",
};

// Hardcoded cleanup tasks with purposes
const initialTasks: Task[] = [
  {
    id: "task-001",
    name: "Clear Main Debris Pile",
    purpose: "Prepare the main camp so a shelter can be built",
    description: "Remove the massive debris pile blocking the main entrance to camp.",
    duration: 3000,
    rewards: { scrap: 25, wood: 10 },
    difficulty: "Easy",
    icon: <Delete />,
    status: "available",
  },
  {
    id: "task-002",
    name: "Collect Scattered Wood",
    purpose: "Gather materials for building and repairs",
    description: "Gather wooden planks and branches scattered around the perimeter.",
    duration: 20000,
    rewards: { wood: 35, scrap: 5 },
    difficulty: "Easy",
    icon: <Nature />,
    status: "available",
  },
  {
    id: "task-003",
    name: "Salvage Electronics",
    purpose: "Recover electronics for future machinery or defenses",
    description: "Extract valuable electronic components from destroyed equipment.",
    duration: 30000,
    rewards: { scrap: 40, electronics: 8 },
    difficulty: "Medium",
    icon: <Build />,
    status: "available",
  },
  {
    id: "task-004",
    name: "Search Food Supplies",
    purpose: "Secure immediate food and medicine for settlers",
    description: "Look through abandoned areas for any salvageable food or rations.",
    duration: 25000,
    rewards: { food: 12, medicine: 3 },
    difficulty: "Easy",
    icon: <Restaurant />,
    status: "available",
  },
];

const HomesteadTaskPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});

  // Timer effect
  useEffect(() => {
    const timerIds: Record<string, number> = {};
    Object.entries(activeTimers).forEach(([taskId, timeLeft]) => {
      if (timeLeft > 0) {
        timerIds[taskId] = window.setTimeout(() => {
          setActiveTimers(prev => ({ ...prev, [taskId]: Math.max(prev[taskId] - 1000, 0) }));
        }, 1000);
      } else if (timeLeft === 0) {
        completeTask(taskId);
      }
    });
    return () => Object.values(timerIds).forEach(clearTimeout);
  }, [activeTimers]);

  const assignSettler = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status !== "available") return;

    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, status: "assigned", assignedSettler: mockSettler } : t)
    );
    setActiveTimers(prev => ({ ...prev, [taskId]: task.duration }));
  };

  const completeTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, status: "completed" } : t)
    );

    setActiveTimers(prev => {
      const newTimers = { ...prev };
      delete newTimers[taskId];
      return newTimers;
    });

    // react-toastify toast
    showTaskCompletionToast(task, mockSettler, task.rewards);

  };
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getDifficultyColor = (difficulty: Task["difficulty"]) => {
    switch (difficulty) {
      case "Easy": return "success";
      case "Medium": return "warning";
      case "Hard": return "error";
      default: return "default";
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "scrap": return <Build />;
      case "wood": return <Nature />;
      case "food": return <Restaurant />;
      case "electronics": return <Science />;
      case "medicine": return <LocalHospital />;
      default: return <Build />;
    }
  };

  const completedTasks = tasks.filter(t => t.status === "completed").length;

  return (
    <Container maxWidth="lg">
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
            <Typography variant="body2" color="text.secondary">{completedTasks}/{tasks.length} tasks completed</Typography>
          </Box>
          <LinearProgress variant="determinate" value={(completedTasks / tasks.length) * 100} color="secondary" sx={{ height: 8, borderRadius: 4 }} />
        </Box>
      </Paper>

      {/* Available Settler */}
      <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person color="primary" /> Available Settler
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>{mockSettler.name.charAt(0)}</Avatar>
          <Box>
            <Typography variant="body1" fontWeight={600}>{mockSettler.name}</Typography>
            <Typography variant="body2" color="text.secondary">{mockSettler.backstory}</Typography>
            <Box display="flex" gap={1} mt={1}>
              <Chip size="small" label={`Scavenging: ${mockSettler.skills.scavenging}`} color="secondary" variant="outlined" />
              <Chip size="small" label={`Engineering: ${mockSettler.skills.engineering}`} color="secondary" variant="outlined" />
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Tasks Grid */}
      <Grid container spacing={3}>
        {tasks.map(task => {
          const timeRemaining = activeTimers[task.id] || 0;
          const progress = task.status === "assigned" && task.duration
            ? ((task.duration - timeRemaining) / task.duration) * 100
            : 0;

          return (
            <Grid size={{ xs: 12, md: 6 }} key={task.id}>
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                opacity: task.status === 'completed' ? 0.7 : 1,
                border: task.status === 'assigned' ? '2px solid #4caf50' : '1px solid #333',
              }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>{task.icon}<Typography variant="h6">{task.name}</Typography></Box>
                    <Box display="flex" gap={1}>
                      <Chip size="small" label={task.difficulty} color={getDifficultyColor(task.difficulty)} variant="outlined" />
                      {task.status === "completed" && <CheckCircle color="success" />}
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{task.description}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}><em>Purpose: {task.purpose}</em></Typography>

                  {task.status === "assigned" && (
                    <Box sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" color="secondary.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Assignment fontSize="small" /> {task.assignedSettler?.name} is working...
                        </Typography>
                        <Typography variant="body2" color="secondary.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Timer fontSize="small" /> {formatTime(timeRemaining)}
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={progress} color="secondary" sx={{ height: 6, borderRadius: 3 }} />
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom color="text.secondary">Rewards:</Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {Object.entries(task.rewards).map(([type, amount]) => (
                      <Chip key={type} size="small" icon={getRewardIcon(type)} label={`${amount} ${type}`} variant="outlined"
                        sx={{ color: '#ffc107', borderColor: '#ffc107' }} />
                    ))}
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2 }}>
                  {task.status === "available" && (
                    <Button variant="contained" fullWidth onClick={() => assignSettler(task.id)} sx={{ fontWeight: 600 }}>
                      Assign {mockSettler.name.split(' ')[0]}
                    </Button>
                  )}
                  {task.status === "assigned" && (
                    <Button variant="outlined" fullWidth disabled sx={{ fontWeight: 600 }}>
                      In Progress... ({formatTime(timeRemaining)})
                    </Button>
                  )}
                  {task.status === "completed" && (
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

      {/* Task Queue Placeholder */}
      <Paper elevation={2} sx={{ p: 3, mt: 4, opacity: 0.6 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assignment color="secondary" /> Task Queue (Coming Soon)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Future feature: Queue multiple tasks for settlers and manage complex work schedules.
        </Typography>
      </Paper>
    </Container>
  );
};

export default HomesteadTaskPage;
