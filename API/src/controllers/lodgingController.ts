import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Lodging } from '../models/Player/Lodging';
import { Settler } from '../models/Player/Settler';
import { Assignment, IAssignment } from '../models/Player/Assignment';
import { ColonyManager } from '../managers/ColonyManager';
import { SettlerManager } from '../managers/SettlerManager';
import { logError } from '../utils/logger';
import { withSession } from '../utils/sessionUtils';

// GET /api/colonies/:colonyId/lodging/beds
export const getBeds = async (req: Request, res: Response) => {
  const { colonyId } = req.params;

  if (!Types.ObjectId.isValid(colonyId)) {
    return res.status(400).json({ error: 'Invalid colonyId' });
  }

  try {
    const colony = req.colony;

    // Find or create the Lodging document for the colony
    let lodging = await Lodging.findOne({ colonyId: colony._id });

    if (!lodging) {
      // Create new lodging with default beds
      lodging = new Lodging({
        colonyId: colony._id,
        maxBeds: 3,
        beds: [
          { level: 1 } as any,
          { level: 1 } as any,
          { level: 1 } as any
        ]
      });
      await lodging.save();
    } else {
      // Ensure beds array matches expected bed count
      const currentBedCount = lodging.beds.length;
      const expectedBedCount = lodging.maxBeds;

      if (currentBedCount < expectedBedCount) {
        // Add missing beds (all level 1 by default)
        for (let i = currentBedCount; i < expectedBedCount; i++) {
          lodging.beds.push({ level: 1 } as any);
        }
        await lodging.save();
      }
    }

    res.json({
      lodging: {
        _id: lodging._id,
        colonyId: lodging.colonyId,
        maxBeds: lodging.maxBeds,
        beds: lodging.beds
      }
    });
  } catch (err) {
    logError('Failed to get beds', err, { colonyId });
    res.status(500).json({ error: 'Failed to get beds' });
  }
};

// POST /api/colonies/:colonyId/lodging/start-sleep
export const startSleep = async (req: Request, res: Response) => {
  const { colonyId } = req.params;
  const { settlerId, bedLevel } = req.body;

  if (!Types.ObjectId.isValid(colonyId)) {
    return res.status(400).json({ error: 'Invalid colonyId' });
  }

  if (!settlerId) {
    return res.status(400).json({ error: 'settlerId is required' });
  }

  if (!Types.ObjectId.isValid(settlerId)) {
    return res.status(400).json({ error: 'Invalid settlerId' });
  }

  if (typeof bedLevel !== 'number' || bedLevel < 1) {
    return res.status(400).json({ error: 'bedLevel must be a positive number' });
  }

  try {
    const result = await withSession(async (session) => {
      const colony = req.colony;

      // Find the settler
      const settler = await Settler.findById(settlerId).session(session);
      if (!settler) {
        throw new Error('Settler not found');
      }

      if (settler.colonyId.toString() !== colony._id.toString()) {
        throw new Error('Settler does not belong to this colony');
      }

      // Check if settler is available (not already on assignment)
      if (settler.status !== 'idle') {
        throw new Error(`Settler is currently ${settler.status} and cannot be assigned to sleep`);
      }

      const settlerManager = new SettlerManager(settler);

      // Calculate sleep duration based on bedLevel
      const sleepDurationMs = settlerManager.getSleepDuration(bedLevel);

      if (sleepDurationMs === 0) {
        throw new Error('Settler already has full energy and does not need to sleep');
      }

      // Create the resting assignment
      const completedAt = new Date(Date.now() + sleepDurationMs);
      const assignmentData: IAssignment = {
        colonyId: colony._id,
        settlerId: settler._id,
        name: `Resting (Bed Level ${bedLevel})`,
        type: 'resting',
        duration: Math.ceil(sleepDurationMs / (60 * 60 * 1000)), // Convert to hours for duration field
        description: `${settler.name} is resting to recover energy`,
        state: 'in-progress',
        startedAt: new Date(),
        completedAt,
        plannedRewards: {} // No item rewards for sleeping
      };

      const assignment = new Assignment(assignmentData);

      // Change settler status to resting
      await settlerManager.changeStatus('resting', new Date(), session);

      // Save the assignment
      await assignment.save({ session });

      // Log sleep start
      const colonyManager = new ColonyManager(colony);
      await colonyManager.addLogEntry(
        session,
        'resting',
        `${settler.name} started resting (Bed Level ${bedLevel}).`,
        { settlerId, bedLevel }
      );

      return {
        success: true,
        assignmentId: assignment._id,
        settlerId,
        duration: sleepDurationMs,
        completedAt
      };
    });

    res.json(result);
  } catch (err) {
    const error = err as Error;

    if (error.message === 'Settler not found') {
      return res.status(404).json({ error: 'Settler not found' });
    }
    if (error.message === 'Settler does not belong to this colony') {
      return res.status(400).json({ error: 'Settler does not belong to this colony' });
    }
    if (error.message.includes('Settler is currently') && error.message.includes('cannot be assigned')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Settler already has full energy and does not need to sleep') {
      return res.status(400).json({ error: error.message });
    }

    logError('Failed to start sleep assignment', err, {
      colonyId,
      settlerId,
      bedLevel
    });
    res.status(500).json({ error: 'Failed to start sleep assignment' });
  }
};

// REMOVED: getSleepPreviewBatch function
// It returned: { results: Array<{ settlerId, settlerName, bedType, duration, canSleep, reason? }> }
// The duration was calculated using SettlerManager.getSleepDuration(bedType)
// This data can now be calculated on frontend using settler.adjustments and bed info