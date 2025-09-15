import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Divider,
  Chip,
  LinearProgress,
  Skeleton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Speed, TrendingUp, CheckCircle } from '@mui/icons-material';
import type { Settler } from '../../../../lib/types/settler';
import { formatTaskDuration } from '../../../../lib/utils/timeUtils';
import { isAssignmentPreview, isMapExplorationPreview, isSleepPreview, type BasePreviewResult, type MapExplorationPreviewResult, type SleepPreviewResult } from '../../../../lib/types/preview';
import SettlerAvatar from '../../../../lib/avatars/SettlerAvatar';

const getStatChipColor = (percent: number): "error" | "warning" | "secondary" | "primary" | "info" | "success" => {
  if (percent <= -66) return "error";
  if (percent < -33) return "warning";
  if (percent < 0) return "secondary";
  if (percent < 33) return "primary";
  if (percent < 66) return "info";
  return "success";
};
const getDurationChange = (base: number, adjusted: number) => {
  if (base === 0) return 0;
  return ((adjusted - base) / base) * 100;
};
const getLootChange = (multiplier: number) => (multiplier - 1) * 100;
const getBarColor = (percent: number, isBonusGood: boolean = true) => {
  if ((isBonusGood && percent > 0) || (!isBonusGood && percent < 0)) return 'success.main';
  if ((isBonusGood && percent < 0) || (!isBonusGood && percent > 0)) return 'error.main';
  return 'warning.main';
};

const EfficiencyBar = ({ percent, type }: { percent: number; type: 'duration' | 'loot'; }) => {
  const barColor = getBarColor(percent, type === 'loot');
  const base = 50;
  const maxFill = 100;
  const value = base + Math.max(-base, Math.min(maxFill-base, percent));
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

const StatChip = ({ stat, value }: { stat: string, value: number }) => {
  let percent = value;
  if (Math.abs(value) <= 1) percent = value * 99;
  else if (Math.abs(value) <= 10) percent = value * 10;
  let sxColor = {};
  if (percent < 0 && percent >= -33) sxColor = { backgroundColor: '#FFD600', color: '#333' };
  else if (percent >= 0 && percent < 33) sxColor = { backgroundColor: '#9C27B0', color: '#fff' };
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

export interface SettlerPreviewCardProps {
  settler: Settler;
  showSkills?: boolean;
  showStats?: boolean;
  onClick?: () => void;
  confirmPending?: boolean;
  // Preview data - if provided, will skip hook calls
  preview?: BasePreviewResult;
  isLoading?: boolean;
  error?: Error | null;
}

const SettlerPreviewCard: React.FC<SettlerPreviewCardProps> = ({
  settler,
  showSkills = true,
  showStats = false,
  onClick,
  confirmPending = false,
  preview: providedPreview,
  isLoading: providedIsLoading,
  error: providedError
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Use provided preview data
  const preview = providedPreview;
  const isLoading = providedIsLoading || false;
  const error = providedError || null;

  return (
    <Card
      sx={{
        cursor: confirmPending ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        border: '1px solid #333',
        '&:hover': {
          transform: confirmPending ? undefined : 'translateY(-2px)',
          boxShadow: confirmPending ? undefined : 4,
          borderColor: confirmPending ? undefined : 'primary.main'
        }
      }}
      onClick={() => !confirmPending && onClick?.()}
    >
      <CardContent sx={{ p: isMobile ? 1 : 1.5 }}>
        {/* Settler Basic Info */}
        <Box display="flex" alignItems="center" gap={isMobile ? 1 : 1.5} mb={isMobile ? 1 : 1.5}>
          <SettlerAvatar
            settler={settler}
            size={isMobile ? 28 : 32}
          />
          <Box flex={1}>
            <Typography 
              variant={isMobile ? "subtitle1" : "h6"} 
              fontWeight={600} 
              sx={{ 
                mb: 0.25,
                fontSize: isMobile ? '0.9rem' : '1rem',
                lineHeight: 1.2
              }}
            >
              {settler.name}
            </Typography>
          </Box>
        </Box>
        {/* Assignment Effects Preview */}
        <>
          <Divider sx={{ mb: isMobile ? 1 : 1.5 }} />
          <Typography
            variant="subtitle2"
            color="primary.main"
            sx={{ 
              mb: isMobile ? 0.75 : 1, 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}
          >
            <CheckCircle sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }} />
            Assignment Effects
          </Typography>
          {isLoading ? (
            <Box sx={{ mb: isMobile ? 1 : 1.5 }}>
              <Skeleton variant="text" width="60%" height={16} />
              <Skeleton variant="rectangular" width="100%" height={6} sx={{ my: 0.75, borderRadius: 3 }} />
              <Skeleton variant="text" width="40%" height={16} />
              <Skeleton variant="rectangular" width="100%" height={6} sx={{ my: 0.75, borderRadius: 3 }} />
            </Box>
          ) : error ? (
            <Typography 
              variant="body2" 
              color="error.main" 
              sx={{ 
                mb: isMobile ? 1 : 1.5,
                fontSize: isMobile ? '0.75rem' : '0.8rem'
              }}
            >
              Failed to load preview
            </Typography>
          ) : preview ? (
            <Box sx={{ mb: isMobile ? 1 : 1.5 }}>
              {isAssignmentPreview(preview) ? (
                <>
                  {/* Assignment Preview - Duration & Speed */}
                  <Box sx={{ mb: isMobile ? 1 : 1.25 }}>
                    <Box display="flex" alignItems="center" gap={1.5} mb={0.4}>
                      <Speed sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }} color="primary" />
                      <Typography 
                        variant="body2" 
                        fontWeight={600}
                        sx={{ fontSize: isMobile ? '0.75rem' : '0.8rem' }}
                      >
                        Task Duration: {formatTaskDuration(preview.baseDuration)} → {formatTaskDuration(preview.adjustments.adjustedDuration)}
                      </Typography>
                    </Box>
                    <EfficiencyBar
                      percent={getDurationChange(preview.baseDuration, preview.adjustments.adjustedDuration)}
                      type="duration"
                    />
                  </Box>
                  {/* Loot Multiplier */}
                  <Box sx={{ mb: isMobile ? 1 : 1.25 }}>
                    <Box display="flex" alignItems="center" gap={1.5} mb={0.4}>
                      <TrendingUp sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }} color="primary" />
                      <Typography 
                        variant="body2" 
                        fontWeight={600}
                        sx={{ fontSize: isMobile ? '0.75rem' : '0.8rem' }}
                      >
                        Loot Bonus
                      </Typography>
                    </Box>
                    <EfficiencyBar
                      percent={getLootChange(preview.adjustments.lootMultiplier)}
                      type="loot"
                    />
                  </Box>
                </>
              ) : isMapExplorationPreview(preview) ? (
                (() => {
                  // Type assertion to MapExplorationPreview
                  const mapPreview = preview as MapExplorationPreviewResult;
                  return (
                    <>
                      {/* Map Exploration Preview */}
                      <Box sx={{ mb: isMobile ? 1 : 1.25 }}>
                        <Box display="flex" alignItems="center" gap={1.5} mb={0.4}>
                          <Speed sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }} color="primary" />
                          <Typography 
                            variant="body2" 
                            fontWeight={600}
                            sx={{ fontSize: isMobile ? '0.75rem' : '0.8rem' }}
                          >
                            Exploration Duration: {formatTaskDuration(mapPreview.baseDuration)}
                          </Typography>
                        </Box>
                      </Box>
                      {/* Terrain Info */}
                      {mapPreview.terrain && (
                        <Box sx={{ mb: isMobile ? 1 : 1.25 }}>
                          <Typography 
                            variant="body2" 
                            fontWeight={600}
                            sx={{ fontSize: isMobile ? '0.75rem' : '0.8rem' }}
                          >
                            Terrain: {mapPreview.terrain.name}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}
                          >
                            {mapPreview.terrain.description}
                          </Typography>
                        </Box>
                      )}
                    </>
                  );
                })()
              ) : isSleepPreview(preview) ? (
                (() => {
                  // Type assertion to SleepPreview
                  const sleepPreview = preview as SleepPreviewResult;
                  return (
                    <>
                      {/* Sleep Preview */}
                      <Box sx={{ mb: isMobile ? 1 : 1.25 }}>
                        <Box display="flex" alignItems="center" gap={1.5} mb={0.4}>
                          <Speed sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }} color="primary" />
                          <Typography 
                            variant="body2" 
                            fontWeight={600}
                            sx={{ fontSize: isMobile ? '0.75rem' : '0.8rem' }}
                          >
                            Sleep Duration: {formatTaskDuration(sleepPreview.baseDuration)}
                          </Typography>
                        </Box>
                      </Box>
                      {/* Current Energy */}
                      <Box sx={{ mb: isMobile ? 1 : 1.25 }}>
                        <Typography 
                          variant="body2" 
                          fontWeight={600}
                          sx={{ fontSize: isMobile ? '0.75rem' : '0.8rem' }}
                        >
                          Current Energy: {Math.round((settler.energy ?? 0) * 10) / 10}/100
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}
                        >
                          Bed Level {sleepPreview.bedLevel} (Energy recovery rate: {sleepPreview.bedLevel === 1 ? '1.0x' : sleepPreview.bedLevel === 2 ? '1.3x' : '1.6x'})
                        </Typography>
                      </Box>
                      {/* Sleep Status */}
                      {!sleepPreview.canSleep && sleepPreview.reason && (
                        <Box sx={{ mb: isMobile ? 1 : 1.25 }}>
                          <Typography 
                            variant="body2" 
                            color="warning.main"
                            sx={{ fontSize: isMobile ? '0.75rem' : '0.8rem' }}
                          >
                            Cannot sleep: {sleepPreview.reason}
                          </Typography>
                        </Box>
                      )}
                    </>
                  );
                })()
              ) : null}
            </Box>
          ) : (
            <Typography 
              variant="body2" 
              color="warning.main" 
              sx={{ 
                mb: isMobile ? 1 : 1.5,
                fontSize: isMobile ? '0.75rem' : '0.8rem'
              }}
            >
              No assignment effects data available
            </Typography>
          )}
        </>
        <Divider sx={{ mb: isMobile ? 1 : 1.5 }} />
        {/* Settler Skills */}
        {showSkills && (
          <>
            <Typography 
              variant="subtitle2" 
              color="text.secondary" 
              sx={{ 
                mb: isMobile ? 0.4 : 0.75, 
                fontWeight: 600,
                fontSize: isMobile ? '0.75rem' : '0.8rem'
              }}
            >
              Skills:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.4} mb={isMobile ? 0.4 : 0.75}>
              {Object.entries(settler.skills).map(([skill, level]) => (
                <Chip
                  key={skill}
                  size="small"
                  label={`${skill}: ${level}`}
                  variant="filled"
                  color="secondary"
                  sx={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}
                />
              ))}
            </Box>
          </>
        )}
        {/* Settler Stats */}
        {showStats && (
          <>
            <Typography 
              variant="subtitle2" 
              color="text.secondary" 
              sx={{ 
                mb: isMobile ? 0.4 : 0.75, 
                fontWeight: 600,
                fontSize: isMobile ? '0.75rem' : '0.8rem'
              }}
            >
              Stats:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.4}>
              {Object.entries(settler.stats).map(([stat, value]) => (
                <StatChip key={stat} stat={stat} value={value as number} />
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SettlerPreviewCard;