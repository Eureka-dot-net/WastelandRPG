import React from 'react';
import { 
  Card, CardContent, Box, Typography, LinearProgress, Chip, Button, CardActions,
  Divider
} from '@mui/material';
import { 
  Favorite, SentimentSatisfied, Restaurant, BatteryFull 
} from '@mui/icons-material';
import type { Settler } from '../../lib/types/settler';
import SettlerAvatar from '../../lib/avatars/SettlerAvatar';

interface SettlerStatusCardAction {
  label: string | ((settler: Settler) => string);
  onClick: (settler: Settler) => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean;
}

interface SettlerStatusCardProps {
  settler: Settler;
  actions: SettlerStatusCardAction[];
}

const SettlerStatusCard: React.FC<SettlerStatusCardProps> = ({
  settler,
  actions
}) => {
  const getQuickStatColor = (value: number): "success" | "warning" | "error" => {
    if (value >= 70) return 'success';
    if (value >= 40) return 'warning';
    return 'error';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'idle': return '#4caf50';
      case 'working': return '#ff9800';
      case 'resting': return '#2196f3';
      case 'exploring': return '#9c27b0';
      case 'crafting': return '#f44336';
      case 'questing': return '#3f51b5';
      default: return '#757575';
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        {/* Header with name and status */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <SettlerAvatar settler={settler} size={40} />
            <Typography variant="h6" color="primary" sx={{ fontSize: '1.1rem' }}>
              {settler.name}
            </Typography>
          </Box>
          <Chip 
            label={settler.status.toUpperCase()} 
            size="small"
            sx={{ 
              bgcolor: getStatusColor(settler.status),
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem'
            }}
          />
        </Box>

        {/* Theme */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Theme: {settler.theme || 'Standard'}
        </Typography>

        {/* Brief backstory */}
        <Typography variant="body2" color="text.secondary" sx={{ 
          mb: 2, 
          minHeight: '40px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          {settler.backstory}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* Quick Stats */}
        <Typography variant="subtitle2" color="text.primary" gutterBottom sx={{ fontSize: '0.9rem' }}>
          Status Indicators
        </Typography>
        
        {/* Health */}
        <Box mb={1.5}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Favorite color="error" fontSize="small" />
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Health</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {settler.health}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={settler.health}
            color={getQuickStatColor(settler.health)}
            sx={{ height: 4, borderRadius: 2 }}
          />
        </Box>
        
        {/* Morale */}
        <Box mb={1.5}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <SentimentSatisfied color="primary" fontSize="small" />
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Morale</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {settler.morale}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={settler.morale}
            color={getQuickStatColor(settler.morale)}
            sx={{ height: 4, borderRadius: 2 }}
          />
        </Box>

        {/* Hunger (inverted - showing fullness) */}
        <Box mb={1.5}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Restaurant color="secondary" fontSize="small" />
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Fullness</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {100 - (settler.hunger || 0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, 100 - (settler.hunger || 0))}
            color={getQuickStatColor(Math.max(0, 100 - (settler.hunger || 0)))}
            sx={{ height: 4, borderRadius: 2 }}
          />
        </Box>

        {/* Energy */}
        <Box mb={1.5}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <BatteryFull color="info" fontSize="small" />
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Energy</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {Math.round(settler.energy || 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={settler.energy || 100}
            color={getQuickStatColor(settler.energy || 100)}
            sx={{ height: 4, borderRadius: 2 }}
          />
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2 }}>
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'contained'}
            color={action.color || 'primary'}
            size="small"
            onClick={() => action.onClick(settler)}
            disabled={action.disabled}
            sx={{
              fontSize: '0.8rem',
              fontWeight: 600,
              flex: actions.length === 1 ? 1 : undefined
            }}
          >
            {typeof action.label === 'function' ? action.label(settler) : action.label}
          </Button>
        ))}
      </CardActions>
    </Card>
  );
};

export default SettlerStatusCard;