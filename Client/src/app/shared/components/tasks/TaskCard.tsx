// File: src/shared/components/tasks/TaskCard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  CheckCircle,
  Assignment as AssignmentIcon,
  Timer,
  Lock,
  Launch,
  Inventory
} from '@mui/icons-material';
import { formatTimeRemaining } from '../../../../lib/utils/timeUtils';
import SettlerAvatar from '../../../../lib/avatars/SettlerAvatar';
import type { Settler } from '../../../../lib/types/settler';

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
  status: 'available' | 'blocked' | 'in-progress' | 'completed' | 'starting' | 'unloading';

  // Progress (for in-progress tasks)
  progress?: number;
  timeRemaining?: number;
  assignedEntityName?: string; // Could be settler name or other entity
  assignedSettler?: Settler; // The actual settler object for displaying avatar

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
  assignedSettler,
  completionMessage,
  unlocks,
  unlockLink,
  blockingReason,
  chips = [],
  actions,
  compact = false
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isNavigatingToUnlock, setIsNavigatingToUnlock] = useState(false);
  const handleUnlockNavigation = () => {
    if (unlockLink) {
      setIsNavigatingToUnlock(true);
      navigate(unlockLink);
    }
  };

  const isBlocked = status === 'blocked';
  const isInProgress = status === 'in-progress';
  const isCompleted = status === 'completed';
  const isStarting = status === 'starting';
  const isUnloading = status === 'unloading';

  const getCardBorder = () => {
    if (isInProgress) return '2px solid #4caf50';
    if (isStarting) return '2px solid #ff9800';
    if (isUnloading) return '2px solid #2196f3';
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
      <CardContent
        sx={{
          flexGrow: 1,
          p: compact ? 1.5 : isMobile ? 2 : 3,
          pb: 1 // <-- Reduce bottom padding
        }}
      >
        {/* Responsive layout - horizontal on desktop, vertical on mobile */}
        <Box
          sx={{
            mb: isMobile ? 1.5 : 2,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: isMobile ? 'flex-start' : 'space-between',
            alignItems: isMobile ? 'flex-start' : 'flex-start',
            gap: isMobile ? 0.5 : 2
          }}
        >
          <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 0, flex: isMobile ? 'none' : 1 }}>
            {isBlocked && <Lock color="disabled" fontSize="small" />}
            {icon}
            <Typography
              variant={compact ? "subtitle1" : "h6"}
              sx={{
                wordBreak: 'break-word',
                hyphens: 'auto',
                overflowWrap: 'break-word'
              }}
            >
              {name}
            </Typography>
          </Box>
          {chips.length > 0 && (
            <Box
              display="flex"
              gap={1}
              flexWrap="wrap"
              sx={{
                justifyContent: isMobile ? 'flex-start' : 'flex-end',
                alignItems: 'flex-start',
                mt: isMobile ? 0.5 : 0
              }}
            >
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
          )}
          {chips.length === 0 && isCompleted && (
            <Box sx={{ mt: isMobile ? 0.5 : 0 }}>
              <CheckCircle color="success" />
            </Box>
          )}
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: isMobile ? 1.5 : 2, fontSize: compact ? '0.8rem' : isMobile ? '0.8rem' : '0.875rem' }}
        >
          {description}
        </Typography>

        {/* Blocking message */}
        {isBlocked && blockingReason && (
          <Alert severity="info" sx={{ mb: isMobile ? 1.5 : 2 }}>
            <Typography variant="body2">
              {blockingReason}
            </Typography>
          </Alert>
        )}

        {/* Starting message */}
        {isStarting && (
          <Box sx={{ mb: isMobile ? 1.5 : 2 }}>
            <Box display="flex" justifyContent="center" alignItems="center" mb={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  color="warning.main"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontStyle: 'italic' }}
                >
                  <Timer fontSize="small" /> 
                  Gathering gear...
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              color="warning"
              sx={{ height: compact || isMobile ? 3 : 6, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* Unloading message */}
        {isUnloading && (
          <Box sx={{ mb: isMobile ? 1.5 : 2 }}>
            <Box display="flex" justifyContent="center" alignItems="center" mb={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  color="info.main"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontStyle: 'italic' }}
                >
                  <Inventory fontSize="small" /> 
                  Unloading inventory...
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              color="info"
              sx={{ height: compact || isMobile ? 3 : 6, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* Completion message and unlock */}
        {isCompleted && completionMessage && (
          <Box sx={{ mb: 0 }}>
            <Typography variant="body2" color="success.main" sx={{ fontStyle: 'italic', mb: isMobile ? 1 : 2 }}>
              {completionMessage}
            </Typography>
            {unlocks && unlockLink && (
              <Button
                variant="outlined"
                color="success"
                startIcon={<Launch />}
                onClick={handleUnlockNavigation}
                disabled={isNavigatingToUnlock}
                sx={{ mb: 1 }}
                size={compact || isMobile ? "small" : "medium"}
              >
                {isNavigatingToUnlock ? 'Loading...' : `Go to ${unlocks.charAt(0).toUpperCase() + unlocks.slice(1)}`}
              </Button>
            )}
          </Box>
        )}

        {/* In progress display */}
        {isInProgress && (assignedEntityName || assignedSettler) && (
          <Box sx={{ mb: 0 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {assignedSettler && (
                  <SettlerAvatar 
                    settler={assignedSettler} 
                    size={compact || isMobile ? 24 : 32} 
                  />
                )}
                <Typography
                  variant="body2"
                  color="secondary.main"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: compact || isMobile ? '0.7rem' : '0.875rem' }}
                >
                  <AssignmentIcon fontSize="small" /> 
                  {assignedSettler?.name || assignedEntityName} is working...
                </Typography>
              </Box>
              {timeRemaining !== undefined && (
                <Typography
                  variant="body2"
                  color="secondary.main"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: compact || isMobile ? '0.7rem' : '0.875rem' }}
                >
                  <Timer fontSize="small" />
                  {timeRemaining > 0 ? formatTimeRemaining(timeRemaining) : "Finishing..."}
                </Typography>
              )}
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(progress, 100)}
              color="secondary"
              sx={{ height: compact || isMobile ? 3 : 6, borderRadius: 3 }}
            />
          </Box>
        )}
      </CardContent>

      <CardActions
        sx={{
          pt: 1, // <-- remove top padding
          mb: 0
        }}
      >
        {actions.length === 1 ? (
          <Button
            variant={actions[0].variant || 'contained'}
            color={actions[0].color || 'primary'}
            fullWidth={actions[0].fullWidth !== false}
            onClick={actions[0].onClick}
            disabled={actions[0].disabled}
            startIcon={actions[0].startIcon}
            sx={{ fontWeight: 600 }}
            size={compact || isMobile ? "small" : "medium"}
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
                size={compact || isMobile ? "small" : "medium"}
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