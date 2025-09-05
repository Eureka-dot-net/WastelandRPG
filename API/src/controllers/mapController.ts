import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { Settler } from '../models/Player/Settler';
import { ColonyManager } from '../managers/ColonyManager';
import { logError, logWarn } from '../utils/logger';
import {
  calculateSettlerAdjustments,
  enrichRewardsWithMetadata,
  getTerrainCatalogue,
  calculateDistance,
  calculateDistanceModifiers
} from '../utils/gameUtils';
import {
  createOrUpdateMapTile,
  assignAdjacentTerrain,
  getMapGridForColony,
  getTile,
  formatGridForAPI,
  canTileBeExplored,
  createUserMapTile,
  getUserMapTileData
} from '../utils/mapUtils';
import { Assignment } from '../models/Player/Assignment';

// GET /api/colonies/:colonyId/map?x=0&y=0
export const getMapGrid5x5 = async (req: Request, res: Response) => {
  const colony = req.colony;
  const centerX = parseInt(req.query.x as string) || 0;
  const centerY = parseInt(req.query.y as string) || 0;

  if (isNaN(centerX) || isNaN(centerY)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    // Get 5x5 grid centered on the coordinates, filtered for this colony's fog of war
    const grid = await getMapGridForColony(colony.serverId, colony._id.toString(), centerX, centerY);

    // Get all exploration assignments in this 5x5 area
    const assignments = await Assignment.find({
      colonyId: colony._id,
      type: 'exploration',
      location: { $exists: true },
      'location.x': { $gte: centerX - 2, $lte: centerX + 2 },
      'location.y': { $gte: centerY - 2, $lte: centerY + 2 }
    });

    const formattedGrid = formatGridForAPI(grid, assignments);

    res.json({
      center: { x: centerX, y: centerY },
      grid: formattedGrid
    });
  } catch (err) {
    logError('Error fetching map grid', err, { 
      colonyId: req.colonyId, 
      centerX, 
      centerY 
    });
    res.status(500).json({ error: 'Failed to fetch map grid' });
  }
};

// post /api/colonies/:colonyId/map/start?x=...&y=...&settlerId=...
export const startExploration = async (req: Request, res: Response) => {
  const { x, y, settlerId } = req.query as { x?: string; y?: string; settlerId?: string };
  const colony = req.colony;

  if (!x || !y) {
    return res.status(400).json({ error: 'Both x and y coordinates are required' });
  }

  const tileX = parseInt(x);
  const tileY = parseInt(y);

  if (isNaN(tileX) || isNaN(tileY)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  if (!settlerId) {
    return res.status(400).json({ error: 'settlerId is required' });
  }

  if (!Types.ObjectId.isValid(settlerId)) {
    return res.status(400).json({ error: 'Invalid settlerId' });
  }

  const session = await mongoose.connection.startSession();
  session.startTransaction();

  try {
    // Parallelize independent validation queries
    const [settler, canExplore] = await Promise.all([
      // Check if settler exists and is available
      Settler.findById(settlerId).session(session),
      
      // Check if tile can be explored (optimized function)
      canTileBeExplored(colony.serverId, colony._id.toString(), tileX, tileY, session)
    ]);

    // Validate settler
    if (!settler) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Settler not found' });
    }

    if (settler.status !== 'idle') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Settler is not available' });
    }



    // Validate tile can be explored
    if (!canExplore) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Cannot explore this tile - it must be adjacent to already explored tiles or homestead' });
    }

    // Get or create the tile (MapTile remains authoritative for content)
    let tile = await getTile(colony.serverId, tileX, tileY, session);
    let isNewTile = false;

    if (!tile) {
      // Create new MapTile (another player hasn't explored this yet)
      tile = await createOrUpdateMapTile(colony.serverId, tileX, tileY, {
        session
      });
      isNewTile = true;
    }

    // Calculate exploration adjustments based on settler and distance from homestead
    const baseDuration = 300000; // 5 minutes base exploration time
    const baseRewards: Record<string, number> = {};

    // Add tile loot as base rewards
    if (tile.loot) {
      tile.loot.forEach(lootItem => {
        baseRewards[lootItem.item] = lootItem.amount;
      });
    }

    // Calculate distance from homestead for additional time and loot
    const distance = calculateDistance(
      colony.homesteadLocation.x,
      colony.homesteadLocation.y,
      tileX,
      tileY
    );
    const distanceModifiers = calculateDistanceModifiers(distance);

    const adjustments = calculateSettlerAdjustments(
      baseDuration, 
      baseRewards, 
      settler, 
      distanceModifiers
    );

    // Create UserMapTile with isExplored=false when exploration starts
    // This allows assignments to be associated with locations on the map
    await createUserMapTile(
      tile._id.toString(),
      colony._id.toString(),
      distance,
      adjustments.adjustedDuration,
      distanceModifiers.lootMultiplier,
      session
    );

    // Create adjacent tiles when exploring a completely new area
    if (isNewTile) {
      await assignAdjacentTerrain(colony.serverId, tileX, tileY, session);
    }

    // Create exploration record
    const completedAt = new Date(Date.now() + adjustments.adjustedDuration);
    const exploration = new Assignment({
      colonyId: colony._id,
      settlerId,
      type: 'exploration',
      location: { x: tileX, y: tileY },
      state: 'in-progress',
      startedAt: new Date(),
      completedAt,
      plannedRewards: adjustments.adjustedPlannedRewards,
      adjustments
    });

    // Parallelize final operations
    const colonyManager = new ColonyManager(colony);
    await Promise.all([
      // Update settler status to busy
      Settler.findByIdAndUpdate(settlerId, { status: 'busy' }, { session }),
      
      // Save exploration record
      exploration.save({ session }),
      
      // Log the exploration
      colonyManager.addLogEntry(
        session,
        'exploration',
        `${settler.name} started exploring ${tile.terrain} at coordinates (${tileX}, ${tileY}).`,
        { tileX, tileY, settlerId, terrain: tile.terrain }
      )
    ]);

    await session.commitTransaction();
    session.endSession();

    res.json({
      ...exploration.toObject(),
      plannedRewards: enrichRewardsWithMetadata(exploration.plannedRewards),
      adjustments,
      tileInfo: {
        x: tileX,
        y: tileY,
        terrain: tile.terrain,
        icon: tile.icon,
        explored: false, // Will be true when exploration completes
        loot: tile.loot,
        threat: tile.threat,
        event: tile.event
      }
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logError('Error starting exploration', err, { 
      colonyId: req.colonyId, 
      x: req.body.x, 
      y: req.body.y,
      settlerId: req.body.settlerId 
    });
    res.status(500).json({ error: 'Failed to start exploration' });
  }
};

// GET /api/colonies/:colonyId/map/preview-batch?settlerIds=id1,id2&coordinates=x1:y1,x2:y2  
export const previewExplorationBatch = async (req: Request, res: Response) => {
  const { settlerIds, coordinates } = req.query as { settlerIds?: string; coordinates?: string };
  const colony = req.colony;

  if (!settlerIds || !coordinates) {
    return res.status(400).json({ error: 'Both settlerIds and coordinates are required' });
  }

  const settlerIdArray = settlerIds.split(',').filter(id => id.trim());
  const coordinateArray = coordinates.split(',').map(coord => {
    const [x, y] = coord.split(':');
    return { x: parseInt(x), y: parseInt(y) };
  }).filter(coord => !isNaN(coord.x) && !isNaN(coord.y));

  if (settlerIdArray.length === 0 || coordinateArray.length === 0) {
    return res.status(400).json({ error: 'At least one settlerId and one coordinate pair required' });
  }

  // Validate all settler IDs
  const invalidSettlerIds = settlerIdArray.filter(id => !Types.ObjectId.isValid(id));
  if (invalidSettlerIds.length > 0) {
    return res.status(400).json({ 
      error: 'Invalid settler IDs provided',
      invalidSettlerIds
    });
  }

  try {
    // Fetch all settlers in bulk
    const settlers = await Settler.find({ _id: { $in: settlerIdArray } });
    const settlerMap = new Map(settlers.map(s => [s._id.toString(), s]));

    const results: Record<string, Record<string, any>> = {};

    // Calculate previews for all combinations  
    for (const settlerId of settlerIdArray) {
      const settler = settlerMap.get(settlerId);
      if (!settler) {
        logWarn('Settler not found in batch exploration preview', { settlerId, colonyId: req.colonyId });
        continue;
      }

      results[settlerId] = {};

      for (const { x, y } of coordinateArray) {
        const coordKey = `${x}:${y}`;

        try {
          // Check if tile can be explored
          const canExplore = await canTileBeExplored(colony.serverId, colony._id.toString(), x, y);
          if (!canExplore) {
            results[settlerId][coordKey] = { error: 'Cannot explore this tile - must be adjacent to already explored tiles or homestead' };
            continue;
          }

          // Check if tile exists
          const tile = await getTile(colony.serverId, x, y);
          let previewData;

          if (tile) {
            // Existing tile - show actual loot and terrain info
            const baseRewards: Record<string, number> = {};
            if (tile.loot) {
              tile.loot.forEach(lootItem => {
                baseRewards[lootItem.item] = lootItem.amount;
              });
            }

            // Check if we have stored UserMapTile data for efficiency
            const userMapTile = await getUserMapTileData(tile._id.toString(), colony._id.toString());
            let distance: number;
            let distanceModifiers: any;
            let baseDuration = 300000; // 5 minutes default

            if (userMapTile) {
              // Use stored values for efficiency
              distance = userMapTile.distanceFromHomestead;
              distanceModifiers = {
                durationMultiplier: userMapTile.explorationTime / baseDuration,
                lootMultiplier: userMapTile.lootMultiplier,
                distanceEffects: [
                  `Distance (${distance}): +${Math.round((userMapTile.explorationTime / baseDuration - 1) * 100)}% time`,
                  `Distance (${distance}): +${Math.round((userMapTile.lootMultiplier - 1) * 100)}% loot`
                ]
              };
              baseDuration = userMapTile.explorationTime;
            } else {
              // Calculate fresh values (fallback for new tiles)
              distance = calculateDistance(
                colony.homesteadLocation.x,
                colony.homesteadLocation.y,
                x,
                y
              );
              distanceModifiers = calculateDistanceModifiers(distance);
            }
            
            const adjustments = calculateSettlerAdjustments(
              baseDuration, 
              baseRewards, 
              settler, 
              distanceModifiers
            );

            const terrainInfo = getTerrainCatalogue(tile.terrain);

            // Check if this colony has already explored this tile
            const alreadyExplored = userMapTile?.isExplored || false;

            previewData = {
              terrain: {
                type: tile.terrain,
                name: terrainInfo?.name || tile.terrain,
                description: terrainInfo?.description || 'Unknown terrain',
                icon: terrainInfo?.icon || 'GiQuestionMark'
              },
              loot: enrichRewardsWithMetadata(baseRewards),
              adjustedLoot: enrichRewardsWithMetadata(adjustments.adjustedPlannedRewards),
              threat: tile.threat,
              event: tile.event,
              duration: adjustments.adjustedDuration,
              adjustments: adjustments.effects,
              alreadyExplored
            };
          } else {
            // Unknown tile - show estimated info
            const baseDuration = 300000;
            const estimatedRewards = { scrap: 2, wood: 1 }; // Basic estimated rewards
            
            // Calculate distance from homestead for additional time and loot
            const distance = calculateDistance(
              colony.homesteadLocation.x,
              colony.homesteadLocation.y,
              x,
              y
            );
            const distanceModifiers = calculateDistanceModifiers(distance);
            
            const adjustments = calculateSettlerAdjustments(
              baseDuration, 
              estimatedRewards, 
              settler, 
              distanceModifiers
            );

            previewData = {
              terrain: {
                type: 'unknown',
                name: 'Unknown Territory',
                description: 'This area has not been explored yet. Terrain and contents are unknown.',
                icon: 'GiQuestionMark'
              },
              estimatedLoot: enrichRewardsWithMetadata(estimatedRewards),
              adjustedEstimatedLoot: enrichRewardsWithMetadata(adjustments.adjustedPlannedRewards),
              estimatedDuration: adjustments.adjustedDuration,
              adjustments: adjustments.effects,
              alreadyExplored: false
            };
          }

          results[settlerId][coordKey] = {
            coordinates: { x, y },
            settler: {
              id: settler._id,
              name: settler.name,
              stats: settler.stats,
              skills: settler.skills,
              traits: settler.traits
            },
            preview: previewData
          };

        } catch (error) {
          logError('Error calculating exploration preview for settler', error, { 
            settlerId, 
            x, 
            y, 
            colonyId: req.colonyId 
          });
          results[settlerId][coordKey] = { error: 'Failed to calculate preview' };
        }
      }
    }

    res.json({ results });
  } catch (err) {
    logError('Error in batch exploration preview', err, { colonyId: req.colonyId });
    res.status(500).json({ error: 'Failed to preview explorations' });
  }
};

// GET /api/colonies/:colonyId/map/preview?x=...&y=...&settlerId=...
export const previewExploration = async (req: Request, res: Response) => {
  const { x, y, settlerId } = req.query as { x?: string; y?: string; settlerId?: string };
  const colony = req.colony;

  if (!x || !y) {
    return res.status(400).json({ error: 'Both x and y coordinates are required' });
  }

  const tileX = parseInt(x);
  const tileY = parseInt(y);

  if (isNaN(tileX) || isNaN(tileY)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  if (!settlerId) {
    return res.status(400).json({ error: 'settlerId is required' });
  }

  if (!Types.ObjectId.isValid(settlerId)) {
    return res.status(400).json({ error: 'Invalid settlerId' });
  }

  try {
    // Find settler
    const settler = await Settler.findById(settlerId);
    if (!settler) {
      return res.status(404).json({ error: 'Settler not found' });
    }

    // Check if tile can be explored
    const canExplore = await canTileBeExplored(colony.serverId, colony._id.toString(), tileX, tileY);
    if (!canExplore) {
      return res.status(400).json({ error: 'Cannot explore this tile - it must be adjacent to already explored tiles or homestead' });
    }

    // Check if tile exists
    const tile = await getTile(colony.serverId, tileX, tileY);

    let previewData;

    if (tile) {
      // Existing tile - show actual loot and terrain info
      const baseRewards: Record<string, number> = {};
      if (tile.loot) {
        tile.loot.forEach(lootItem => {
          baseRewards[lootItem.item] = lootItem.amount;
        });
      }

      // Check if we have stored UserMapTile data for efficiency
      const userMapTile = await getUserMapTileData(tile._id.toString(), colony._id.toString());
      let distance: number;
      let distanceModifiers: any;
      let baseDuration = 300000; // 5 minutes default

      if (userMapTile) {
        // Use stored values for efficiency
        distance = userMapTile.distanceFromHomestead;
        distanceModifiers = {
          durationMultiplier: userMapTile.explorationTime / baseDuration,
          lootMultiplier: userMapTile.lootMultiplier,
          distanceEffects: [
            `Distance (${distance}): +${Math.round((userMapTile.explorationTime / baseDuration - 1) * 100)}% time`,
            `Distance (${distance}): +${Math.round((userMapTile.lootMultiplier - 1) * 100)}% loot`
          ]
        };
        baseDuration = userMapTile.explorationTime;
      } else {
        // Calculate fresh values (fallback for new tiles)
        distance = calculateDistance(
          colony.homesteadLocation.x,
          colony.homesteadLocation.y,
          tileX,
          tileY
        );
        distanceModifiers = calculateDistanceModifiers(distance);
      }
      
      const adjustments = calculateSettlerAdjustments(
        baseDuration, 
        baseRewards, 
        settler, 
        distanceModifiers
      );

      const terrainInfo = getTerrainCatalogue(tile.terrain);

      // Check if this colony has already explored this tile using UserMapTile
      const alreadyExplored = userMapTile?.isExplored || false;

      previewData = {
        terrain: {
          type: tile.terrain,
          name: terrainInfo?.name || tile.terrain,
          description: terrainInfo?.description || 'Unknown terrain',
          icon: terrainInfo?.icon || 'GiQuestionMark'
        },
        loot: enrichRewardsWithMetadata(baseRewards),
        adjustedLoot: enrichRewardsWithMetadata(adjustments.adjustedPlannedRewards),
        threat: tile.threat,
        event: tile.event,
        duration: adjustments.adjustedDuration,
        adjustments: adjustments.effects,
        alreadyExplored
      };
    } else {
      // Unknown tile - show estimated info
      const baseDuration = 300000;
      const estimatedRewards = { scrap: 2, wood: 1 }; // Basic estimated rewards
      
      // Calculate distance from homestead for additional time and loot
      const distance = calculateDistance(
        colony.homesteadLocation.x,
        colony.homesteadLocation.y,
        tileX,
        tileY
      );
      const distanceModifiers = calculateDistanceModifiers(distance);
      
      const adjustments = calculateSettlerAdjustments(
        baseDuration, 
        estimatedRewards, 
        settler, 
        distanceModifiers
      );

      previewData = {
        terrain: {
          type: 'unknown',
          name: 'Unknown Territory',
          description: 'This area has not been explored yet. Terrain and contents are unknown.',
          icon: 'GiQuestionMark'
        },
        estimatedLoot: enrichRewardsWithMetadata(estimatedRewards),
        adjustedEstimatedLoot: enrichRewardsWithMetadata(adjustments.adjustedPlannedRewards),
        estimatedDuration: adjustments.adjustedDuration,
        adjustments: adjustments.effects,
        alreadyExplored: false
      };
    }

    res.json({
      coordinates: { x: tileX, y: tileY },
      settler: {
        id: settler._id,
        name: settler.name,
        stats: settler.stats,
        skills: settler.skills,
        traits: settler.traits
      },
      preview: previewData
    });

  } catch (err) {
    logError('Error previewing exploration', err, { 
      colonyId: req.colonyId, 
      x, 
      y, 
      settlerId 
    });
    res.status(500).json({ error: 'Failed to preview exploration' });
  }
};