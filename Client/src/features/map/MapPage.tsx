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
  const { colony } = useColony(serverId);
  const { centerX, centerY, moveUp, moveDown, moveLeft, moveRight, zoomOut } = useMapContext();
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
          const worldY = centerY - 2 + rowIndex;
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
  const config = useMemo(() => createMapExplorationConfig(startExplorationWrapper, colony?.homesteadLocation), [startExplorationWrapper, colony?.homesteadLocation]);

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
    const worldY = centerY - 2 + tile.position.row;

    // Create coordinate object that matches our target type
    const coordinate = { x: worldX, y: worldY };
    handleTileClick(coordinate);
  };

  const renderTile = (tile: MapTileAPI, rowIndex: number, colIndex: number) => {
    const worldX = centerX - 2 + colIndex;
    const worldY = centerY - 2 + rowIndex;
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
            bgcolor: !tile.explored
              ? tile.canExplore
                ? theme.palette.action.hover
                : theme.palette.grey[300]
              : theme.palette.background.paper,
            border: tile.canExplore && !tile.explored
              ? `2px solid ${theme.palette.primary.main}`
              : `1px solid ${theme.palette.divider}`,
            opacity: !tile.explored && !tile.canExplore ? 0.3 : 1,
            position: 'relative',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateY(0px) scale(1)',
            boxShadow: tile.explored
              ? `0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)`
              : tile.canExplore
                ? `0 2px 8px rgba(${theme.palette.primary.main.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ') || '0, 0, 0'}, 0.3)`
                : '0 1px 3px rgba(0, 0, 0, 0.1)',
            '&:hover': canClick ? {
              bgcolor: theme.palette.action.selected,
              transform: 'translateY(-4px) scale(1.02)',
              boxShadow: `0 8px 25px rgba(0, 0, 0, 0.2), 0 0 20px rgba(${theme.palette.primary.main.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ') || '0, 0, 0'}, 0.4)`,
              '&::before': {
                opacity: 1
              }
            } : {},
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 'inherit',
              background: tile.canExplore && !tile.explored
                ? `linear-gradient(45deg, rgba(${theme.palette.primary.main.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ') || '0, 0, 0'}, 0.1), rgba(${theme.palette.primary.main.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ') || '0, 0, 0'}, 0.05))`
                : 'linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.1))',
              opacity: 0.7,
              transition: 'opacity 0.3s ease',
              pointerEvents: 'none',
              zIndex: 0
            }
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
            zIndex: 1
          }}>
            {/* Fog of War, Starting State, or Content */}
            {isStarting ? (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: 0.8
              }}>
                <Timer
                  color="warning"
                  sx={{
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                      '100%': { opacity: 1 }
                    }
                  }}
                />
                <Typography variant="caption" sx={{ mt: 0.5, textAlign: 'center', color: 'warning.main' }}>
                  Gathering gear...
                </Typography>
              </Box>
            ) : !tile.explored ? (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: tile.canExplore ? 0.7 : 0.3
              }}>
                {tile.canExplore ? (
                  <Explore
                    color="primary"
                    sx={{
                      filter: 'drop-shadow(0 0 4px rgba(25, 118, 210, 0.5))',
                      animation: canClick ? 'glow 2s ease-in-out infinite alternate' : 'none',
                      '@keyframes glow': {
                        '0%': { filter: 'drop-shadow(0 0 4px rgba(25, 118, 210, 0.5))' },
                        '100%': { filter: 'drop-shadow(0 0 8px rgba(25, 118, 210, 0.8))' }
                      }
                    }}
                  />
                ) : (
                  <Lock color="disabled" />
                )}
                <Typography variant="caption" sx={{ mt: 0.5, textAlign: 'center' }}>
                  {tile.canExplore ? 'Explore' : 'Locked'}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {tile.terrain?.icon && (
                  (isMobile && assignedSettlers.length <= 1) ||
                  (!isMobile && assignedSettlers.length <= 1)
                ) &&
                  <DynamicIcon name={tile.terrain.icon} size={isMobile ? "1.5rem" : "2rem"} />}
                <Typography variant="caption" sx={{ mt: 0.5, textAlign: 'center' }}>
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
                pb: 0.5,
                zIndex: 2
              }}>
                {assignmentsWithProgress.filter(a => a.progress > 0 && a.progress < 100).slice(0, 2).map((assignment, idx) => (
                  <Box
                    key={assignment._id}
                    sx={{
                      mb: idx < assignmentsWithProgress.length - 1 ? 0.25 : 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <LinearProgress
                      variant="determinate"
                      value={assignment.progress}
                      sx={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          boxShadow: `0 0 8px ${theme.palette.primary.main}40`
                        }
                      }}
                    />
                    {!isMobile && assignment.timeRemaining != null && assignment.timeRemaining > 0 && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.6rem',
                          color: 'text.secondary',
                          whiteSpace: 'nowrap',
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
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
                zIndex: 2
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
                        return '→';
                      case 'exploring':
                        return '🔍';
                      case 'returning':
                        return '←';
                      default:
                        return '';
                    }
                  };

                  return (
                    <Box key={settler._id} sx={{
                      position: 'relative',
                      zIndex: assignedSettlers.length - idx,
                      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                    }}>
                      <SettlerAvatar
                        settler={settler}
                        size={isMobile ? 20 : 30}
                      />
                      {/* Phase indicator */}
                      <Box sx={{
                        position: 'absolute',
                        bottom: -5,
                        right: -2,
                        width: isMobile ? 10 : 12,
                        height: isMobile ? 10 : 12,
                        borderRadius: '50%',
                        bgcolor: phase === 'exploring' ? 'success.main' : 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isMobile ? '0.4rem' : '0.5rem',
                        boxShadow: `0 0 6px ${phase === 'exploring' ? theme.palette.success.main : theme.palette.primary.main}`,
                        animation: phase === 'exploring' ? 'pulse 1.5s infinite' : 'none'
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
                    bgcolor: 'grey.700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid',
                    borderColor: 'grey.600',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
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
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                borderRadius: 'inherit',
                zIndex: 3,
                backdropFilter: 'blur(2px)'
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

      {/* Navigation Controls */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 3,
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.1))',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            transform: 'translateY(-2px)'
          }
        }}
      >
        <Box sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? 1 : 2
        }}>
          {isMobile && (
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
              Position: ({centerX}, {centerY})
            </Typography>
          )}

          {!isMobile && (
            <Typography variant="h6" sx={{ mr: 2, textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
              Position: ({centerX}, {centerY})
            </Typography>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <IconButton
              onClick={moveUp}
              color="primary"
              size={isMobile ? "small" : "medium"}
              sx={{
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${theme.palette.primary.main}40`
                }
              }}
            >
              <KeyboardArrowUp />
            </IconButton>
            <Box sx={{ display: 'flex', gap: isMobile ? 0.5 : 1 }}>
              <IconButton
                onClick={moveLeft}
                color="primary"
                size={isMobile ? "small" : "medium"}
                sx={{
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 12px ${theme.palette.primary.main}40`
                  }
                }}
              >
                <KeyboardArrowLeft />
              </IconButton>
              <IconButton
                onClick={zoomOut}
                color="secondary"
                disabled
                size={isMobile ? "small" : "medium"}
              >
                <ZoomOut />
              </IconButton>
              <IconButton
                onClick={moveRight}
                color="primary"
                size={isMobile ? "small" : "medium"}
                sx={{
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 12px ${theme.palette.primary.main}40`
                  }
                }}
              >
                <KeyboardArrowRight />
              </IconButton>
            </Box>
            <IconButton
              onClick={moveDown}
              color="primary"
              size={isMobile ? "small" : "medium"}
              sx={{
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${theme.palette.primary.main}40`
                }
              }}
            >
              <KeyboardArrowDown />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Map Grid */}
      <Paper
        elevation={2}
        sx={{
          p: isMobile ? 1 : 2,
          mb: 3,
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.1))',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }
        }}
      >
        <Grid container spacing={isMobile ? 0.5 : 1}>
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

      {/* Future Features Placeholder */}
      <Paper
        elevation={2}
        sx={{
          p: isMobile ? 2 : 3,
          opacity: 0.6,
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.03), rgba(0, 0, 0, 0.05))',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s ease',
          '&:hover': {
            opacity: 0.8,
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }
        }}
      >
        <Typography variant="h6" gutterBottom sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
        }}>
          <ZoomOut color="secondary" /> Advanced Map Features (Coming Soon)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Future features: Zoom levels, waypoint markers, resource overlays, and expedition planning.
        </Typography>
      </Paper>
    </Container>
  );
}

export default MapPage;