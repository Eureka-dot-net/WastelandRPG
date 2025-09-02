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
  getMapGrid, 
  getTile, 
  formatGridForAPI 
} from '../utils/mapUtils';
import { MapTileModel } from '../models/Server/MapTile';

// GET /api/colonies/:colonyId/map/:x/:y
export const getMapGrid5x5 = async (req: Request, res: Response) => {
  const { x, y } = req.params;
  const colony = req.colony;

  const centerX = parseInt(x);
  const centerY = parseInt(y);

  if (isNaN(centerX) || isNaN(centerY)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    // Get 5x5 grid centered on the coordinates
    const grid = await getMapGrid(colony.serverId, centerX, centerY);
    const formattedGrid = formatGridForAPI(grid);

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

  const session = await MapTileModel.startSession();
  session.startTransaction();

  try {
    // Check if settler exists and is available
    const settler = await Settler.findById(settlerId).session(session);
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

    // Check if tile already exists
    const existingTile = await getTile(colony.serverId, tileX, tileY, session);
    
    let tile;
    let isNewExploration = false;

    if (existingTile) {
      // Update existing tile
      if (!existingTile.exploredBy.includes(settler.name)) {
        existingTile.exploredBy.push(settler.name);
        existingTile.exploredAt = new Date();
        tile = await existingTile.save({ session });
        isNewExploration = true;
      } else {
        tile = existingTile;
      }
    } else {
      // Create new tile
      tile = await createOrUpdateMapTile(colony.serverId, tileX, tileY, {
        exploredBy: settler.name,
        colony: colony._id.toString(),
        session
      });
      isNewExploration = true;

      // Generate adjacent tiles when exploring a new tile
      await assignAdjacentTerrain(colony.serverId, tileX, tileY, settler.name, session);
    }

    // Calculate exploration adjustments based on settler
    const baseDuration = 300000; // 5 minutes base exploration time
    const baseRewards: Record<string, number> = {};
    
    // Add tile loot as base rewards
    tile.loot.forEach(lootItem => {
      baseRewards[lootItem.item] = lootItem.amount;
    });

    const adjustments = calculateSettlerAdjustments(baseDuration, baseRewards, settler);

    // Update settler status
    await Settler.findByIdAndUpdate(settlerId, { status: 'busy' }, { session });

    // Create exploration "assignment" - we'll track this in the tile
    const completedAt = new Date(Date.now() + adjustments.adjustedDuration);
    tile.exploredAt = completedAt; // Use this as completion time
    await tile.save({ session });

    // Log the exploration
    const colonyManager = new ColonyManager(colony);
    await colonyManager.addLogEntry(
      session,
      'exploration',
      `${settler.name} started exploring ${tile.terrain} at coordinates (${tileX}, ${tileY}).`,
      { tileX, tileY, settlerId, terrain: tile.terrain }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({
      tile: {
        ...tile.toObject(),
        loot: enrichRewardsWithMetadata(
          tile.loot.reduce((acc, item) => ({ ...acc, [item.item]: item.amount }), {})
        )
      },
      exploration: {
        settlerId,
        settlerName: settler.name,
        startedAt: new Date(),
        completedAt,
        isNewExploration
      },
      adjustments
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error starting exploration:', err);
    res.status(500).json({ error: 'Failed to start exploration' });
  }
};

// POST /api/colonies/:colonyId/map/:x/:y/preview
export const previewExploration = async (req: Request, res: Response) => {
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

  try {
    // Find settler
    const settler = await Settler.findById(settlerId);
    if (!settler) {
      return res.status(404).json({ error: 'Settler not found' });
    }

    // Check if tile exists
    const tile = await getTile(colony.serverId, tileX, tileY);
    
    let previewData;
    
    if (tile) {
      // Existing tile - show actual loot and terrain info
      const baseRewards: Record<string, number> = {};
      tile.loot.forEach(lootItem => {
        baseRewards[lootItem.item] = lootItem.amount;
      });

      const baseDuration = 300000; // 5 minutes
      const adjustments = calculateSettlerAdjustments(baseDuration, baseRewards, settler);
      
      const terrainInfo = getTerrainCatalogue(tile.terrain);

      previewData = {
        terrain: {
          type: tile.terrain,
          name: terrainInfo?.name || tile.terrain,
          description: terrainInfo?.description || 'Unknown terrain',
          icon: terrainInfo?.icon || null
        },
        loot: enrichRewardsWithMetadata(baseRewards),
        threat: tile.threat,
        event: tile.event,
        duration: adjustments.adjustedDuration,
        adjustments: adjustments.effects,
        alreadyExplored: tile.exploredBy.includes(settler.name),
        exploredBy: tile.exploredBy
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
        estimatedDuration: adjustments.adjustedDuration,
        adjustments: adjustments.effects,
        alreadyExplored: false,
        exploredBy: []
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

// POST /api/colonies/:colonyId/map/:x/:y/inform
export const informExplorationResult = async (req: Request, res: Response) => {
  const { x, y } = req.params;
  const { settlerId } = req.body;
  const colony = req.colony;

  const tileX = parseInt(x);
  const tileY = parseInt(y);

  if (isNaN(tileX) || isNaN(tileY)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    // Get the tile
    const tile = await getTile(colony.serverId, tileX, tileY);
    if (!tile) {
      return res.status(404).json({ error: 'Tile not found' });
    }

    let settler = null;
    if (settlerId && Types.ObjectId.isValid(settlerId)) {
      settler = await Settler.findById(settlerId);
      
      // Update settler status back to idle
      if (settler && settler.status === 'busy') {
        await Settler.findByIdAndUpdate(settlerId, { status: 'idle' });
      }
    }

    // Prepare the response
    const terrainInfo = getTerrainCatalogue(tile.terrain);
    
    const response: any = {
      message: `Exploration of ${terrainInfo?.name || tile.terrain} at (${tileX}, ${tileY}) has been completed!`,
      tile: {
        coordinates: { x: tileX, y: tileY },
        terrain: {
          type: tile.terrain,
          name: terrainInfo?.name || tile.terrain,
          description: terrainInfo?.description || 'Unknown terrain',
          icon: terrainInfo?.icon || null
        },
        loot: enrichRewardsWithMetadata(
          tile.loot.reduce((acc, item) => ({ ...acc, [item.item]: item.amount }), {})
        ),
        threat: tile.threat,
        event: tile.event,
        exploredAt: tile.exploredAt,
        exploredBy: tile.exploredBy
      },
      notification: {
        type: 'exploration_complete',
        timestamp: new Date(),
        acknowledged: true
      }
    };

    // Include settler info if provided and found
    if (settler) {
      response.settler = {
        id: settler._id,
        name: settler.name,
        status: 'idle'
      };
    }

    res.json(response);

  } catch (err) {
    console.error('Error informing exploration result:', err);
    res.status(500).json({ error: 'Failed to process exploration notification' });
  }
};