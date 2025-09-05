import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Settler } from '../models/Player/Settler';
import { ColonyManager } from '../managers/ColonyManager';
import { logError } from '../utils/logger';
import { executeInParallel, withSession, withSessionReadOnly } from '../utils/sessionUtils';
import {
  calculateSettlerAdjustments,
  enrichRewardsWithMetadata,
  calculateDistance,
  calculateDistanceModifiers
} from '../utils/gameUtils';
import {
  getMapGrid,
  canExploreLocation,
  getUserMapTilesInArea,
  createUserMapTile,
  createOrUpdateMapTile
} from '../utils/mapUtils';
import { Assignment } from '../models/Player/Assignment';
import { UserMapTile, UserMapTileDoc } from '../models/Player/UserMapTile';
import { ILootInfo } from '../models/Server/MapTile';

// GET /api/colonies/:colonyId/map?x=0&y=0
export const getMapGrid5x5 = async (req: Request, res: Response) => {
  const colony = req.colony;
  const centerX = parseInt(req.query.x as string) || 0;
  const centerY = parseInt(req.query.y as string) || 0;

  if (isNaN(centerX) || isNaN(centerY)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    const result = await withSessionReadOnly(async (session) => {
      // Get the 5x5 grid of tiles the colony knows about
      const grid = await getMapGrid(colony._id.toString(), centerX, centerY, session);

      // Get assignments in this area
      const assignments = await Assignment.find({
        colonyId: colony._id,
        type: 'exploration',
        location: { $exists: true },
        'location.x': { $gte: centerX - 2, $lte: centerX + 2 },
        'location.y': { $gte: centerY - 2, $lte: centerY + 2 }
      }).session(session);

      return { grid, assignments };
    });

    res.json({
      center: { x: centerX, y: centerY },
      grid: result.grid,
      assignments: result.assignments
    });
  } catch (err) {
    logError('Error fetching map grid', err, { colonyId: req.colonyId, centerX, centerY });
    res.status(500).json({ error: 'Failed to fetch map grid' });
  }
};

// GET /api/colonies/:colonyId/map/preview?x=...&y=...&settlerId=...
export const previewExploration = async (req: Request, res: Response) => {
  const { x, y, settlerId } = req.query as { x?: string; y?: string; settlerId?: string };
  const colony = req.colony;

  if (!x || !y || !settlerId) {
    return res.status(400).json({ error: 'x, y coordinates and settlerId are required' });
  }

  const tileX = parseInt(x);
  const tileY = parseInt(y);

  if (isNaN(tileX) || isNaN(tileY) || !Types.ObjectId.isValid(settlerId)) {
    return res.status(400).json({ error: 'Invalid coordinates or settlerId' });
  }

  try {
    const result = await withSessionReadOnly(async (session) => {
      // Get settler
      const settler = await Settler.findById(settlerId).session(session);
      if (!settler) {
        throw new Error('Settler not found');
      }

      if (settler.status !== 'idle') {
        throw new Error('Settler is not available');
      }

      // Check if location can be explored (must be adjacent to known tile or homestead)
      const canExplore = await canExploreLocation(colony._id.toString(), tileX, tileY, session);
      if (!canExplore) {
        throw new Error('Cannot explore this location - must be adjacent to known area');
      }

      // Calculate exploration details
      const mapTile = await createOrUpdateMapTile(colony.serverId, tileX, tileY, session);

      let userMapTile : UserMapTileDoc | null = await UserMapTile.findOne({
        colonyId: colony._id.toString(),
        x: tileX,
        y: tileY
      }).session(session);

      let lootMultiplier = userMapTile ? userMapTile.lootMultiplier : 1;
      let explorationTime = userMapTile ? userMapTile.explorationTime : 0;
      let distance = userMapTile?.distanceFromHomestead || 0;

      if (!userMapTile) {
        // Calculate exploration details
        let distance = calculateDistance(colony.homesteadLocation.x, colony.homesteadLocation.y, tileX, tileY);
        const distanceModifiers = calculateDistanceModifiers(distance);

        const baseDuration = 300000; // 5 minutes
        explorationTime = baseDuration * distanceModifiers.durationMultiplier;

        lootMultiplier = distanceModifiers.lootMultiplier;
        // Create UserMapTile when exploration starts (isExplored = false)
      }
      // Calculate rewards without settler adjustments
      const baseRewards: Record<string, number> = {};

      // Add tile loot as base rewards
      if (mapTile.loot) {
        mapTile.loot.forEach(lootItem => {
          baseRewards[lootItem.item] = lootItem.amount * lootMultiplier;
        });
      }

      const adjustments = calculateSettlerAdjustments(explorationTime, baseRewards, settler)

      return {
        coordinates: { x: tileX, y: tileY },
        distance,
        duration: adjustments.adjustedDuration,
        rewards: adjustments.adjustedPlannedRewards,
        settler: {
          id: settler._id,
          name: settler.name,
          stats: settler.stats
        }
      };
    });

    res.json(result);
  } catch (err) {
    logError('Error previewing exploration', err, { colonyId: req.colonyId, x, y, settlerId });
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to preview exploration' });
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

  const invalidSettlerIds = settlerIdArray.filter(id => !Types.ObjectId.isValid(id));
  if (invalidSettlerIds.length > 0) {
    return res.status(400).json({ error: 'Invalid settler IDs provided', invalidSettlerIds });
  }

  try {
    const results = await withSessionReadOnly(async (session) => {
      // Get all settlers in one query
      const settlers = await Settler.find({ _id: { $in: settlerIdArray } }).session(session);
      const settlerMap = new Map(settlers.map(s => [s._id.toString(), s]));

      const results: Record<string, Record<string, any>> = {};

      // Calculate previews for all combinations
      for (const settlerId of settlerIdArray) {
        const settler = settlerMap.get(settlerId);
        if (!settler || settler.status !== 'idle') {
          continue;
        }

        results[settlerId] = {};

        for (const { x, y } of coordinateArray) {
          const coordKey = `${x}:${y}`;

          try {
            // Check if location can be explored
            const canExplore = await canExploreLocation(colony._id.toString(), x, y, session);
            if (!canExplore) {
              results[settlerId][coordKey] = { error: 'Cannot explore this location - must be adjacent to known area' };
              continue;
            }

            // Calculate exploration details
            const distance = calculateDistance(colony.homesteadLocation.x, colony.homesteadLocation.y, x, y);
            const distanceModifiers = calculateDistanceModifiers(distance);

            const baseDuration = 300000; // 5 minutes
            const baseRewards = { scrap: 2, wood: 1, food: 1 }; // Default exploration rewards

            const adjustments = calculateSettlerAdjustments(baseDuration, baseRewards, settler);

            results[settlerId][coordKey] = {
              coordinates: { x, y },
              distance,
              duration: adjustments.adjustedDuration,
              rewards: enrichRewardsWithMetadata(adjustments.adjustedPlannedRewards),
              settler: {
                id: settler._id,
                name: settler.name,
                stats: settler.stats
              }
            };
          } catch (error) {
            results[settlerId][coordKey] = { error: 'Failed to calculate preview' };
          }
        }
      }

      return results;
    });

    res.json({ results });
  } catch (err) {
    logError('Error in batch exploration preview', err, { colonyId: req.colonyId });
    res.status(500).json({ error: 'Failed to preview explorations' });
  }
};

// POST /api/colonies/:colonyId/map/start?x=...&y=...&settlerId=...
export const startExploration = async (req: Request, res: Response) => {
  const { x, y, settlerId } = req.query as { x?: string; y?: string; settlerId?: string };
  const colony = req.colony;

  if (!x || !y || !settlerId) {
    return res.status(400).json({ error: 'x, y coordinates and settlerId are required' });
  }

  const tileX = parseInt(x);
  const tileY = parseInt(y);

  if (isNaN(tileX) || isNaN(tileY) || !Types.ObjectId.isValid(settlerId)) {
    return res.status(400).json({ error: 'Invalid coordinates or settlerId' });
  }
  // Get settler
  const settler = await Settler.findById(settlerId);
  if (!settler) {
    return res.status(404).json({ error: 'Settler not found' });
  }

  if (settler.status !== 'idle') {
    return res.status(400).json({ error: 'Settler is not available' });
  }

  // Check if location can be explored
  const canExplore = await canExploreLocation(colony._id.toString(), tileX, tileY);
  if (!canExplore) {
    return res.status(400).json({ error: 'Cannot explore this location - must be adjacent to known area' });
  }
  try {
    const result = await withSession(async (session) => {

      // Create or ensure MapTile exists
      const mapTile = await createOrUpdateMapTile(colony.serverId, tileX, tileY, session);

      let userMapTile : UserMapTileDoc | null = await UserMapTile.findOne({
        colonyId: colony._id.toString(),
        x: tileX,
        y: tileY
      }).session(session);

      if (!userMapTile) {
        // Calculate exploration details
        const distance = calculateDistance(colony.homesteadLocation.x, colony.homesteadLocation.y, tileX, tileY);
        const distanceModifiers = calculateDistanceModifiers(distance);

        const baseDuration = 300000; // 5 minutes
        const distanceDuration = baseDuration * distanceModifiers.durationMultiplier;

        // Create UserMapTile when exploration starts (isExplored = false)

        userMapTile = await createUserMapTile(colony._id.toString(), mapTile._id.toString(), mapTile.x, mapTile.y, mapTile.terrain, distance, distanceDuration, distanceModifiers.lootMultiplier, false, session);
      }
      // Calculate rewards without settler adjustments
      const baseRewards: Record<string, number> = {};

      // Add tile loot as base rewards
      if (mapTile.loot) {
        mapTile.loot.forEach(lootItem => {
          baseRewards[lootItem.item] = lootItem.amount * userMapTile.lootMultiplier;
        });
      }

      const adjustments = calculateSettlerAdjustments(userMapTile.explorationTime, baseRewards, settler)

    // Convert planned rewards to ILootInfo format for storage
    const discoveredLoot: ILootInfo[] = Object.entries(adjustments.adjustedPlannedRewards).map(([item, amount]) => ({
      item,
      amount
    }));

    // Create assignment
    const completedAt = new Date(Date.now() + adjustments.adjustedDuration);
    const assignment = new Assignment({
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

    // Update settler and save assignment
    await executeInParallel([
      (s) => Settler.findByIdAndUpdate(settlerId, { status: 'busy' }, { session: s }),
      (s) => assignment.save({ session: s })
    ], session);

    // Log exploration start
    const colonyManager = new ColonyManager(colony);
    await colonyManager.addLogEntry(
      session,
      'exploration',
      `${settler.name} started exploring coordinates (${tileX}, ${tileY}).`,
      { tileX, tileY, settlerId }
    );

    return {
      assignment: assignment.toObject(),
      adjustments
    };
  });

  res.json({
    ...result.assignment,
    plannedRewards: enrichRewardsWithMetadata(result.assignment.plannedRewards)
  });

} catch (err) {
  logError('Error starting exploration', err, { colonyId: req.colonyId, x, y, settlerId });
  res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to start exploration' });
}
};