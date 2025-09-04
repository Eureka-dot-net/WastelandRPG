import React, { useState } from 'react';
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
  Error as ErrorIcon,
  PersonAdd
} from '@mui/icons-material';
import { useColony } from '../../lib/hooks/useColony';
import { useServerContext } from '../../lib/contexts/ServerContext';
import { useSettler } from '../../lib/hooks/useSettler';
import { useSettlerById } from '../../lib/hooks/useSettlerById';
import type { ColonyEvent } from '../../lib/types/event';
import type { Settler } from '../../lib/types/settler';
import ErrorDisplay from '../../app/shared/components/ui/ErrorDisplay';
import LoadingDisplay from '../../app/shared/components/ui/LoadingDisplay';
import FoundSettlerDialog from '../../app/shared/components/dialogs/FoundSettlerDialog';
import { formatDistanceToNow } from 'date-fns';

const EventPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentServerId: serverId } = useServerContext();
  const { colony, colonyLoading, colonyError } = useColony(serverId);
  const { selectSettler, rejectSettler } = useSettler(serverId, colony?._id);
  const [settlerDialogOpen, setSettlerDialogOpen] = useState(false);
  const [selectedSettlerId, setSelectedSettlerId] = useState<string | null>(null);
  const [isProcessingSettler, setIsProcessingSettler] = useState(false);

  // Fetch settler details when one is selected
  const { data: selectedSettler } = useSettlerById(
    serverId,
    colony?._id,
    selectedSettlerId || undefined
  );

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
    if (event.type === 'assignment' && event.meta?.settlerId && isPendingSettlerEvent(event)) {
      console.log('Found settler started:', event.meta.settlerId);
      setSelectedSettlerId(event.meta.settlerId);
      setSettlerDialogOpen(true);
      return;
    }
    // For now, we'll just log the event click
    console.log('Event clicked:', event);
  };

  const isPendingSettlerEvent = (event: ColonyEvent): boolean => {
    // Check if the message indicates a pending settler
    return event.message.includes('waiting for your decision') || 
           event.message.includes('found and is waiting');
  };

  const handleAcceptSettler = async (settler: Settler) => {
    if (!serverId || !colony) return;
    
    setIsProcessingSettler(true);
    try {
      await selectSettler.mutateAsync({
        settlerId: settler._id
      });
      setSettlerDialogOpen(false);
      setSelectedSettlerId(null);
    } catch (error) {
      console.error('Failed to accept settler:', error);
    } finally {
      setIsProcessingSettler(false);
    }
  };

  const handleRejectSettler = async (settler: Settler) => {
    if (!serverId || !colony) return;

    setIsProcessingSettler(true);
    try {
      await rejectSettler.mutateAsync({
        settlerId: settler._id
      });
      setSettlerDialogOpen(false);
      setSelectedSettlerId(null);
    } catch (error) {
      console.error('Failed to reject settler:', error);
    } finally {
      setIsProcessingSettler(false);
    }
  };

  const handleCloseDialog = () => {
    setSettlerDialogOpen(false);
    setSelectedSettlerId(null);
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
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
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
                      }
                      secondary={
                        <Box>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ mt: 0.5, display: 'block' }}
                          >
                            {formatEventTime(event.timestamp)}
                          </Typography>
                          {isPendingSettlerEvent(event) && (
                            <Typography 
                              variant="caption" 
                              color="warning.main"
                              sx={{ mt: 0.5, display: 'block', fontWeight: 600 }}
                            >
                              Click to accept or decline this settler
                            </Typography>
                          )}
                        </Box>
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

      {/* Settler Dialog for pending acceptances */}
      <FoundSettlerDialog
        open={settlerDialogOpen && !!selectedSettler}
        settler={selectedSettler || null}
        onClose={handleCloseDialog}
        onApprove={handleAcceptSettler}
        onReject={handleRejectSettler}
        isLoading={isProcessingSettler}
      />
    </Container>
  );
};

export default EventPage;