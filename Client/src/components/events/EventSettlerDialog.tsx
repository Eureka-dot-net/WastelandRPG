import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Chip,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Person,
  Check,
  Close,
  Favorite,
  Engineering,
  LocalHospital,
  Agriculture,
  Build,
  Security
} from '@mui/icons-material';
import { useSettlerById } from '../../lib/hooks/useSettlerById';
import { useServerContext } from '../../lib/contexts/ServerContext';
import { useColony } from '../../lib/hooks/useColony';
import type { Settler } from '../../lib/types/settler';
import LoadingDisplay from '../../app/shared/components/ui/LoadingDisplay';

interface EventSettlerDialogProps {
  open: boolean;
  onClose: () => void;
  settlerId: string;
  onAccept?: () => void;
  onReject?: (settlerId: string) => void;
}

const EventSettlerDialog: React.FC<EventSettlerDialogProps> = ({
  open,
  onClose,
  settlerId,
  onAccept,
  onReject
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentServerId } = useServerContext();
  const { colony } = useColony(currentServerId);
  const [loading, setLoading] = useState(false);

  const { data: settler, isLoading, error } = useSettlerById(
    currentServerId,
    colony?._id,
    settlerId
  );

  const handleAccept = async () => {
    if (onAccept) {
      setLoading(true);
      try {
        await onAccept();
        onClose();
      } catch (error) {
        console.error('Failed to accept settler:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReject = async () => {
    if (onReject) {
      setLoading(true);
      try {
        await onReject(settlerId);
        onClose();
      } catch (error) {
        console.error('Failed to reject settler:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const getSkillIcon = (skill: string) => {
    switch (skill.toLowerCase()) {
      case 'combat':
        return <Security />;
      case 'medical':
        return <LocalHospital />;
      case 'engineering':
        return <Engineering />;
      case 'farming':
        return <Agriculture />;
      case 'crafting':
        return <Build />;
      default:
        return <Person />;
    }
  };

  const getTopSkills = (skills: Settler['skills']) => {
    return Object.entries(skills)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <LoadingDisplay 
            title="Loading Settler Details" 
            subtitle="Getting information about the found settler..."
            emoji="👤"
            showContainer={false}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !settler) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Typography color="error">
            Failed to load settler information.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const topSkills = getTopSkills(settler.skills);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main'
            }}
          >
            <Person />
          </Avatar>
          <Box>
            <Typography variant="h5" component="div">
              {settler.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Settler Found
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" paragraph>
          {settler.backstory}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Stats */}
        <Typography variant="h6" gutterBottom>
          Stats
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          <Chip 
            label={`STR: ${settler.stats.strength}`}
            variant="outlined"
            size="small"
            sx={{ minWidth: 80 }}
          />
          <Chip 
            label={`SPD: ${settler.stats.speed}`}
            variant="outlined"
            size="small"
            sx={{ minWidth: 80 }}
          />
          <Chip 
            label={`INT: ${settler.stats.intelligence}`}
            variant="outlined"
            size="small"
            sx={{ minWidth: 80 }}
          />
          <Chip 
            label={`RES: ${settler.stats.resilience}`}
            variant="outlined"
            size="small"
            sx={{ minWidth: 80 }}
          />
        </Box>

        {/* Top Skills */}
        <Typography variant="h6" gutterBottom>
          Top Skills
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          {topSkills.map(([skill, value]) => (
            <Chip
              key={skill}
              icon={getSkillIcon(skill)}
              label={`${skill}: ${value}`}
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>

        {/* Condition */}
        <Typography variant="h6" gutterBottom>
          Condition
        </Typography>
        <Box display="flex" gap={3} mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Favorite color="error" />
            <Typography variant="body2">
              Health: {settler.health}%
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Person color="primary" />
            <Typography variant="body2">
              Morale: {settler.morale}%
            </Typography>
          </Box>
        </Box>

        <Box mt={3} p={2} bgcolor="action.hover" borderRadius={1}>
          <Typography variant="body2" color="text.secondary">
            💡 This settler was found during your recent activities. You can choose to accept them into your colony or politely decline.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={handleReject}
          disabled={loading}
          variant="outlined"
          color="error"
          startIcon={<Close />}
          fullWidth={isMobile}
        >
          Decline
        </Button>
        <Button
          onClick={handleAccept}
          disabled={loading}
          variant="contained"
          color="primary"
          startIcon={<Check />}
          fullWidth={isMobile}
        >
          Accept
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventSettlerDialog;