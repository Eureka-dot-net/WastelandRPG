import { Explore, KeyboardArrowUp, KeyboardArrowLeft, ZoomOut, KeyboardArrowRight, KeyboardArrowDown, Lock } from "@mui/icons-material";
import { useMediaQuery, Tooltip, Box, Typography, Card, CardContent, LinearProgress, Container, Paper, IconButton, Grid, useTheme } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import DynamicIcon from "../../app/shared/components/DynamicIcon";
import SettlerSelectorDialog from "../../app/shared/components/settlers/SettlerSelectorDialog";
import ErrorDisplay from "../../app/shared/components/ui/ErrorDisplay";
import LoadingDisplay from "../../app/shared/components/ui/LoadingDisplay";
import ProgressHeader from "../../app/shared/components/ui/ProgressHeader";
import { useServerContext } from "../../lib/contexts/ServerContext";
import { useAssignmentNotifications } from "../../lib/hooks/useAssignmentNotifications";
import { useColony } from "../../lib/hooks/useColony";
import { useMap } from "../../lib/hooks/useMap";
import { useMapContext } from "../../lib/hooks/useMapContext";
import { useSmartBatchPreviewMapExploration } from "../../lib/hooks/useSmartBatchPreview";
import type { MapResponse, MapTileAPI } from "../../lib/types/MapResponse ";
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
  const { timers, startAssignment: startNotificationTimer } = useAssignmentNotifications();


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
  const { data: batchPreviewData, isLoading: previewsLoading, error: previewsError } = useSmartBatchPreviewMapExploration(
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
    const worldY = centerY - 2 + selectedTile.position.row;

    const explorationKey = `${worldX},${worldY}`;
    setStartingExplorationKey(explorationKey);

    startExploration.mutate(
      {
        row: worldX,
        col: worldY,
        settlerId: settler._id
      },
      {
        onSuccess: (updatedAssignment) => {
          // Start the notification timer
          startNotificationTimer(updatedAssignment);
        },
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

    // Calculate progress for assignments
    const assignmentsWithProgress = inProgressAssignments.map(assignment => {
      const timeRemaining = timers[assignment._id];
      let progress = 0;

      if (assignment.adjustments?.adjustedDuration && timeRemaining != null) {
        progress = Math.max(0, Math.min(100,
          ((assignment.adjustments.adjustedDuration - timeRemaining) / assignment.adjustments.adjustedDuration) * 100
        ));
      }

      return {
        ...assignment,
        progress,
        timeRemaining
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
            {tile.explored && (
              <>
                {tile.terrain && (
                  <Typography variant="body2">
                    Terrain: {tile.terrain.type}
                  </Typography>
                )}
                {tile.loot && tile.loot.length > 0 && (
                  <Typography variant="body2">
                    Loot: {tile.loot.map(l => `${l.amount} ${l.item}`).join(', ')}
                  </Typography>
                )}
                {tile.threat && (
                  <Typography variant="body2">
                    Threat: {tile.threat.type} (Level {tile.threat.level})
                  </Typography>
                )}
                {tile.event && (
                  <Typography variant="body2">
                    Event: {tile.event.description}
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
            {/* Fog of War or Content */}
            {!tile.explored ? (
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
                {tile.icon && <DynamicIcon name={tile.icon} />}
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
                {assignmentsWithProgress.slice(0, 2).map((assignment, idx) => (
                  <Box key={assignment._id} sx={{ mb: idx < assignmentsWithProgress.length - 1 ? 0.25 : 0 }}>
                    <LinearProgress
                      variant="determinate"
                      value={assignment.progress}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        bgcolor: theme.palette.grey[300]
                      }}
                    />
                    {!isMobile && assignment.timeRemaining != null && assignment.timeRemaining > 0 && (
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
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
                <Typography variant="caption">Starting...</Typography>
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