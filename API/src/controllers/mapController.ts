// controllers/mapController.ts
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Settler } from '../models/Player/Settler';
import { ColonyManager } from '../managers/ColonyManager';
import {
  calculateSettlerAdjustments,
  enrichRewardsWithMetadata,
  getTerrainCatalogue
} from '../utils/gameUtils';
import {
  createOrUpdateMapTile,
  assignAdjacentTerrain,
  getMapGridForColony,
  getTile,
  formatGridForAPI,
  canTileBeExplored,
  createOrGetUserMapTile,
  hasColonyExploredTile
} from '../utils/mapUtils';
import { MapTile } from '../models/Server/MapTile';
import { Assignment, AssignmentDoc } from '../models/Player/Assignment';

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
      serverId: colony.serverId,
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
    console.error('Error fetching map grid:', err);
    res.status(500).json({ error: 'Failed to fetch map grid' });
  }
};

// POST /api/colonies/:colonyId/map/:x/:y/start
export const startExploration = async (req: Request, res: Response) => {
  const { x, y } = req.params;
  const { settlerId } = req.body;
  const colony = req.colony;

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

  const session = await MapTile.startSession();
  session.startTransaction();

  try {
    // Parallelize independent validation queries
    const [settler, existingExploration, canExplore] = await Promise.all([
      // Check if settler exists and is available
      Settler.findById(settlerId).session(session),
      
      // Check if exploration is already in progress for this tile by this colony
      Assignment.findOne({
        serverId: colony.serverId,
        colonyId: colony._id,
        location: { x: tileX, y: tileY },
        state: 'in-progress'
      }).session(session),
      
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

    // Validate exploration not already in progress
    if (existingExploration) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Exploration already in progress for this tile' });
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

    // Create or get UserMapTile record for this colony's exploration
    await createOrGetUserMapTile(
      tile._id.toString(),
      colony._id.toString(),
      session
    );

    // Create adjacent tiles when exploring a completely new area
    if (isNewTile) {
      await assignAdjacentTerrain(colony.serverId, tileX, tileY, session);
    }

    // Calculate exploration adjustments based on settler
    const baseDuration = 300000; // 5 minutes base exploration time
    const baseRewards: Record<string, number> = {};

    // Add tile loot as base rewards
    if (tile.loot) {
      tile.loot.forEach(lootItem => {
        baseRewards[lootItem.item] = lootItem.amount;
      });
    }

    const adjustments = calculateSettlerAdjustments(baseDuration, baseRewards, settler);

    // Create exploration record
    const completedAt = new Date(Date.now() + adjustments.adjustedDuration);
    const exploration = new Assignment({
      serverId: colony.serverId,
      colonyId: colony._id,
      settlerId,
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
    console.error('Error starting exploration:', err);
    res.status(500).json({ error: 'Failed to start exploration' });
  }
};

// POST /api/colonies/:colonyId/map/preview
export const previewExploration = async (req: Request, res: Response) => {
  const { x, y, settlerId } = req.body;
  const colony = req.colony;

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

      const baseDuration = 300000; // 5 minutes
      const adjustments = calculateSettlerAdjustments(baseDuration, baseRewards, settler);

      const terrainInfo = getTerrainCatalogue(tile.terrain);

      // Check if this colony has already explored this tile using UserMapTile
      const alreadyExplored = await hasColonyExploredTile(
        tile._id.toString(),
        colony._id.toString()
      );

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
      const adjustments = calculateSettlerAdjustments(baseDuration, estimatedRewards, settler);

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
    console.error('Error previewing exploration:', err);
    res.status(500).json({ error: 'Failed to preview exploration' });
  }
};