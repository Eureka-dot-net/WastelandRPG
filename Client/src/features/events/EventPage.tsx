import React from 'react';
import {
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  Chip,
  useTheme,
  useMediaQuery,
  Divider,
  Avatar
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
  Error as ErrorIcon
} from '@mui/icons-material';
import { useColony } from '../../lib/hooks/useColony';
import { useServerContext } from '../../lib/contexts/ServerContext';
import type { ColonyEvent } from '../../lib/types/event';
import ErrorDisplay from '../../app/shared/components/ui/ErrorDisplay';
import LoadingDisplay from '../../app/shared/components/ui/LoadingDisplay';
import { formatDistanceToNow } from 'date-fns';

const EventPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentServerId: serverId } = useServerContext();
  const { colony, colonyLoading, colonyError } = useColony(serverId);

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

  const handleEventClick = (event: ColonyEvent) => {
    // Check if this is a settler event that might need action
    if (event.type === 'settler' && event.meta?.settlerId) {
      // TODO: Check if settler needs acceptance/rejection
      console.log('Settler event clicked:', event);
    }
    // For now, we'll just log the event click
    console.log('Event clicked:', event);
  };

  if (colonyLoading || !serverId) {
    return (
      <LoadingDisplay 
        title="Loading Events" 
        subtitle="Fetching colony events..."
        emoji="📰"
      />
    );
  }

  if (colonyError) {
    return (
      <ErrorDisplay 
        error={colonyError} 
        showContainer
      />
    );
  }

  if (!colony) {
    return (
      <ErrorDisplay 
        error="Failed to load colony data"
        showContainer
      />
    );
  }

  const events = colony.logs || [];
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Container maxWidth="lg">
      <Box textAlign="center" mb={4}>
        <Typography variant="h4" gutterBottom>
          📰 Colony Events
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Recent happenings in {colony.colonyName}
        </Typography>
        <Chip 
          label={`${events.length} Total Events`}
          color="primary"
          variant="filled"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {sortedEvents.length === 0 ? (
          <Box 
            p={6} 
            textAlign="center"
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`
            }}
          >
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: 'primary.light',
                mx: 'auto',
                mb: 2
              }}
            >
              📰
            </Avatar>
            <Typography variant="h6" gutterBottom>
              No Events Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start working on assignments and exploring to generate events for your colony.
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {sortedEvents.map((event, index) => (
              <React.Fragment key={index}>
                <ListItem disablePadding>
                  <ListItemButton 
                    onClick={() => handleEventClick(event)}
                    sx={{
                      py: isMobile ? 2 : 2.5,
                      px: isMobile ? 2 : 3,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      }
                    }}
                  >
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          bgcolor: `${getEventColor(event.type)}.main`,
                          width: isMobile ? 40 : 48,
                          height: isMobile ? 40 : 48,
                        }}
                      >
                        {getEventIcon(event.type)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography 
                            variant={isMobile ? 'body2' : 'body1'} 
                            sx={{ 
                              flexGrow: 1,
                              wordBreak: 'break-word'
                            }}
                          >
                            {event.message}
                          </Typography>
                          <Chip 
                            label={event.type}
                            size="small"
                            color={getEventColor(event.type) as any}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ mt: 0.5, display: 'block' }}
                        >
                          {formatEventTime(event.timestamp)}
                        </Typography>
                      }
                      sx={{
                        m: 0,
                        '& .MuiListItemText-primary': {
                          mb: 0.5
                        }
                      }}
                    />
                  </ListItemButton>
                </ListItem>
                {index < sortedEvents.length - 1 && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default EventPage;