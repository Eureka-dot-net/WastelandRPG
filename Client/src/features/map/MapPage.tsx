import { Explore, KeyboardArrowUp, KeyboardArrowLeft, ZoomOut, KeyboardArrowRight, KeyboardArrowDown, Lock, Timer } from "@mui/icons-material";
import { useMediaQuery, Tooltip, Box, Typography, Card, CardContent, LinearProgress, Container, Paper, IconButton, Grid, useTheme } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import DynamicIcon from "../../app/shared/components/DynamicIcon";
import SettlerSelectorDialog from "../../app/shared/components/settlers/SettlerSelectorDialog";
import ErrorDisplay from "../../app/shared/components/ui/ErrorDisplay";
import LoadingDisplay from "../../app/shared/components/ui/LoadingDisplay";
import ProgressHeader from "../../app/shared/components/ui/ProgressHeader";
import SettlerAvatar from "../../lib/avatars/SettlerAvatar";
import { useServerContext } from "../../lib/contexts/ServerContext";
import { useAssignmentNotifications } from "../../lib/hooks/useAssignmentNotifications";
import { useColony } from "../../lib/hooks/useColony";
import { useMap } from "../../lib/hooks/useMap";
import { useMapContext } from "../../lib/hooks/useMapContext";
import { useBatchPreviewMapExploration } from "../../lib/hooks/usePreview";
import type { MapResponse, MapTileAPI } from "../../lib/types/mapResponse";
import type { Settler } from "../../lib/types/settler";
import type { UnifiedPreview } from "../../lib/types/preview";
import { formatTimeRemaining } from "../../lib/utils/timeUtils";
import { transformMapExplorationPreview } from "../../lib/utils/previewTransformers";
import { agent } from "../../lib/api/agent";


function MapPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentServerId: serverId } = useServerContext();
  const { centerX, centerY, moveUp, moveDown, moveLeft, moveRight, zoomOut } = useMapContext();
  const [settlerDialogOpen, setSettlerDialogOpen] = useState(false);
  const [selectedTile, setSelectedTile] = useState<MapTileAPI | null>(null);
  const [startingExplorationKey, setStartingExplorationKey] = useState<string | null>(null);
  const [settlerPreviews, setSettlerPreviews] = useState<Record<string, UnifiedPreview>>({});

  const { colony, colonyLoading } = useColony(serverId);
  const colonyId = colony?._id;
  const queryClient = useQueryClient();

  const { map, loadingMap, startExploration } = useMap(serverId, colonyId, centerX, centerY);

  // Use the assignment notifications for exploration timers
  const { timers } = useAssignmentNotifications();


  const availableSettlers = useMemo(() => {
    if (!colony?.settlers) return [];
    return colony.settlers.filter(settler => settler.status === "idle");
  }, [colony?.settlers]);

  // Get current explorable coordinates for batch preview
  const getExplorableCoordinates = useMemo(() => {
    if (!map?.grid?.tiles) return [];

    const explorableCoords: { x: number; y: number }[] = [];
    map.grid.tiles.forEach((row, rowIndex) => {
      row.forEach((tile, colIndex) => {
        if (tile.canExplore) {
          const worldX = centerX - 2 + colIndex;
          const worldY = centerY + 2 - rowIndex;
          explorableCoords.push({ x: worldX, y: worldY });
        }
      });
    });
    return explorableCoords;
  }, [map?.grid?.tiles, centerX, centerY]);

  const explorableCoordinates = getExplorableCoordinates;
  const selectedCoordinates = useMemo(() => {
    return selectedTile ? [{
      x: centerX - 2 + selectedTile.position.col,
      y: centerY + 2 - selectedTile.position.row
    }] : [];
  }, [selectedTile, centerX, centerY]);

  // Use smart batch preview hook for all explorable coordinates (prefetch all)
  const settlerIds = availableSettlers.map(s => s._id);
  const { data: batchPreviewData, isLoading: previewsLoading, error: previewsError } = useBatchPreviewMapExploration(
    colonyId || '',
    settlerIds,
    explorableCoordinates,
    !!(colonyId && settlerIds.length > 0 && explorableCoordinates.length > 0)
  );

  // Build unified preview data when batch data is available
  useEffect(() => {
    if (!batchPreviewData || selectedCoordinates.length === 0) return;

    const previews: Record<string, UnifiedPreview> = {};
    const coordinate = selectedCoordinates[0];
    const coordKey = `${coordinate.x}:${coordinate.y}`;

    // Build preview for each available settler with the selected coordinates
    availableSettlers.forEach(settler => {
      const settlerPreview = batchPreviewData.results[settler._id]?.[coordKey];
      if (settlerPreview) {
        previews[settler._id] = transformMapExplorationPreview(settlerPreview);
      }
    });

    setSettlerPreviews(previews);
  }, [batchPreviewData, selectedCoordinates, availableSettlers]);

  // Map grid prefetching - prefetch adjacent map grids for navigation
  useEffect(() => {
    if (!colonyId || !serverId) return;

    const adjacentPositions = [
      { x: centerX, y: centerY + 1 }, // Up
      { x: centerX, y: centerY - 1 }, // Down
      { x: centerX - 1, y: centerY }, // Left
      { x: centerX + 1, y: centerY }  // Right
    ];

    adjacentPositions.forEach(({ x, y }) => {
      queryClient.prefetchQuery({
        queryKey: ["map", colonyId, x, y],
        queryFn: async () => {
          const url = `/colonies/${colonyId}/map?x=${x}&y=${y}`;
          const response = await agent.get(url);
          return response.data as MapResponse;
        },
        staleTime: 10 * 60 * 1000, // 10 minutes - longer since maps change less frequently
      }).catch(err => {
        console.warn(`Failed to prefetch map at (${x}, ${y}):`, err);
      });
    });

    console.log(`Preloading 4 adjacent map grids around position (${centerX}, ${centerY})`);
  }, [colonyId, serverId, centerX, centerY, queryClient]);

  const handleTileClick = (tile: MapTileAPI) => {
    if (!tile.canExplore || !availableSettlers.length) return;

    setSelectedTile(tile);
    setSettlerDialogOpen(true);
  };

  const handleSettlerSelect = (settler: Settler) => {
    if (!selectedTile) return;

    // Calculate world coordinates from grid position
    const worldX = centerX - 2 + selectedTile.position.col;
    const worldY = centerY + 2 - selectedTile.position.row;

    const explorationKey = `${worldX},${worldY}`;
    setStartingExplorationKey(explorationKey);

    // Get preview duration for this settler if available
    const settlerPreview = settlerPreviews[settler._id];
    let previewDuration: number | undefined;

    if (settlerPreview) {
      if (settlerPreview.type === 'exploration') {
        // MapExplorationPreview has estimatedDuration
        previewDuration = settlerPreview.estimatedDuration;
      } else {
        // AssignmentPreview only has duration
        previewDuration = settlerPreview.duration;
      }
    }

    startExploration.mutate(
      {
        row: worldY,
        col: worldX,
        settlerId: settler._id,
        previewDuration
      },
      {
        onSettled: () => {
          setStartingExplorationKey(null);
        }
      }
    );

    setSettlerDialogOpen(false);
    setSelectedTile(null);
  };

  const renderTile = (tile: MapTileAPI, rowIndex: number, colIndex: number) => {
    const worldX = centerX - 2 + colIndex;
    const worldY = centerY + 2 - rowIndex;
    const tileKey = `${worldX},${worldY}`;

    // Get in-progress assignments for this tile
    const inProgressAssignments = tile.assignments?.filter(a => a.state === 'in-progress') || [];

    // Get settlers assigned to this tile from the colony data
    const assignedSettlers = inProgressAssignments
      .map(assignment => colony?.settlers?.find(s => s._id === assignment.settlerId))
      .filter((settler): settler is Settler => settler !== undefined);

    // Calculate progress for assignments
    const assignmentsWithProgress = inProgressAssignments.map(assignment => {
      const timeRemaining = timers[assignment._id];
      let progress = 0;

      if (assignment.adjustments?.adjustedDuration && timeRemaining != null) {
        progress = Math.max(0, Math.min(100,
          ((assignment.adjustments.adjustedDuration - timeRemaining) / assignment.adjustments.adjustedDuration) * 100
        ));
      }

      // Find the settler for this assignment
      const assignedSettler = colony?.settlers?.find(s => s._id === assignment.settlerId);

      return {
        ...assignment,
        progress,
        timeRemaining,
        settler: assignedSettler
      };
    });

    const isStarting = startingExplorationKey === tileKey;
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
            '&:hover': canClick ? {
              bgcolor: theme.palette.action.selected,
              transform: 'translateY(-2px)',
              boxShadow: theme.shadows[4]
            } : {}
          }}
          onClick={() => handleTileClick(tile)}
        >
          <CardContent sx={{
            p: 1,
            '&:last-child': { pb: 1 },
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {/* Fog of War, Starting State, or Content */}
            {isStarting ? (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: 0.8
              }}>
                <Timer color="warning" />
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
                {tile.canExplore ? <Explore color="primary" /> : <Lock color="disabled" />}
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
                        flex: 1, // make the bar take remaining space
                        height: 4,
                        borderRadius: 2,
                        bgcolor: theme.palette.grey[300]
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

  if (!map || !colony) {
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
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? 1 : 2
        }}>
          {isMobile && (
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Position: ({centerX}, {centerY})
            </Typography>
          )}

          {!isMobile && (
            <Typography variant="h6" sx={{ mr: 2 }}>
              Position: ({centerX}, {centerY})
            </Typography>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <IconButton onClick={moveUp} color="primary" size={isMobile ? "small" : "medium"}>
              <KeyboardArrowUp />
            </IconButton>
            <Box sx={{ display: 'flex', gap: isMobile ? 0.5 : 1 }}>
              <IconButton onClick={moveLeft} color="primary" size={isMobile ? "small" : "medium"}>
                <KeyboardArrowLeft />
              </IconButton>
              <IconButton onClick={zoomOut} color="secondary" disabled size={isMobile ? "small" : "medium"}>
                <ZoomOut />
              </IconButton>
              <IconButton onClick={moveRight} color="primary" size={isMobile ? "small" : "medium"}>
                <KeyboardArrowRight />
              </IconButton>
            </Box>
            <IconButton onClick={moveDown} color="primary" size={isMobile ? "small" : "medium"}>
              <KeyboardArrowDown />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Map Grid */}
      <Paper elevation={2} sx={{ p: isMobile ? 1 : 2, mb: 3 }}>
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
        onClose={() => setSettlerDialogOpen(false)}
        onSelect={handleSettlerSelect}
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
      <Paper elevation={2} sx={{ p: isMobile ? 2 : 3, opacity: 0.6 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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