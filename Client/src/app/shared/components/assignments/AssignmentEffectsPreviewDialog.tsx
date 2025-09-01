import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import { Speed, TrendingUp, Stars, CheckCircle } from '@mui/icons-material';
import type { AssignmentAdjustments } from '../../../../lib/types/assignment';

interface AssignmentEffectsPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmPending?: boolean;
  adjustments: AssignmentAdjustments;
  settlerName: string;
  baseDuration: number;
}

const AssignmentEffectsPreviewDialog: React.FC<AssignmentEffectsPreviewDialogProps> = ({
  open,
  onClose,
  onCancel,
  onConfirm,
  confirmPending = false,
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { 
          bgcolor: 'background.paper', 
          border: '1px solid #333',
          zIndex: 1402 
        }
      }}
    >
      <DialogTitle sx={{ color: 'primary.main', pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Stars color="primary" />
          Effects Preview: {settlerName}
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <Box display="flex" flexDirection="column" gap={2}>
          
          {/* Duration Impact Card */}
          <Card 
            sx={{ 
              border: '1px solid #333',
              bgcolor: 'background.default',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.main'
              }
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography 
                variant="subtitle2" 
                gutterBottom 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: 'primary.main',
                  fontWeight: 600,
                  mb: 1.5
                }}
              >
                <Speed fontSize="small" />
                Task Duration
              </Typography>
              
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Base: {formatDuration(baseDuration)}
                </Typography>
                <Typography variant="body1" fontWeight={600} color="primary.main">
                  → {formatDuration(adjustments.adjustedDuration)}
                </Typography>
                <Chip
                  size="small"
                  label={`${formatMultiplier(adjustments.effectiveSpeed)} speed`}
                  color={adjustments.effectiveSpeed > 1 ? 'success' : adjustments.effectiveSpeed < 1 ? 'error' : 'default'}
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              {/* Speed Effects */}
              {adjustments.effects.speedEffects.length > 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                    Speed factors:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {adjustments.effects.speedEffects.map((effect: string, index: number) => (
                      <Chip 
                        key={index} 
                        size="small" 
                        label={effect} 
                        variant="filled" 
                        color="info" 
                        sx={{ fontSize: '0.75rem' }} 
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Loot Impact Card */}
          <Card 
            sx={{ 
              border: '1px solid #333',
              bgcolor: 'background.default',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.main'
              }
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography 
                variant="subtitle2" 
                gutterBottom 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: 'primary.main',
                  fontWeight: 600,
                  mb: 1.5
                }}
              >
                <TrendingUp fontSize="small" />
                Loot Modifier
              </Typography>
              
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Chip
                  size="small"
                  label={`${formatPercentage(adjustments.lootMultiplier)} loot`}
                  color={adjustments.lootMultiplier > 1 ? 'success' : adjustments.lootMultiplier < 1 ? 'error' : 'default'}
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              {/* Loot Effects */}
              {adjustments.effects.lootEffects.length > 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                    Loot factors:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {adjustments.effects.lootEffects.map((effect: string, index: number) => (
                      <Chip 
                        key={index} 
                        size="small" 
                        label={effect} 
                        variant="filled" 
                        color="success" 
                        sx={{ fontSize: '0.75rem' }} 
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Trait Effects Card */}
          {adjustments.effects.traitEffects.length > 0 && (
            <Card 
              sx={{ 
                border: '1px solid #333',
                bgcolor: 'background.default',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main'
                }
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography 
                  variant="subtitle2" 
                  gutterBottom 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    color: 'primary.main',
                    fontWeight: 600,
                    mb: 1.5
                  }}
                >
                  <CheckCircle fontSize="small" />
                  Trait Effects
                </Typography>
                
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {adjustments.effects.traitEffects.map((effect: string, index: number) => (
                    <Chip 
                      key={index} 
                      size="small" 
                      label={effect} 
                      variant="filled" 
                      color="warning" 
                      sx={{ fontSize: '0.75rem' }} 
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          variant="outlined" 
          onClick={onCancel} 
          disabled={confirmPending}
          color="inherit"
          sx={{ minWidth: 100 }}
        >
          Cancel
        </Button>
        <Button 
          variant="contained"
          onClick={onConfirm}
          disabled={confirmPending}
          startIcon={confirmPending ? null : <CheckCircle />}
          sx={{ 
            minWidth: 160,
            fontWeight: 600
          }}
        >
          {confirmPending ? 'Assigning...' : 'Confirm Assignment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignmentEffectsPreviewDialog;