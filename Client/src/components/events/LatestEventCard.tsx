import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  useTheme,
  useMediaQuery,
  Avatar,
  Button
} from '@mui/material';
import {
  AccessTime,
  Person,
  Assignment as AssignmentIcon,
  Explore,
  LocalFlorist,
  Build,
  Info,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  FeedOutlined,
  PersonAdd
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { ColonyEvent } from '../../lib/types/event';
import { formatDistanceToNow } from 'date-fns';

interface LatestEventCardProps {
  event: ColonyEvent | null;
}

const LatestEventCard: React.FC<LatestEventCardProps> = ({ event }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const getEventIcon = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'settler':
        return <Person />;
      case 'assignment':
        return <AssignmentIcon />;
      case 'exploration':
        return <Explore />;
      case 'farming':
        return <LocalFlorist />;
      case 'crafting':
        return <Build />;
      case 'info':
        return <Info />;
      case 'warning':
        return <Warning />;
      case 'success':
        return <CheckCircle />;
      case 'error':
        return <ErrorIcon />;
      default:
        return <AccessTime />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'settler':
        return 'primary';
      case 'assignment':
        return 'secondary';
      case 'exploration':
        return 'info';
      case 'farming':
        return 'success';
      case 'crafting':
        return 'warning';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatEventTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const isPendingSettlerEvent = (event: ColonyEvent): boolean => {
    // Check if the message indicates a pending settler
    return event.message.includes('waiting for your decision') || 
           event.message.includes('found and is waiting');
  };

  if (!event) {
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          p: isMobile ? 2 : 3, 
          mb: 3, 
          borderRadius: 2,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            sx={{
              bgcolor: 'grey.300',
              width: isMobile ? 40 : 48,
              height: isMobile ? 40 : 48,
            }}
          >
            <FeedOutlined />
          </Avatar>
          <Box flexGrow={1}>
            <Typography variant={isMobile ? 'h6' : 'h5'} gutterBottom>
              No Recent Events
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start working on assignments to see your colony's activity.
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: isMobile ? 2 : 3, 
        mb: 3, 
        borderRadius: 2,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
        border: `1px solid ${theme.palette.divider}`
      }}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <Avatar
          sx={{
            bgcolor: `${getEventColor(event.type)}.main`,
            width: isMobile ? 40 : 48,
            height: isMobile ? 40 : 48,
          }}
        >
          {getEventIcon(event.type)}
        </Avatar>
        <Box flexGrow={1}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} sx={{ fontWeight: 600 }}>
              Latest Event
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip 
                label={event.type}
                size="small"
                color={getEventColor(event.type) as 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'default'}
                variant="outlined"
              />
              {isPendingSettlerEvent(event) && (
                <Chip
                  icon={<PersonAdd />}
                  label="Action Required"
                  size="small"
                  color="warning"
                  variant="filled"
                />
              )}
            </Box>
          </Box>
          <Typography 
            variant={isMobile ? 'body2' : 'body1'} 
            color="text.secondary"
            sx={{ mb: 1, wordBreak: 'break-word' }}
          >
            {event.message}
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Typography variant="caption" color="text.secondary">
              {formatEventTime(event.timestamp)}
            </Typography>
            <Button
              size="small"
              variant={isPendingSettlerEvent(event) ? "contained" : "outlined"}
              color={isPendingSettlerEvent(event) ? "warning" : "primary"}
              onClick={() => navigate('/events')}
              sx={{ textTransform: 'none' }}
            >
              {isPendingSettlerEvent(event) ? "Take Action" : "View All Events"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default LatestEventCard;