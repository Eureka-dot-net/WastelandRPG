import { Explore, KeyboardArrowUp, KeyboardArrowLeft, ZoomOut, KeyboardArrowRight, KeyboardArrowDown, Lock, Timer } from "@mui/icons-material";
import { useMediaQuery, Tooltip, Box, Typography, Card, CardContent, LinearProgress, Container, Paper, IconButton, Grid, useTheme } from "@mui/material";
import { useMemo } from "react";
import DynamicIcon from "../../app/shared/components/DynamicIcon";
import SettlerSelectorDialog from "../../app/shared/components/settlers/SettlerSelectorDialog";
import ErrorDisplay from "../../app/shared/components/ui/ErrorDisplay";
import LoadingDisplay from "../../app/shared/components/ui/LoadingDisplay";
import ProgressHeader from "../../app/shared/components/ui/ProgressHeader";
import SettlerAvatar from "../../lib/avatars/SettlerAvatar";
import { useServerContext } from "../../lib/contexts/ServerContext";
import { useMap } from "../../lib/hooks/useMap";
import { useMapContext } from "../../lib/hooks/useMapContext";
import { useAssignmentPage, createMapExplorationConfig } from "../../lib/hooks/useAssignmentPage";
import { useColony } from "../../lib/hooks/useColony";
import type { MapTileAPI } from "../../lib/types/mapResponse";
import type { Settler } from "../../lib/types/settler";
import { formatTimeRemaining } from "../../lib/utils/timeUtils";


function MapPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentServerId: serverId } = useServerContext();
  const { centerX, centerY, moveUp, moveDown, moveLeft, moveRight, zoomOut } = useMapContext();

  const { colony } = useColony(serverId);
  const { map, loadingMap, startExploration } = useMap(serverId, colony?._id, centerX, centerY);

  // Get explorable coordinates for useAssignmentPage - memoize more carefully
  const mapTiles = map?.grid?.tiles;
  const explorableCoordinates = useMemo(() => {
    if (!mapTiles) return [];

    const coords: { x: number; y: number }[] = [];
    mapTiles.forEach((row, rowIndex) => {
      row.forEach((tile, colIndex) => {
        if (tile.canExplore) {
          const worldX = centerX - 2 + colIndex;
          const worldY = centerY + 2 - rowIndex;
          coords.push({ x: worldX, y: worldY });
        }
      });
    });
    return coords;
  }, [mapTiles, centerX, centerY]);

  // Create a wrapper for the mutation to match StartAssignmentMutation interface
  const startExplorationWrapper = useMemo(() => ({
    mutate: (params: Record<string, unknown>, options?: { onSettled?: () => void }) => {
      const { row, col, settlerId, previewDuration } = params;
      startExploration.mutate(
        {
          row: row as number,
          col: col as number,
          settlerId: settlerId as string,
          previewDuration: previewDuration as number | undefined
        },
        options
      );
    },
    isPending: startExploration.isPending,
  }), [startExploration]);

  // Create configuration for useAssignmentPage hook - memoized to prevent infinite loops
  const config = useMemo(() => createMapExplorationConfig(startExplorationWrapper), [startExplorationWrapper]);

  // Use the common assignment page hook
  const {
    colony: assignmentPageColony,
    colonyLoading,
    availableSettlers,
    handleTargetSelect: handleTileClick,
    handleSettlerSelect: handleSettlerSelectFromDialog,
    handleDialogClose,
    settlerDialogOpen,
    settlerPreviews,
    previewsLoading,
    previewsError,
    isTargetStarting,
    getTargetTimeRemaining,
  } = useAssignmentPage(serverId || '', explorableCoordinates, config);

  // Use both colony sources for display - prefer assignmentPageColony for consistency
  const displayColony = assignmentPageColony || colony;

  // Custom handler that converts tile to coordinate and calls hook handler
  const handleTileClickCustom = (tile: MapTileAPI) => {
    if (!tile.canExplore || !availableSettlers.length) return;

    // Calculate world coordinates from grid position
    const worldX = centerX - 2 + tile.position.col;
    const worldY = centerY + 2 - tile.position.row;

    // Create coordinate object that matches our target type
    const coordinate =  { x: worldX, y: worldY };
    handleTileClick(coordinate);
  };

  const renderTile = (tile: MapTileAPI, rowIndex: number, colIndex: number) => {
    const worldX = centerX - 2 + colIndex;
    const worldY = centerY + 2 - rowIndex;
    const coordinate = { x: worldX, y: worldY };

    // Get in-progress assignments for this tile
    const inProgressAssignments = tile.assignments?.filter(a => a.state === 'in-progress') || [];

    // Get settlers assigned to this tile from the colony data
    const assignedSettlers = inProgressAssignments
      .map(assignment => displayColony?.settlers?.find(s => s._id === assignment.settlerId))
      .filter((settler): settler is Settler => settler !== undefined);

    // Calculate progress for assignments
    const assignmentsWithProgress = inProgressAssignments.map(assignment => {
      const timeRemaining = getTargetTimeRemaining(assignment._id);
      let progress = 0;

      if (assignment.adjustments?.adjustedDuration && timeRemaining != null) {
        progress = Math.max(0, Math.min(100,
          ((assignment.adjustments.adjustedDuration - timeRemaining) / assignment.adjustments.adjustedDuration) * 100
        ));
      }

      // Find the settler for this assignment
      const assignedSettler = displayColony?.settlers?.find(s => s._id === assignment.settlerId);

      return {
        ...assignment,
        progress,
        timeRemaining,
        settler: assignedSettler
      };
    });

    const isStarting = isTargetStarting(coordinate);
    const canClick = tile.canExplore && availableSettlers.length > 0 && !isStarting;

    return (
      <Tooltip
        key={`${rowIndex}-${colIndex}`}
        title={
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Position: ({worldX}, {worldY})
            </Typography>
            {assignedSettlers.length > 0 && (
              <>
                <Typography variant="body2" color="secondary.main">
                  Exploring: {assignedSettlers.map(s => {
                    const assignment = assignmentsWithProgress.find(a => a.settlerId === s._id);
                    const progress = assignment?.progress || 0;
                    let phase = 'preparing';
                    if (progress < 33) phase = 'traveling there';
                    else if (progress < 67) phase = 'exploring';
                    else phase = 'returning';
                    return `${s.name} (${phase})`;
                  }).join(', ')}
                </Typography>
                {assignmentsWithProgress.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Progress: {Math.round(assignmentsWithProgress[0]?.progress || 0)}%
                    {assignmentsWithProgress[0]?.timeRemaining != null && assignmentsWithProgress[0].timeRemaining > 0 &&
                      ` • ${formatTimeRemaining(assignmentsWithProgress[0].timeRemaining)} remaining`
                    }
                  </Typography>
                )}
              </>
            )}
            {tile.explored && (
              <>
                {tile.terrain && (
                  <Typography variant="body2">
                    Terrain: {tile.terrain.type} - {tile.terrain.description}
                  </Typography>
                )}
                {tile.terrain?.rewards && Object.keys(tile.terrain.rewards).length > 0 && (
                  <Typography variant="body2">
                    Loot: {Object.entries(tile.terrain.rewards).map(([item]) => `${item}`).join(', ')}
                  </Typography>
                )}
                {/* {tile.threat && (
                  <Typography variant="body2">
                    Threat: {tile.threat.type} (Level {tile.threat.level})
                  </Typography>
                )}
                {tile.event && (
                  <Typography variant="body2">
                    Event: {tile.event.description}
                  </Typography>
                )} */}
              </>
            )}
            {tile.canExplore && (
              <Typography variant="body2" color="primary">
                Click to explore
              </Typography>
            )}
            {!tile.canExplore && !tile.explored && (
              <Typography variant="body2" color="text.secondary">
                Cannot explore yet
              </Typography>
            )}
          </Box>
        }
        placement="top"
      >
        <Card
          sx={{
            height: isMobile ? 80 : 120,
            cursor: canClick ? 'pointer' : 'default',
            // Enhanced wasteland themed backgrounds
            background: !tile.explored
              ? tile.canExplore
                ? `linear-gradient(135deg, 
                    ${theme.palette.warning.light} 0%, 
                    ${theme.palette.warning.main} 50%, 
                    ${theme.palette.warning.dark} 100%)`
                : `linear-gradient(135deg, 
                    ${theme.palette.grey[500]} 0%, 
                    ${theme.palette.grey[600]} 50%, 
                    ${theme.palette.grey[700]} 100%)`
              : tile.terrain?.type === 'ruins' || tile.terrain?.type === 'scrapyard'
                ? `linear-gradient(135deg, 
                    ${theme.palette.error.light} 0%, 
                    ${theme.palette.background.paper} 30%, 
                    ${theme.palette.error.dark} 100%)`
                : tile.terrain?.type === 'wasteland' 
                ? `linear-gradient(135deg, 
                    ${theme.palette.warning.light} 0%, 
                    ${theme.palette.background.paper} 50%, 
                    ${theme.palette.grey[200]} 100%)`
                : `linear-gradient(135deg, 
                    ${theme.palette.success.light} 0%, 
                    ${theme.palette.background.paper} 50%, 
                    ${theme.palette.success.main} 100%)`,
            // Enhanced borders with wasteland theme
            border: tile.canExplore && !tile.explored
              ? `3px solid ${theme.palette.warning.dark}`
              : tile.explored
                ? `2px solid ${theme.palette.success.main}`
                : `2px solid ${theme.palette.grey[400]}`,
            borderRadius: '8px',
            opacity: !tile.explored && !tile.canExplore ? 0.4 : 1,
            position: 'relative',
            // Enhanced shadows for depth
            boxShadow: tile.explored
              ? `inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.15)`
              : `inset 0 1px 2px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.1)`,
            // Enhanced hover effects
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': canClick ? {
              transform: 'translateY(-2px) scale(1.02)',
              boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1), 0 6px 20px rgba(0,0,0,0.15)`,
              background: `linear-gradient(135deg, 
                ${theme.palette.warning.main} 0%, 
                ${theme.palette.warning.light} 50%, 
                ${theme.palette.warning.main} 100%)`,
              borderColor: theme.palette.warning.dark,
            } : {},
            // Simplified styling
          }}
          onClick={() => handleTileClickCustom(tile)}
        >
          <CardContent sx={{
            p: 1,
            '&:last-child': { pb: 1 },
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: 'transparent',
          }}>
            {/* Fog of War, Starting State, or Content */}
            {isStarting ? (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: 0.9,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 0.9 },
                  '50%': { opacity: 0.6 },
                  '100%': { opacity: 0.9 },
                }
              }}>
                <Timer color="warning" sx={{ fontSize: isMobile ? '1.5rem' : '2rem' }} />
                <Typography variant="caption" sx={{ 
                  mt: 0.5, 
                  textAlign: 'center', 
                  color: 'warning.main',
                  fontWeight: 600,
                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                }}>
                  Gathering gear...
                </Typography>
              </Box>
            ) : !tile.explored ? (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: tile.canExplore ? 0.8 : 0.4,
                filter: tile.canExplore ? 'none' : 'grayscale(100%)',
                transition: 'all 0.3s ease'
              }}>
                {tile.canExplore ? (
                  <>
                    <Explore 
                      color="warning" 
                      sx={{ 
                        fontSize: isMobile ? '1.5rem' : '2rem',
                        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
                      }} 
                    />
                    <Typography variant="caption" sx={{ 
                      mt: 0.5, 
                      textAlign: 'center',
                      color: 'warning.dark',
                      fontWeight: 600,
                      textShadow: '1px 1px 2px rgba(255,255,255,0.5)'
                    }}>
                      Explore
                    </Typography>
                  </>
                ) : (
                  <>
                    <Lock 
                      color="disabled" 
                      sx={{ 
                        fontSize: isMobile ? '1.2rem' : '1.5rem',
                        filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.2))'
                      }} 
                    />
                    <Typography variant="caption" sx={{ 
                      mt: 0.5, 
                      textAlign: 'center',
                      color: 'text.disabled',
                      fontSize: '0.7rem'
                    }}>
                      Locked
                    </Typography>
                  </>
                )}
              </Box>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                zIndex: 2
              }}>
                {tile.terrain?.icon && (
                  (isMobile && assignedSettlers.length <= 1) ||
                  (!isMobile && assignedSettlers.length <= 1)
                ) &&
                  <Box
                    component={DynamicIcon}
                    name={tile.terrain.icon} 
                    size={isMobile ? "1.5rem" : "2rem"}
                    sx={{
                      filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.25))',
                      color: tile.terrain?.type === 'ruins' ? '#d32f2f' : 
                             tile.terrain?.type === 'wasteland' ? '#f57c00' :
                             tile.terrain?.type === 'forest' ? '#388e3c' : 'inherit'
                    }}
                  />
                }
                <Typography variant="caption" sx={{ 
                  mt: 0.5, 
                  textAlign: 'center',
                  fontWeight: 600,
                  color: tile.terrain?.type === 'ruins' ? 'error.dark' : 
                         tile.terrain?.type === 'wasteland' ? 'warning.dark' :
                         tile.terrain?.type === 'forest' ? 'success.dark' : 'text.primary',
                  textShadow: '1px 1px 2px rgba(255,255,255,0.7)',
                  fontSize: isMobile ? '0.7rem' : '0.75rem'
                }}>
                  {tile.terrain?.type || 'Unknown'}
                </Typography>
              </Box>
            )}

            {/* Progress bars for in-progress explorations */}
            {assignmentsWithProgress.length > 0 && (
              <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                px: 0.5,
                pb: 0.5
              }}>
                {assignmentsWithProgress.filter(a => a.progress > 0 && a.progress < 100).slice(0, 2).map((assignment, idx) => (
                  <Box
                    key={assignment._id}
                    sx={{
                      mb: idx < assignmentsWithProgress.length - 1 ? 0.25 : 0,
                      display: 'flex',
                      alignItems: 'center', // vertically center the time with the bar
                      gap: 0.5 // optional: space between time and bar
                    }}
                  >
                    <LinearProgress
                      variant="determinate"
                      value={assignment.progress}
                      sx={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          background: `linear-gradient(90deg, 
                            ${theme.palette.warning.main} 0%, 
                            ${theme.palette.warning.light} 50%, 
                            ${theme.palette.success.main} 100%)`,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                            animation: 'shimmer 2s infinite',
                          }
                        },
                        '@keyframes shimmer': {
                          '0%': { transform: 'translateX(-100%)' },
                          '100%': { transform: 'translateX(100%)' }
                        }
                      }}
                    />
                    {!isMobile && assignment.timeRemaining != null && assignment.timeRemaining > 0 && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.6rem',
                          color: 'text.secondary',
                          whiteSpace: 'nowrap' // prevent wrapping
                        }}
                      >
                        {formatTimeRemaining(assignment.timeRemaining)}
                      </Typography>
                    )}
                  </Box>
                ))}
                {assignmentsWithProgress.length > 2 && (
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                    +{assignmentsWithProgress.length - 2} more
                  </Typography>
                )}
              </Box>
            )}

            {/* Settler avatars for in-progress explorations */}
            {assignedSettlers.length > 0 && (
              <Box sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                display: 'flex',
                gap: 0.5,
                flexWrap: 'wrap',
                maxWidth: isMobile ? 50 : 70,
              }}>
                {assignedSettlers.slice(0, 3).map((settler, idx) => {
                  // Find the assignment for this settler to get progress
                  const assignment = assignmentsWithProgress.find(a => a.settlerId === settler._id);
                  const progress = assignment?.progress || 0;

                  // Determine exploration phase
                  let phase: 'traveling' | 'exploring' | 'returning';
                  if (progress < 33) {
                    phase = 'traveling';
                  } else if (progress < 67) {
                    phase = 'exploring';
                  } else {
                    phase = 'returning';
                  }

                  // Get phase indicator
                  const getPhaseIndicator = () => {
                    switch (phase) {
                      case 'traveling':
                        return '→'; // Arrow pointing to destination
                      case 'exploring':
                        return '🔍'; // Magnifying glass for exploring
                      case 'returning':
                        return '←'; // Arrow pointing back
                      default:
                        return '';
                    }
                  };

                  return (
                      <Box key={settler._id} sx={{
                        position: 'relative',
                        zIndex: assignedSettlers.length - idx,
                        '&:hover': {
                          transform: 'scale(1.1)',
                          transition: 'transform 0.2s ease'
                        }
                      }}>
                        <Box
                          component={SettlerAvatar}
                          settler={settler}
                          size={isMobile ? 20 : 30}
                          sx={{
                            border: `2px solid ${phase === 'exploring' ? theme.palette.success.main : 
                                                 phase === 'traveling' ? theme.palette.warning.main : 
                                                 theme.palette.primary.main}`,
                            borderRadius: '50%',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                          }}
                        />
                        {/* Enhanced phase indicator */}
                        <Box sx={{
                          position: 'absolute',
                          bottom: -3,
                          right: -3,
                          width: isMobile ? 12 : 16,
                          height: isMobile ? 12 : 16,
                          borderRadius: '50%',
                          bgcolor: phase === 'exploring' ? 'success.main' : 
                                   phase === 'traveling' ? 'warning.main' : 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: isMobile ? '0.5rem' : '0.6rem',
                          color: 'white',
                          fontWeight: 'bold',
                          border: `2px solid ${theme.palette.background.paper}`,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                          animation: phase === 'exploring' ? 'pulse 2s infinite' : 'none',
                          '@keyframes pulse': {
                            '0%': { transform: 'scale(1)' },
                            '50%': { transform: 'scale(1.2)' },
                            '100%': { transform: 'scale(1)' }
                          }
                        }}>
                          {getPhaseIndicator()}
                        </Box>
                      </Box>
                  );
                })}
                {assignedSettlers.length > 3 && (
                  <Box sx={{
                    width: isMobile ? 20 : 24,
                    height: isMobile ? 20 : 24,
                    borderRadius: '50%',
                    bgcolor: 'grey.300',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid',
                    borderColor: 'grey.400'
                  }}>
                    <Typography variant="caption" sx={{ fontSize: '0.5rem', fontWeight: 'bold' }}>
                      +{assignedSettlers.length - 3}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Starting indicator */}
            {isStarting && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Typography variant="caption">Gathering gear...</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Tooltip>
    );
  };

  if (colonyLoading || loadingMap || !serverId) {
    return (
      <LoadingDisplay
        showContainer={true}
        minHeight="100vh"
        size={80}
      />
    );
  }

  if (!map || !displayColony) {
    return (
      <ErrorDisplay
        error="Failed to load map data"
        showContainer={true}
      />
    );
  }

  // Calculate exploration stats
  const totalTiles = map.grid.tiles.flat();
  const exploredTiles = totalTiles.filter(tile => tile.explored).length;
  const totalExploredCount = exploredTiles;

  return (
    <Container maxWidth="lg" sx={{ px: isMobile ? 0 : 2 }}>
      <ProgressHeader
        title="Exploration"
        emoji="🗺️"
        alertMessage="Explore the surrounding area to find resources and expand your territory."
        alertSeverity="info"
        progressLabel="Area Explored"
        currentValue={totalExploredCount}
        totalValue={25} // 5x5 grid
        progressColor="primary"
      />

      {/* Enhanced Navigation Controls */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          mb: 3,
          background: `linear-gradient(135deg, 
            ${theme.palette.background.paper} 0%, 
            ${theme.palette.grey[50]} 50%, 
            ${theme.palette.background.paper} 100%)`,
          border: `2px solid ${theme.palette.divider}`,
          borderRadius: '12px',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23000" fill-opacity="0.02"%3E%3Cpath d="M0 0h40v40H0z"%2F%3E%3Cpath d="M0 20h40"%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E")',
            borderRadius: 'inherit',
            pointerEvents: 'none',
          }
        }}
      >
        <Box sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? 2 : 3,
          position: 'relative',
          zIndex: 1
        }}>
          {isMobile && (
            <Typography variant="h6" sx={{ 
              fontWeight: 'bold',
              color: 'text.primary',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              🗺️ Position: ({centerX}, {centerY})
            </Typography>
          )}

          {!isMobile && (
            <Typography variant="h5" sx={{ 
              mr: 3,
              fontWeight: 'bold', 
              color: 'text.primary',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              🗺️ Position: ({centerX}, {centerY})
            </Typography>
          )}

          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: 0.5
          }}>
            <IconButton 
              onClick={moveUp} 
              color="primary" 
              size={isMobile ? "medium" : "large"}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4]
                },
                transition: 'all 0.2s ease',
                border: `2px solid ${theme.palette.primary.dark}`,
                boxShadow: theme.shadows[2]
              }}
            >
              <KeyboardArrowUp />
            </IconButton>
            <Box sx={{ 
              display: 'flex', 
              gap: 0.5,
              alignItems: 'center'
            }}>
              <IconButton 
                onClick={moveLeft} 
                color="primary" 
                size={isMobile ? "medium" : "large"}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    transform: 'translateX(-2px)',
                    boxShadow: theme.shadows[4]
                  },
                  transition: 'all 0.2s ease',
                  border: `2px solid ${theme.palette.primary.dark}`,
                  boxShadow: theme.shadows[2]
                }}
              >
                <KeyboardArrowLeft />
              </IconButton>
              <IconButton 
                onClick={zoomOut} 
                color="secondary" 
                disabled 
                size={isMobile ? "medium" : "large"}
                sx={{
                  bgcolor: 'grey.300',
                  color: 'grey.500',
                  border: `2px solid ${theme.palette.grey[400]}`,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  mx: 1
                }}
              >
                <ZoomOut />
              </IconButton>
              <IconButton 
                onClick={moveRight} 
                color="primary" 
                size={isMobile ? "medium" : "large"}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    transform: 'translateX(2px)',
                    boxShadow: theme.shadows[4]
                  },
                  transition: 'all 0.2s ease',
                  border: `2px solid ${theme.palette.primary.dark}`,
                  boxShadow: theme.shadows[2]
                }}
              >
                <KeyboardArrowRight />
              </IconButton>
            </Box>
            <IconButton 
              onClick={moveDown} 
              color="primary" 
              size={isMobile ? "medium" : "large"}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                  transform: 'translateY(2px)',
                  boxShadow: theme.shadows[4]
                },
                transition: 'all 0.2s ease',
                border: `2px solid ${theme.palette.primary.dark}`,
                boxShadow: theme.shadows[2]
              }}
            >
              <KeyboardArrowDown />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Enhanced Map Grid */}
      <Paper 
        elevation={4} 
        sx={{ 
          p: isMobile ? 1.5 : 3, 
          mb: 3,
          background: `radial-gradient(circle at center, 
            ${theme.palette.background.paper} 0%, 
            ${theme.palette.grey[50]} 70%, 
            ${theme.palette.grey[100]} 100%)`,
          border: `3px solid ${theme.palette.grey[300]}`,
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 20%, rgba(255,165,0,0.05) 0%, transparent 30%),
              radial-gradient(circle at 80% 80%, rgba(139,69,19,0.05) 0%, transparent 30%)
            `,
            pointerEvents: 'none',
          },
          // Add subtle inner shadow
          boxShadow: `
            inset 0 2px 8px rgba(0,0,0,0.05),
            0 4px 16px rgba(0,0,0,0.1)
          `
        }}
      >
        <Grid 
          container 
          spacing={isMobile ? 0.8 : 1.5}
          sx={{
            position: 'relative',
            zIndex: 1,
            // Simplified grid styling
          }}
        >
          {map.grid.tiles.map((row, rowIndex) =>
            row.map((tile, colIndex) => (
              <Grid size={{ xs: 12 / 5 }} key={`${rowIndex}-${colIndex}`}>
                {renderTile(tile, rowIndex, colIndex)}
              </Grid>
            ))
          )}
        </Grid>
      </Paper>

      {/* Settler Selection Dialog */}
      <SettlerSelectorDialog
        open={settlerDialogOpen}
        onClose={handleDialogClose}
        onSelect={handleSettlerSelectFromDialog}
        settlers={availableSettlers}
        title={`Assign Settler to Explore`}
        emptyStateMessage="No available settlers"
        emptyStateSubMessage="All settlers are currently assigned to other tasks."
        showSkills={true}
        showStats={false}
        confirmPending={startExploration.isPending}
        settlerPreviews={settlerPreviews}
        previewsLoading={previewsLoading}
        previewsError={previewsError}
      />

      {/* Enhanced Future Features Placeholder */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: isMobile ? 2 : 3, 
          opacity: 0.7,
          background: `linear-gradient(135deg, 
            ${theme.palette.grey[100]} 0%, 
            ${theme.palette.grey[50]} 100%)`,
          border: `2px dashed ${theme.palette.grey[400]}`,
          borderRadius: '12px',
          position: 'relative',
          transition: 'all 0.3s ease',
          '&:hover': {
            opacity: 0.9,
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4]
          }
        }}
      >
        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontWeight: 'bold',
            color: 'text.secondary'
          }}
        >
          <ZoomOut color="secondary" /> 
          🔮 Advanced Map Features (Coming Soon)
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            fontStyle: 'italic',
            lineHeight: 1.6
          }}
        >
          Future features: Zoom levels, waypoint markers, resource overlays, expedition planning, 
          and environmental hazard indicators.
        </Typography>
      </Paper>
    </Container>
  );
}

export default MapPage;