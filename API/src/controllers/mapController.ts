import { Request, Response } from 'express';
import { Settler } from '../models/Player/Settler';
import { ColonyManager } from '../managers/ColonyManager';
import { logError } from '../utils/logger';
import { withSession, withSessionReadOnly } from '../utils/sessionUtils';
import {
  calculateDistance,
  calculateDistanceModifiers
} from '../utils/gameUtils';
import {
  getMapGrid,
  createUserMapTile,
} from '../utils/mapUtils';
import { Assignment } from '../models/Player/Assignment';
import { calculateBatchExplorationPreviews, calculateExplorationDetails } from '../services/explorationService';
import { validateBatchPreviewParams, validateExplorationParams } from '../utils/validation/ExplorationValidator';

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
  const { coordinates, settlerIds } = req.query as { coordinates?: string; settlerIds?: string };
  const colony = req.colony;

  // Validate parameters
  const validation = validateBatchPreviewParams(coordinates, settlerIds);
  if ('error' in validation) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const batchResults = await withSessionReadOnly(async (session) => {
      return await calculateBatchExplorationPreviews(
        colony,
        validation.coordinates,
        validation.settlerIds,
        session
      );
    });

    // Transform BatchPreviewResult[] to expected client format
    const transformedResults: Record<string, Record<string, any>> = {};
    
    batchResults.forEach(result => {
      if (!transformedResults[result.settlerId]) {
        transformedResults[result.settlerId] = {};
      }
      
      const coordKey = `${result.coordinate.x}:${result.coordinate.y}`;
      
      if (result.error) {
        // Include error in the structure
        transformedResults[result.settlerId][coordKey] = {
          error: result.error
        };
      } else if (result.preview) {
        // Determine if tile is already explored based on userMapTile
        const isAlreadyExplored = !!result.preview.userMapTile?.exploredAt;
        
        // Transform the preview data to match Assignment format with additional map fields
        transformedResults[result.settlerId][coordKey] = {
          settlerId: result.settlerId,
          settlerName: result.preview.settler.name,
          baseDuration: result.preview.duration,
          // Map-specific additional fields
          coordinates: result.preview.coordinates,
          // Use estimatedLoot as basePlannedRewards equivalent for maps
          basePlannedRewards: result.preview.rewards || {},
          adjustments: {
            adjustedDuration: result.preview.duration,
            effectiveSpeed: 1, // Default value, will be calculated properly later
            lootMultiplier: 1, // Default value, will be calculated properly later
            adjustedPlannedRewards: result.preview.rewards || {}
          },
          // Map-specific preview data
          alreadyExplored: isAlreadyExplored,
          // Only include loot info as estimated rewards (not revealing actual unexplored tile details)
          ...(result.preview.rewards && Object.keys(result.preview.rewards).length > 0 && {
            estimatedLoot: Object.entries(result.preview.rewards).reduce((acc, [key, amount]) => {
              acc[key] = { amount, itemId: key, name: key, type: 'resource' };
              return acc;
            }, {} as Record<string, any>)
          }),
          // Only include terrain info if already explored (privacy protection)
          ...(isAlreadyExplored && result.preview.mapTile && {
            terrain: {
              type: result.preview.mapTile.terrain,
              name: result.preview.mapTile.terrain,
              description: `${result.preview.mapTile.terrain} terrain`,
              icon: result.preview.mapTile.icon
            }
          })
        };
      }
    });

    res.json({ results: transformedResults });
  } catch (err) {
    logError('Error in batch preview exploration', err, { 
      colonyId: req.colonyId, 
      coordinates, 
      settlerIds 
    });
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to preview explorations' });
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