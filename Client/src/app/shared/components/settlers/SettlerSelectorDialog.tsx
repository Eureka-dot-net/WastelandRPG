import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Divider,
  Chip,
  LinearProgress,
  Skeleton
} from '@mui/material';
import { Speed, TrendingUp, CheckCircle, Person } from '@mui/icons-material';
import type { Settler } from '../../../../lib/types/settler';
import type { Assignment, AssignmentAdjustments } from '../../../../lib/types/assignment';
import type { UseMutationResult } from '@tanstack/react-query';

interface SettlerSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (settler: Settler) => void;
  settlers: Settler[];
  selectedTask?: Assignment | null;
  previewAssignment?: UseMutationResult<
    {
      settlerId: string;
      settlerName: string;
      baseDuration: number;
      basePlannedRewards: Record<string, number>;
      adjustments: AssignmentAdjustments;
    },
    unknown,
    { assignmentId: string; settlerId: string }
  >;
  title?: string;
  emptyStateMessage?: string;
  emptyStateSubMessage?: string;
  showSkills?: boolean;
  showStats?: boolean;
  confirmPending?: boolean;
}

interface SettlerPreview {
  settler: Settler;
  adjustments?: AssignmentAdjustments;
  loading: boolean;
  error?: string;
}

const SettlerSelectorDialog: React.FC<SettlerSelectorDialogProps> = ({
  open,
  onClose,
  onSelect,
  settlers,
  selectedTask,
  previewAssignment,
  title = "Select Settler",
  emptyStateMessage = "No available settlers",
  emptyStateSubMessage = "All settlers are currently assigned to other tasks.",
  showSkills = true,
  showStats = false,
  confirmPending = false
}) => {
  const [settlerPreviews, setSettlerPreviews] = useState<SettlerPreview[]>([]);
  const avatarColors = ['primary.main', 'secondary.main', 'success.main', 'warning.main', 'info.main', 'error.main'];
  
  // Use refs to track current values and prevent infinite loops
  const currentTaskId = useRef<string | null>(null);
  const currentSettlerIds = useRef<string[]>([]);
  const isLoadingRef = useRef(false);

  const fetchPreviews = useCallback(async (task: Assignment, settlersToPreview: Settler[]) => {
    if (!previewAssignment || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    // Set initial loading state
    setSettlerPreviews(
      settlersToPreview.map(settler => ({
        settler,
        loading: true
      }))
    );

    try {
      // Fetch all previews in parallel
      const promises = settlersToPreview.map(async (settler) => {
        try {
          const data = await previewAssignment.mutateAsync({
            assignmentId: task._id,
            settlerId: settler._id
          });
          
          return {
            settler,
            adjustments: data.adjustments,
            loading: false
          };
        } catch (error) {
          console.error(`Failed to load preview for settler ${settler.name}:`, error);
          return {
            settler,
            loading: false,
            error: "Failed to load preview"
          };
        }
      });
      
      const results = await Promise.all(promises);
      setSettlerPreviews(results);
    } catch (error) {
      console.error('Error fetching previews:', error);
      // Set all to error state
      setSettlerPreviews(
        settlersToPreview.map(settler => ({
          settler,
          loading: false,
          error: "Failed to load preview"
        }))
      );
    } finally {
      isLoadingRef.current = false;
    }
  }, [previewAssignment]);

  // Load previews when dialog opens or task/settlers change
  useEffect(() => {
    if (!open) {
      setSettlerPreviews([]);
      currentTaskId.current = null;
      currentSettlerIds.current = [];
      return;
    }

    if (!selectedTask || !previewAssignment || settlers.length === 0) {
      return;
    }

    // Check if we need to reload (task changed or settlers changed)
    const newTaskId = selectedTask._id;
    const newSettlerIds = settlers.map(s => s._id).sort();
    const settlerIdsChanged = 
      currentSettlerIds.current.length !== newSettlerIds.length ||
      !currentSettlerIds.current.every((id, index) => id === newSettlerIds[index]);

    if (newTaskId !== currentTaskId.current || settlerIdsChanged) {
      currentTaskId.current = newTaskId;
      currentSettlerIds.current = newSettlerIds;
      fetchPreviews(selectedTask, settlers);
    }
  }, [open, selectedTask, settlers, fetchPreviews]);

  const formatDuration = (ms: number) => {
    const minutes = Math.ceil(ms / 60000);
    return `${minutes}m`;
  };

  const formatPercentage = (multiplier: number) => {
    const percentage = (multiplier - 1) * 100;
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(0)}%`;
  };

  const getEfficiencyColor = (multiplier: number) => {
    if (multiplier > 1.2) return 'success.main';
    if (multiplier > 1.0) return 'info.main';
    if (multiplier > 0.8) return 'warning.main';
    return 'error.main';
  };

  const getEfficiencyBar = (multiplier: number, type: 'speed' | 'loot') => {
    const baseValue = 50; // 50% represents 1.0x (baseline)
    const maxValue = type === 'speed' ? 150 : 120; // Speed can go higher than loot typically
    const value = Math.min(maxValue, Math.max(10, baseValue * multiplier));

    return (
      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" sx={{ minWidth: 60, fontSize: '0.7rem' }}>
          {formatPercentage(multiplier)}
        </Typography>
        <Box sx={{ flexGrow: 1, position: 'relative' }}>
          <LinearProgress
            variant="determinate"
            value={value}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getEfficiencyColor(multiplier),
                borderRadius: 4,
              },
            }}
          />
          {/* Baseline indicator at 50% */}
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: -1,
              width: 2,
              height: 10,
              backgroundColor: 'text.secondary',
              transform: 'translateX(-50%)',
            }}
          />
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'background.paper', border: '1px solid #333' }
      }}
    >
      <DialogTitle sx={{ color: 'primary.main', pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Person color="primary" />
          {title}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, maxHeight: '70vh', overflowY: 'auto' }}>
        <Box display="flex" flexDirection="column" gap={2}>
          {settlerPreviews.map((preview, index) => {
            const { settler, adjustments, loading, error } = preview;
            const avatarColor = avatarColors[index % avatarColors.length];

            return (
              <Card
                key={settler._id}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid #333',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                    borderColor: 'primary.main'
                  }
                }}
                onClick={() => !confirmPending && onSelect(settler)}
              >
                <CardContent sx={{ p: 2 }}>
                  {/* Settler Basic Info */}
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar
                      sx={{
                        bgcolor: avatarColor,
                        width: 48,
                        height: 48,
                        fontSize: '1rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {settler.name.charAt(0)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                        {settler.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        {settler.backstory}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Assignment Effects Preview */}
                  {selectedTask && (
                    <>
                      <Divider sx={{ mb: 2 }} />
                      <Typography
                        variant="subtitle2"
                        color="primary.main"
                        sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <CheckCircle fontSize="small" />
                        Assignment Effects
                      </Typography>

                      {loading ? (
                        <Box sx={{ mb: 2 }}>
                          <Skeleton variant="text" width="60%" height={20} />
                          <Skeleton variant="rectangular" width="100%" height={8} sx={{ my: 1, borderRadius: 4 }} />
                          <Skeleton variant="text" width="40%" height={20} />
                          <Skeleton variant="rectangular" width="100%" height={8} sx={{ my: 1, borderRadius: 4 }} />
                        </Box>
                      ) : error ? (
                        <Typography variant="body2" color="error.main" sx={{ mb: 2 }}>
                          {error}
                        </Typography>
                      ) : adjustments ? (
                        <Box sx={{ mb: 2 }}>
                          {/* Duration & Speed */}
                          <Box sx={{ mb: 1.5 }}>
                            <Box display="flex" alignItems="center" gap={2} mb={0.5}>
                              <Speed fontSize="small" color="primary" />
                              <Typography variant="body2" fontWeight={600}>
                                Task Duration: {formatDuration(selectedTask.duration || 0)} → {formatDuration(adjustments.adjustedDuration)}
                              </Typography>
                            </Box>
                            {getEfficiencyBar(adjustments.effectiveSpeed, 'speed')}
                          </Box>

                          {/* Loot Multiplier */}
                          <Box sx={{ mb: 1.5 }}>
                            <Box display="flex" alignItems="center" gap={2} mb={0.5}>
                              <TrendingUp fontSize="small" color="primary" />
                              <Typography variant="body2" fontWeight={600}>
                                Loot Bonus
                              </Typography>
                            </Box>
                            {getEfficiencyBar(adjustments.lootMultiplier, 'loot')}
                          </Box>

                          {/* Active Effects */}
                          {(adjustments.effects.speedEffects.length > 0 ||
                            adjustments.effects.lootEffects.length > 0 ||
                            adjustments.effects.traitEffects.length > 0) && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                  Active Effects:
                                </Typography>
                                <Box display="flex" flexWrap="wrap" gap={0.5}>
                                  {adjustments.effects.speedEffects.map((effect: string, i: number) => (
                                    <Chip key={`speed-${i}`} size="small" label={effect} color="info" sx={{ fontSize: '0.65rem' }} />
                                  ))}
                                  {adjustments.effects.lootEffects.map((effect: string, i: number) => (
                                    <Chip key={`loot-${i}`} size="small" label={effect} color="success" sx={{ fontSize: '0.65rem' }} />
                                  ))}
                                  {adjustments.effects.traitEffects.map((effect: string, i: number) => (
                                    <Chip key={`trait-${i}`} size="small" label={effect} color="warning" sx={{ fontSize: '0.65rem' }} />
                                  ))}
                                </Box>
                              </Box>
                            )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                          No assignment effects data available
                        </Typography>
                      )}
                    </>
                  )}

                  <Divider sx={{ mb: 2 }} />

                  {/* Settler Skills */}
                  {showSkills && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                        Skills:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                        {Object.entries(settler.skills).map(([skill, level]) => (
                          <Chip
                            key={skill}
                            size="small"
                            label={`${skill}: ${level}`}
                            variant="filled"
                            color="secondary"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                    </>
                  )}

                  {/* Settler Stats */}
                  {showStats && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                        Stats:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {Object.entries(settler.stats).map(([stat, level]) => (
                          <Chip
                            key={stat}
                            size="small"
                            label={`${stat}: ${level}`}
                            variant="outlined"
                            color="primary"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {settlers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {emptyStateMessage}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {emptyStateSubMessage}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={confirmPending}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettlerSelectorDialog;