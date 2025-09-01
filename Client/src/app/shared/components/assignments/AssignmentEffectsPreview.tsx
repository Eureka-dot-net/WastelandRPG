// File: src/shared/components/assignments/AssignmentEffectsPreview.tsx
import React from 'react';
import { Box, Typography, Chip, Paper, Divider } from '@mui/material';
import { Speed, TrendingUp, Stars } from '@mui/icons-material';
import type { AssignmentAdjustments } from '../../../../lib/types/assignment';

interface AssignmentEffectsPreviewProps {
  adjustments: AssignmentAdjustments;
  settlerName: string;
  baseDuration: number;
}

const AssignmentEffectsPreview: React.FC<AssignmentEffectsPreviewProps> = ({
  adjustments,
  settlerName,
  baseDuration
}) => {
  const formatDuration = (ms: number) => {
    const minutes = Math.ceil(ms / 60000);
    return `${minutes}m`;
  };

  const formatMultiplier = (multiplier: number) => {
    return `${multiplier.toFixed(2)}x`;
  };

  const formatPercentage = (multiplier: number) => {
    const percentage = (multiplier - 1) * 100;
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(0)}%`;
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Stars color="primary" />
        Effects Preview: {settlerName}
      </Typography>

      {/* Duration Impact */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Speed fontSize="small" />
          Task Duration
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="text.secondary">
            Base: {formatDuration(baseDuration)}
          </Typography>
          <Typography variant="body2" color="primary.main">
            → Adjusted: {formatDuration(adjustments.adjustedDuration)}
          </Typography>
          <Chip
            size="small"
            label={`${formatMultiplier(adjustments.effectiveSpeed)} speed`}
            color={adjustments.effectiveSpeed > 1 ? 'success' : adjustments.effectiveSpeed < 1 ? 'error' : 'default'}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Speed Effects */}
      {adjustments.effects.speedEffects.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Speed factors:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {adjustments.effects.speedEffects.map((effect: string, index: number) => (
              <Chip key={index} size="small" label={effect} variant="filled" color="info" sx={{ fontSize: '0.7rem' }} />
            ))}
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 1 }} />

      {/* Loot Impact */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp fontSize="small" />
          Loot Modifier
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            size="small"
            label={`${formatPercentage(adjustments.lootMultiplier)} loot`}
            color={adjustments.lootMultiplier > 1 ? 'success' : adjustments.lootMultiplier < 1 ? 'error' : 'default'}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Loot Effects */}
      {adjustments.effects.lootEffects.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Loot factors:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {adjustments.effects.lootEffects.map((effect: string, index: number) => (
              <Chip key={index} size="small" label={effect} variant="filled" color="success" sx={{ fontSize: '0.7rem' }} />
            ))}
          </Box>
        </Box>
      )}

      {/* Trait Effects */}
      {adjustments.effects.traitEffects.length > 0 && (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Trait effects:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {adjustments.effects.traitEffects.map((effect: string, index: number) => (
              <Chip key={index} size="small" label={effect} variant="filled" color="warning" sx={{ fontSize: '0.7rem' }} />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default AssignmentEffectsPreview;