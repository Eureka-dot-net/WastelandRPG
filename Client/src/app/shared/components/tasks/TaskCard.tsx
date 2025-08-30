// File: src/shared/components/tasks/TaskCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Button,
  Alert,
  Link
} from '@mui/material';
import {
  CheckCircle,
  Assignment as AssignmentIcon,
  Timer,
  Lock,
  Launch
} from '@mui/icons-material';

export interface TaskCardAction {
  label: string;
  onClick: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'inherit';
  disabled?: boolean;
  startIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export interface TaskCardProps {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  
  // Task status
  status: 'available' | 'blocked' | 'in-progress' | 'completed';
  
  // Progress (for in-progress tasks)
  progress?: number;
  timeRemaining?: number;
  assignedEntityName?: string; // Could be settler name or other entity
  
  // Completion
  completionMessage?: string;
  unlocks?: string;
  unlockLink?: string;
  
  // Blocking
  blockingReason?: string;
  
  // Additional info
  chips?: Array<{
    label: string;
    variant?: 'filled' | 'outlined';
    color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  }>;
  
  // Actions
  actions: TaskCardAction[];
  
  // Styling
  compact?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  name,
  description,
  icon,
  status,
  progress = 0,
  timeRemaining,
  assignedEntityName,
  completionMessage,
  unlocks,
  unlockLink,
  blockingReason,
  chips = [],
  actions,
  compact = false
}) => {
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isBlocked = status === 'blocked';
  const isInProgress = status === 'in-progress';
  const isCompleted = status === 'completed';

  const getCardBorder = () => {
    if (isInProgress) return '2px solid #4caf50';
    if (isBlocked) return '1px solid #666';
    return '1px solid #333';
  };

  const getCardOpacity = () => {
    if (isCompleted) return 0.7;
    if (isBlocked) return 0.5;
    return 1;
  };

  return (
    <Card sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      opacity: getCardOpacity(),
      border: getCardBorder(),
    }}>
      <CardContent sx={{ flexGrow: 1, p: compact ? 2 : 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            {isBlocked && <Lock color="disabled" fontSize="small" />}
            {icon}
            <Typography variant={compact ? "subtitle1" : "h6"}>
              {name}
            </Typography>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            {chips.map((chip, index) => (
              <Chip
                key={index}
                size="small"
                label={chip.label}
                variant={chip.variant || "outlined"}
                color={chip.color || "default"}
              />
            ))}
            {isCompleted && <CheckCircle color="success" />}
          </Box>
        </Box>

        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mb: 2, fontSize: compact ? '0.8rem' : '0.875rem' }}
        >
          {description}
        </Typography>

        {/* Blocking message */}
        {isBlocked && blockingReason && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {blockingReason}
            </Typography>
          </Alert>
        )}

        {/* Completion message and unlock */}
        {isCompleted && completionMessage && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="success.main" sx={{ fontStyle: 'italic', mb: 2 }}>
              {completionMessage}
            </Typography>
            {unlocks && unlockLink && (
              <Button
                variant="outlined"
                color="success"
                startIcon={<Launch />}
                component={Link}
                href={unlockLink}
                sx={{ mb: 1 }}
                size={compact ? "small" : "medium"}
              >
                Go to {unlocks.charAt(0).toUpperCase() + unlocks.slice(1)}
              </Button>
            )}
          </Box>
        )}

        {/* In progress display */}
        {isInProgress && assignedEntityName && (
          <Box sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography 
                variant="body2" 
                color="secondary.main" 
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: compact ? '0.75rem' : '0.875rem' }}
              >
                <AssignmentIcon fontSize="small" /> {assignedEntityName} is working...
              </Typography>
              {timeRemaining !== undefined && (
                <Typography 
                  variant="body2" 
                  color="secondary.main" 
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: compact ? '0.75rem' : '0.875rem' }}
                >
                  <Timer fontSize="small" /> 
                  {timeRemaining > 0 ? formatTime(timeRemaining) : "Finishing..."}
                </Typography>
              )}
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(progress, 100)}
              color="secondary"
              sx={{ height: compact ? 4 : 6, borderRadius: 3 }}
            />
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ p: compact ? 1.5 : 2 }}>
        {actions.length === 1 ? (
          <Button
            variant={actions[0].variant || 'contained'}
            color={actions[0].color || 'primary'}
            fullWidth={actions[0].fullWidth !== false}
            onClick={actions[0].onClick}
            disabled={actions[0].disabled}
            startIcon={actions[0].startIcon}
            sx={{ fontWeight: 600 }}
            size={compact ? "small" : "medium"}
          >
            {actions[0].label}
          </Button>
        ) : (
          <Box display="flex" gap={1} width="100%">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'contained'}
                color={action.color || 'primary'}
                onClick={action.onClick}
                disabled={action.disabled}
                startIcon={action.startIcon}
                sx={{ fontWeight: 600, flex: action.fullWidth !== false ? 1 : 'none' }}
                size={compact ? "small" : "medium"}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        )}
      </CardActions>
    </Card>
  );
};

export default TaskCard;