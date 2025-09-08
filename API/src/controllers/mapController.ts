import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Settler } from '../models/Player/Settler';
import { ColonyManager } from '../managers/ColonyManager';
import { logError, logWarn } from '../utils/logger';
import { withSession, withSessionReadOnly } from '../utils/sessionUtils';
import {
  calculateDistance,
  calculateDistanceModifiers,
  GameAdjustments
} from '../utils/gameUtils';
import {
  getMapGrid,
  createUserMapTile,
  createOrUpdateMapTile
} from '../utils/mapUtils';
import { Assignment } from '../models/Player/Assignment';
import { calculateExplorationDetails } from '../services/explorationService';
import { validateExplorationParams } from '../utils/validation/ExplorationValidator';
import { UserMapTile } from '../models/Player/UserMapTile';
import { SettlerManager } from '../managers/SettlerManager';

// Use the shared type from gameUtils
interface ExplorationAdjustments extends GameAdjustments { }

async function calculateExplorationAdjustments(
  colony: any,
  x: number,
  y: number,
  settler: any,
  session: any
): Promise<{ baseRewards: Record<string, number>; adjustments: ExplorationAdjustments }> {
  // Get or create map tile
  const mapTile = await createOrUpdateMapTile(colony.serverId, x, y, session);
  if ('error' in mapTile) {
    throw new Error('Failed to load map tile');
  }

  // Check if user has explored this location before
  const userMapTile = await UserMapTile.findOne({
    colonyId: colony._id.toString(),
    x,
    y
  }).session(session);

  // Calculate base exploration parameters
  let lootMultiplier = userMapTile ? userMapTile.lootMultiplier : 1;
  let explorationTime = userMapTile ? userMapTile.explorationTime : 0;

  if (!userMapTile) {
    const distance = calculateDistance(colony.homesteadLocation.x, colony.homesteadLocation.y, x, y);
    const distanceModifiers = calculateDistanceModifiers(distance);
    const baseDuration = 300000; // 5 minutes
    explorationTime = baseDuration * distanceModifiers.durationMultiplier;
    lootMultiplier = distanceModifiers.lootMultiplier;
  }

  // Calculate base rewards without settler adjustments
  const baseRewards: Record<string, number> = {};
  if (mapTile.loot) {
    mapTile.loot.forEach((lootItem: any) => {
      baseRewards[lootItem.item] = lootItem.amount * lootMultiplier;
    });
  }

  // Use SettlerManager for adjustments
  const settlerManager = new SettlerManager(settler);
  const timeMultiplier = settlerManager.adjustedTimeMultiplier('exploration');
  const lootMultiplier_adjusted = settlerManager.adjustedLootMultiplier('exploration');
  
  const adjustedDuration = Math.round(explorationTime / timeMultiplier);
  
  // Apply loot multiplier to planned rewards
  const adjustedPlannedRewards: Record<string, number> = {};
  Object.entries(baseRewards).forEach(([key, amount]) => {
    adjustedPlannedRewards[key] = Math.max(1, Math.round(amount * lootMultiplier_adjusted));
  });

  const adjustments: ExplorationAdjustments = {
    adjustedDuration,
    effectiveSpeed: 1 / timeMultiplier,
    lootMultiplier: lootMultiplier_adjusted,
    adjustedPlannedRewards
  };

  return { baseRewards, adjustments };
}

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

// GET /api/colonies/:colonyId/map/preview-batch?settlerIds=id1,id2&coordinates=x1:y1,x2:y2
export const previewExplorationBatch = async (req: Request, res: Response) => {
  const { settlerIds, coordinates } = req.query as { settlerIds?: string; coordinates?: string };
  const colony = req.colony;

  if (!settlerIds || !coordinates) {
    return res.status(400).json({ error: 'Both settlerIds and coordinates are required' });
  }

  const settlerIdArray = settlerIds.split(',').filter(id => id.trim());
  const coordinateArray = coordinates.split(',').filter(coord => coord.trim());

  if (settlerIdArray.length === 0 || coordinateArray.length === 0) {
    return res.status(400).json({ error: 'At least one settlerId and one coordinate required' });
  }

  // Validate all settler IDs
  const invalidSettlerIds = settlerIdArray.filter(id => !Types.ObjectId.isValid(id));
  
  if (invalidSettlerIds.length > 0) {
    return res.status(400).json({ 
      error: 'Invalid settler IDs provided',
      invalidSettlerIds
    });
  }

  // Parse and validate coordinates
  const parsedCoordinates: Array<{ x: number; y: number; coordKey: string }> = [];
  const invalidCoordinates: string[] = [];

  for (const coord of coordinateArray) {
    const parts = coord.split(':');
    if (parts.length !== 2) {
      invalidCoordinates.push(coord);
      continue;
    }
    
    const x = parseInt(parts[0]);
    const y = parseInt(parts[1]);
    
    if (isNaN(x) || isNaN(y)) {
      invalidCoordinates.push(coord);
      continue;
    }
    
    parsedCoordinates.push({ x, y, coordKey: coord });
  }

  if (invalidCoordinates.length > 0) {
    return res.status(400).json({ 
      error: 'Invalid coordinates provided',
      invalidCoordinates
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

      for (const { x, y, coordKey } of parsedCoordinates) {
        try {
          const { baseRewards, adjustments } = await withSessionReadOnly(async (session) => {
            return await calculateExplorationAdjustments(colony, x, y, settler, session);
          });

          // Get base duration from adjustments (this includes distance calculations)
          const baseDuration = Math.round(adjustments.adjustedDuration / adjustments.effectiveSpeed);

          results[settlerId][coordKey] = {
            settlerId: settler._id,
            settlerName: settler.name,
            baseDuration,
            basePlannedRewards: baseRewards,
            adjustments
          };
        } catch (error) {
          logError('Error calculating adjustments in batch exploration preview', error, { 
            settlerId, 
            coordinates: { x, y }, 
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

// POST /api/colonies/:colonyId/map/start?x=...&y=...&settlerId=...
export const startExploration = async (req: Request, res: Response) => {
  const { x, y, settlerId } = req.query as { x?: string; y?: string; settlerId?: string };
  const colony = req.colony;

  // Validate parameters
  const validation = validateExplorationParams(x, y, settlerId);
  if ('error' in validation) {
    return res.status(400).json({ error: validation.error });
  }

  const { tileX, tileY, settlerId: validatedSettlerId } = validation;

  try {
    const result = await withSession(async (session) => {
      // Get exploration calculations
      const explorationData = await calculateExplorationDetails(colony, tileX, tileY, validatedSettlerId, session);

      // Create UserMapTile if it doesn't exist (for start exploration only)
      let { userMapTile } = explorationData;
      if (!userMapTile) {
        const distance = calculateDistance(colony.homesteadLocation.x, colony.homesteadLocation.y, tileX, tileY);
        const distanceModifiers = calculateDistanceModifiers(distance);
        const baseDuration = 300000; // 5 minutes
        const distanceDuration = baseDuration * distanceModifiers.durationMultiplier;

        userMapTile = await createUserMapTile(
          colony._id.toString(),
          explorationData.mapTile._id.toString(),
          explorationData.mapTile.x,
          explorationData.mapTile.y,
          explorationData.mapTile.terrain,
          explorationData.mapTile.icon,
          distance,
          distanceDuration,
          distanceModifiers.lootMultiplier,
          false,
          session
        );
      }

      // Create assignment
      const completedAt = new Date(Date.now() + explorationData.adjustments.adjustedDuration);
      const assignment = new Assignment({
        colonyId: colony._id,
        settlerId: validatedSettlerId,
        type: 'exploration',
        location: { x: tileX, y: tileY },
        state: 'in-progress',
        startedAt: new Date(),
        completedAt,
        plannedRewards: explorationData.adjustments.adjustedPlannedRewards,
        adjustments: explorationData.adjustments
      });

      await Settler.findByIdAndUpdate(validatedSettlerId, { status: 'exploring' }, { session: session });
      await assignment.save({ session: session });


      // Log exploration start
      const colonyManager = new ColonyManager(colony);
      
      await colonyManager.addLogEntry(
        session,
        'exploration',
        `${explorationData.settler.name} started exploring coordinates (${tileX}, ${tileY}).`,
        { tileX, tileY, settlerId: validatedSettlerId }
      );

      return {
        success: true,
        assignmentId: assignment._id,
        location: { x: tileX, y: tileY },
        settlerId: validatedSettlerId
      };
    });

    res.json(result);
  } catch (err) {
    logError('Error starting exploration', err, { colonyId: req.colonyId, x, y, settlerId });
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to start exploration' });
  }
};