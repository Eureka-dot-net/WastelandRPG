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
import { formatTaskDuration } from '../../../../lib/utils/timeUtils';
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

// Color scale for speed stat chip
const getSpeedChipColor = (multiplier: number): "error" | "warning" | "secondary" | "primary" | "info" | "success" => {
  if (multiplier < 0.25) return "error";        // red
  if (multiplier < 0.66) return "warning";      // orange
  if (multiplier < 1.0) return "secondary";     // yellow (MUI default is purple, override with sx for yellow)
  if (multiplier < 1.25) return "primary";      // purple (MUI default is blue, override with sx for purple)
  if (multiplier < 1.5) return "info";          // blue
  return "success";                             // green
};

// Color scale for stat chips (-99% to +99%)
const getStatChipColor = (percent: number): "error" | "warning" | "secondary" | "primary" | "info" | "success" => {
  if (percent <= -66) return "error";         // deep negative
  if (percent < -33) return "warning";        // moderate negative
  if (percent < 0) return "secondary";        // slight negative
  if (percent < 33) return "primary";         // slight positive
  if (percent < 66) return "info";            // moderate positive
  return "success";                           // strong positive
};


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
    setSettlerPreviews(
      settlersToPreview.map(settler => ({
        settler,
        loading: true
      }))
    );
    try {
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
  }, [open, selectedTask, settlers, fetchPreviews, previewAssignment]);

  // Duration: +% means slower/penalty, -% means faster/bonus
  const getDurationChange = (base: number, adjusted: number) => {
    if (base === 0) return 0;
    return ((adjusted - base) / base) * 100;
  };
  // Loot: +% means more loot/bonus, -% means less loot/penalty
  const getLootChange = (multiplier: number) => {
    return (multiplier - 1) * 100;
  };

  const getBarColor = (percent: number, isBonusGood: boolean = true) => {
    if ((isBonusGood && percent > 0) || (!isBonusGood && percent < 0)) return 'success.main';
    if ((isBonusGood && percent < 0) || (!isBonusGood && percent > 0)) return 'error.main';
    return 'warning.main';
  };

  // Efficiency bar visualizes % change, not raw multiplier
  const EfficiencyBar = ({
    percent,
    type
  }: {
    percent: number;
    type: 'duration' | 'loot';
  }) => {
    const barColor = getBarColor(percent, type === 'loot');
    const base = 50; // baseline
    const maxFill = 100;
    let value = base;
    value = base + Math.max(-base, Math.min(maxFill-base, percent));
    return (
      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" sx={{ minWidth: 60, fontSize: '0.7rem', color: barColor }}>
          {(percent > 0 ? '+' : '') + percent.toFixed(0) + '%'}
        </Typography>
        <Box sx={{ flexGrow: 1, position: 'relative' }}>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, value))}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                backgroundColor: barColor,
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

  // Helper to parse effect strings, display colored chips (+green, -red, yellow, purple, blue, etc.)
  const EffectChip = ({ effect }: { effect: string }) => {
    // Speed stat chip with color scale
    if (effect.includes('Speed stat:')) {
      const multiplierMatch = effect.match(/Speed stat:\s*([\d.]+)x/);
      let multiplier = 1.0;
      if (multiplierMatch) multiplier = parseFloat(multiplierMatch[1]);
      // For custom yellow/purple, override MUI defaults with sx if desired
      let sxColor = {};
      if (multiplier < 1.0) sxColor = { backgroundColor: '#FFD600', color: '#333' }; // yellow
      else if (multiplier >= 1.0 && multiplier < 1.25) sxColor = { backgroundColor: '#9C27B0', color: '#fff' }; // purple
      return (
        <Chip
          size="small"
          label={effect}
          color={getSpeedChipColor(multiplier)}
          sx={{ fontSize: '0.65rem', ...sxColor }}
        />
      );
    }
    // Percent-based chips for loot/trait/stat
    const percentMatch = effect.match(/([+-]?\d+)%/);
    let percent = 0;
    if (percentMatch) percent = parseInt(percentMatch[1], 10);
    let sxColor = {};
    if (percent < 0 && percent >= -33) sxColor = { backgroundColor: '#FFD600', color: '#333' }; // yellow for slight negative
    else if (percent >= 0 && percent < 33) sxColor = { backgroundColor: '#9C27B0', color: '#fff' }; // purple for slight positive
    return (
      <Chip
        size="small"
        label={effect}
        color={getStatChipColor(percent)}
        sx={{ fontSize: '0.65rem', ...sxColor }}
      />
    );
  };

  // Helper for stat chips (-99% to +99%)
  const StatChip = ({ stat, value }: { stat: string, value: number }) => {
    // Map stat to percent: e.g. -99% to +99%
    // You can adjust this formula for your stat scale
    // Example: statValue -10 to +10 => percent = statValue * 10
    let percent = value;
    if (Math.abs(value) <= 1) percent = value * 99; // If values are normalized -1 to 1
    else if (Math.abs(value) <= 10) percent = value * 10; // If values -10 to 10
    // If already -99 to 99, leave as is
    let sxColor = {};
    if (percent < 0 && percent >= -33) sxColor = { backgroundColor: '#FFD600', color: '#333' }; // yellow for slight negative
    else if (percent >= 0 && percent < 33) sxColor = { backgroundColor: '#9C27B0', color: '#fff' }; // purple for slight positive
    return (
      <Chip
        key={stat}
        size="small"
        label={`${stat}: ${percent > 0 ? "+" : ""}${percent.toFixed(0)}%`}
        color={getStatChipColor(percent)}
        sx={{ fontSize: '0.75rem', ...sxColor }}
      />
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
        <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={2}>
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
                        width: 35,
                        height: 35,
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
                                Task Duration: {formatTaskDuration(selectedTask.duration || 0)} → {formatTaskDuration(adjustments.adjustedDuration)}
                              </Typography>
                            </Box>
                            <EfficiencyBar
                              percent={getDurationChange(selectedTask.duration || 0, adjustments.adjustedDuration)}
                              type="duration"
                            />
                          </Box>

                          {/* Loot Multiplier */}
                          <Box sx={{ mb: 1.5 }}>
                            <Box display="flex" alignItems="center" gap={2} mb={0.5}>
                              <TrendingUp fontSize="small" color="primary" />
                              <Typography variant="body2" fontWeight={600}>
                                Loot Bonus
                              </Typography>
                            </Box>
                            <EfficiencyBar
                              percent={getLootChange(adjustments.lootMultiplier)}
                              type="loot"
                            />
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
                                    <EffectChip key={`speed-${i}`} effect={effect} />
                                  ))}
                                  {adjustments.effects.lootEffects.map((effect: string, i: number) => (
                                    <EffectChip key={`loot-${i}`} effect={effect} />
                                  ))}
                                  {adjustments.effects.traitEffects.map((effect: string, i: number) => (
                                    <EffectChip key={`trait-${i}`} effect={effect} />
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
                        {Object.entries(settler.stats).map(([stat, value]) => (
                          <StatChip key={stat} stat={stat} value={value as number} />
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