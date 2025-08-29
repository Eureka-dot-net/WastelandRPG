// File: src/components/settlers/SettlerCard.tsx
import React from 'react';

import { Person, Security, Build, LocalHospital, Agriculture, Science, Star, Speed, Psychology, Shield } from '@mui/icons-material';
import type { Settler } from '../../lib/types/settler';
import DynamicIcon from '../../app/shared/components/DynamicIcon';
import { Card, CardContent, Box, Typography, Divider, LinearProgress, Tooltip, Chip, Avatar, CardActions, Button, Grid } from '@mui/material';

interface SettlerCardAction {
  label: string | ((settler: Settler) => string);
  onClick: (settler: Settler) => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean;
}

interface SettlerCardProps {
  settler: Settler;
  actions: SettlerCardAction[];
  showFullWidth?: boolean;
}

const SettlerCard: React.FC<SettlerCardProps> = ({
  settler,
  actions,
  showFullWidth = false
}) => {
  const getSkillIcon = (skill: string) => {
    const icons: Record<string, React.ReactElement> = {
      combat: <Security />,
      engineering: <Build />,
      medical: <LocalHospital />,
      farming: <Agriculture />,
      crafting: <Build />,
      scavenging: <Science />
    };
    return icons[skill] || <Star />;
  };

  const getStatIcon = (stat: string) => {
    const icons: Record<string, React.ReactElement> = {
      strength: <Security />,
      speed: <Speed />,
      intelligence: <Psychology />,
      resilience: <Shield />
    };
    return icons[stat] || <Star />;
  };

  const getStatColor = (value: number): "success" | "warning" | "error" => {
    if (value >= 8) return 'success';
    if (value >= 6) return 'warning';
    return 'error';
  };

  const getSkillColor = (value: number): string => {
    if (value >= 8) return '#4caf50';
    if (value >= 6) return '#ff9800';
    return '#d32f2f';
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Person color="primary" />
          <Typography variant="h6" color="primary">
            {settler.name}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: '80px' }}>
          {settler.backstory}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle1" color="text.primary" gutterBottom>
          Core Stats
        </Typography>
        {Object.entries(settler.stats).map(([stat, value]) => (
          <Box key={stat} mb={1.5}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Box display="flex" alignItems="center" gap={1}>
                {getStatIcon(stat)}
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {stat}
                </Typography>
              </Box>
              <Typography variant="body2" color={`${getStatColor(value)}.main`}>
                {value}/10
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(value / 10) * 100}
              color={getStatColor(value)}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" color="text.primary" gutterBottom>
          Skills
        </Typography>
        {Object.entries(settler.skills)
          .map(([skill, value]) => (
            <Box key={skill} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                {getSkillIcon(skill)}
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {skill}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: getSkillColor(value) }}>
                {value}
              </Typography>
            </Box>
          ))}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" color="text.primary" gutterBottom>
          Traits
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
          {settler.traits.map((trait) => (
            <Tooltip
              key={trait.traitId}
              title={trait.description}
              sx={{ cursor: 'help' }}
            >
              <Box>
                <Chip
                  avatar={<Avatar sx={{ width: 20, height: 20, bgcolor: 'transparent' }}><DynamicIcon name={trait.icon || 'GiQuestionMark'} /></Avatar>}
                  label={trait.traitId}
                  color={trait.type === "positive" ? "success" : "error"}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    bgcolor: trait.type === "positive" ? "#2a3d2a" : "#3d2a2a",
                    color: '#fff',
                    borderColor: trait.type === "positive" ? "#4a704a" : "#704a4a",
                    fontSize: '0.75rem',
                    height: 26,
                    '&:hover': {
                      bgcolor: trait.type === "positive" ? "#3a4d3a" : "#4d3a3a",
                      borderColor: trait.type === "positive" ? "#6a906a" : "#905a5a"
                    },
                    '& .MuiChip-avatar': { width: 20, height: 20 },
                  }}
                />
              </Box>
            </Tooltip>
          ))}
        </Box>

        <Typography variant="subtitle1" color="text.primary" gutterBottom>
          Status
        </Typography>
        <Box display="flex" justifyContent="space-between" gap={2}>
          <Typography variant="body2" color="text.secondary">
            Health: {settler.health}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Morale: {settler.morale}%
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2 }}>
        {showFullWidth && actions.length === 1 ? (
          <Button
            variant={actions[0].variant || 'contained'}
            color={actions[0].color || 'primary'}
            fullWidth
            size="large"
            onClick={() => actions[0].onClick(settler)}
            disabled={actions[0].disabled}
            sx={{
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            {typeof actions[0].label === 'function' ? actions[0].label(settler) : actions[0].label}
          </Button>
        ) : (
          <Grid container spacing={1}>
            {actions.map((action, index) => (
              <Grid key={index} size={{ xs: 12 / actions.length }}>
                <Button
                  variant={action.variant || 'contained'}
                  color={action.color || 'primary'}
                  fullWidth
                  size="large"
                  onClick={() => action.onClick(settler)}
                  disabled={action.disabled}
                  sx={{
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}
                >
                  {typeof action.label === 'function' ? action.label(settler) : action.label}
                </Button>
              </Grid>
            ))}
          </Grid>
        )}
      </CardActions>
    </Card>
  );
};

export default SettlerCard;