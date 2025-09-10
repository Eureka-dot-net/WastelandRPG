// controllers/assignmentController.ts
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Assignment } from '../models/Player/Assignment';
import { Settler } from '../models/Player/Settler';
import { logError, logWarn } from '../utils/logger';
import { withSession } from '../utils/sessionUtils';
import { SettlerManager } from '../managers/SettlerManager';


// GET /api/colonies/:colonyId/beds

export const getBeds = async (req: Request, res: Response) => {
  const { colonyId } = req.params;

  if (!Types.ObjectId.isValid(colonyId)) {
    return res.status(400).json({ error: 'Invalid colonyId' });
  }
};


// POST  /api/colonies/:colonyId/beds/:bedId/start
export const startSleep = async (req: Request, res: Response) => {
  const { settlerId } = req.body;


  if (!settlerId) {
    return res.status(400).json({ error: 'settlerId is required' });
  }


  try {
    const result = await withSession(async () => {
     

      return {
        success: true
      };
    });

    res.json(result);
  } catch (err) {
    const error = err as Error;

    if (error.message === 'Assignment not found') {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    if (error.message === 'Settler not found') {
      return res.status(404).json({ error: 'Settler not found' });
    }
    if (error.message === 'Assignment already started or completed') {
      return res.status(400).json({ error: 'Assignment already started or completed' });
    }
    if (error.message.includes('Settler is currently') && error.message.includes('cannot be assigned')) {
      return res.status(400).json({ error: error.message });
    }

    logError('Failed to start assignment', err, {
      colonyId: req.colonyId,
      assignmentId: req.params.assignmentId,
      settlerId: req.body.settlerId
    });
    res.status(500).json({ error: 'Failed to start assignment' });
  }
};

// GET /colonies/:colonyId/assignments/preview-batch?settlerIds=id1,id2&assignmentIds=aid1,aid2
export const previewAssignmentBatch = async (req: Request, res: Response) => {
  const { settlerIds, assignmentIds } = req.query as { settlerIds?: string; assignmentIds?: string };

  if (!settlerIds || !assignmentIds) {
    return res.status(400).json({ error: 'Both settlerIds and assignmentIds are required' });
  }

  const settlerIdArray = settlerIds.split(',').filter(id => id.trim());
  const assignmentIdArray = assignmentIds.split(',').filter(id => id.trim());

  if (settlerIdArray.length === 0 || assignmentIdArray.length === 0) {
    return res.status(400).json({ error: 'At least one settlerId and one assignmentId required' });
  }

  // Validate all IDs
  const invalidSettlerIds = settlerIdArray.filter(id => !Types.ObjectId.isValid(id));
  const invalidAssignmentIds = assignmentIdArray.filter(id => !Types.ObjectId.isValid(id));

  if (invalidSettlerIds.length > 0 || invalidAssignmentIds.length > 0) {
    return res.status(400).json({
      error: 'Invalid IDs provided',
      invalidSettlerIds,
      invalidAssignmentIds
    });
  }

  try {
    // Fetch all assignments and settlers in bulk
    const [assignments, settlers] = await Promise.all([
      Assignment.find({ _id: { $in: assignmentIdArray } }),
      Settler.find({ _id: { $in: settlerIdArray } })
    ]);

    const assignmentMap = new Map(assignments.map(a => [a._id.toString(), a]));
    const settlerMap = new Map(settlers.map(s => [s._id.toString(), s]));

    const results: Record<string, Record<string, any>> = {};

    // Calculate previews for all combinations
    for (const settlerId of settlerIdArray) {
      const settler = settlerMap.get(settlerId);
      if (!settler) {
        logWarn('Settler not found in batch assignment preview', { settlerId, colonyId: req.colonyId });
        continue;
      }

      results[settlerId] = {};

      for (const assignmentId of assignmentIdArray) {
        const assignment = assignmentMap.get(assignmentId);
        if (!assignment) {
          logWarn('Assignment not found in batch preview', { assignmentId, colonyId: req.colonyId });
          continue;
        }

        try {
          const settlerManager = new SettlerManager(settler);

          const adjustments = settlerManager.calculateAdjustments(assignment.duration, assignment.type);
          
          results[settlerId][assignmentId] = {
            settlerId: settler._id,
            settlerName: settler.name,
            baseDuration: assignment.duration,
            basePlannedRewards: assignment.plannedRewards,
            adjustments
          };
        } catch (error) {
          logError('Error calculating adjustments in batch assignment preview', error, {
            settlerId,
            assignmentId,
            colonyId: req.colonyId
          });
          results[settlerId][assignmentId] = { error: 'Failed to calculate preview' };
        }
      }
    }

    res.json({ results });
  } catch (err) {
    logError('Error in batch assignment preview', err, { colonyId: req.colonyId });
    res.status(500).json({ error: 'Failed to preview assignments' });
  }
};