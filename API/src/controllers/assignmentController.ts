// controllers/assignmentController.ts
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Assignment, AssignmentDoc } from '../models/Player/Assignment';
import cleaningTasksCatalogue from '../data/cleaningTasksCatalogue.json';
import { Settler } from '../models/Player/Settler';
import { ColonyManager } from '../managers/ColonyManager';
import { logError, logWarn } from '../utils/logger';
import { withSession } from '../utils/sessionUtils';
import {
  generateRewards,
  enrichRewardsWithMetadata,
  GameAdjustments
} from '../utils/gameUtils';
import { SettlerManager } from '../managers/SettlerManager';

// Use the shared type from gameUtils
interface AssignmentAdjustments extends GameAdjustments { }

function calculateAssignmentAdjustments(assignment: AssignmentDoc, settler: any): AssignmentAdjustments {
  const baseDuration = assignment.duration || 300000; // 5 minutes default
  const baseRewards = assignment.plannedRewards || {};

  // Use SettlerManager for adjustments
  const settlerManager = new SettlerManager(settler);
  const timeMultiplier = settlerManager.adjustedTimeMultiplier(assignment.type);
  const lootMultiplier = settlerManager.adjustedLootMultiplier(assignment.type);
  
  const adjustedDuration = Math.round(baseDuration / timeMultiplier);
  
  // Apply loot multiplier to planned rewards
  const adjustedPlannedRewards: Record<string, number> = {};
  Object.entries(baseRewards).forEach(([key, amount]) => {
    adjustedPlannedRewards[key] = Math.max(1, Math.round(amount * lootMultiplier));
  });

  return {
    adjustedDuration,
    effectiveSpeed: 1 / timeMultiplier,
    lootMultiplier,
    adjustedPlannedRewards
  };
}

// Remove the duplicate functions - now using shared utilities from gameUtils

// GET /api/colonies/:colonyId/assignments
//GET /api/colonies/123/assignments?type=exploration
//GET /api/colonies/123/assignments?status=in-progress,completed
//GET /api/colonies/123/assignments?type=exploration,quest&status=in-progress
export const getAssignments = async (req: Request, res: Response) => {
  const { colonyId } = req.params;
  const { type, status } = req.query;

  if (!Types.ObjectId.isValid(colonyId)) {
    return res.status(400).json({ error: 'Invalid colonyId' });
  }

  const typeFilter = type ? (type as string).split(',').map(t => t.trim()) : undefined;
  const statusFilter = status ? (status as string).split(',').map(s => s.trim()) : undefined;

  const filter: any = { colonyId };
  if (typeFilter) filter.type = { $in: typeFilter };
  if (statusFilter) filter.state = { $in: statusFilter };

  const MAX_RETRIES = 3;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      const result = await withSession(async (session) => {
        // Ensure quest assignments exist if requested
        if (!typeFilter || typeFilter.includes('quest')) {
          const existingGeneral = await Assignment.find({ colonyId, type: 'quest' }).session(session);

          const tasksToCreate = cleaningTasksCatalogue.filter(
            task => !existingGeneral.some(a => a.taskId === task.taskId)
          );

          if (tasksToCreate.length > 0) {
            const newAssignments = tasksToCreate.map(taskTemplate => ({
              colonyId,
              taskId: taskTemplate.taskId,
              type: 'quest',
              state: 'available',
              name: taskTemplate.name,
              description: taskTemplate.description,
              dependsOn: taskTemplate.dependsOn,
              duration: taskTemplate.duration,
              completionMessage: taskTemplate.completionMessage,
              unlocks: taskTemplate.unlocks,
              plannedRewards: generateRewards(taskTemplate.rewards),
            }));

            // insertMany inside transaction
            await Assignment.insertMany(newAssignments, { session });
          }
        }

        // Fetch all matching assignments after any auto-creation
        const assignments = await Assignment.find(filter).session(session);

        const enrichedAssignments = assignments.map(a => ({
          ...a.toObject(),
          plannedRewards: enrichRewardsWithMetadata(a.plannedRewards),
        }));

        return { assignments: enrichedAssignments };
      });

      return res.json(result);
    } catch (err: any) {
      attempts++;

      // Handle different types of errors with appropriate retry logic
      const shouldRetry = (
        err.errorLabels?.includes('TransientTransactionError') ||
        err.message?.includes('Write conflict during plan execution') ||
        err.codeName === 'WriteConflict'
      ) && attempts < MAX_RETRIES;

      if (shouldRetry) {
        // console.warn(`Database conflict occurred. Retrying transaction ${attempts}/${MAX_RETRIES}...`);
        // Exponential backoff with jitter to reduce thundering herd
        const backoffTime = 100 * attempts + Math.random() * 50;
        await new Promise(r => setTimeout(r, backoffTime));
        continue;
      }

      logError('Failed to fetch assignments', err, { colonyId: req.colonyId });
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  }
};


// POST /api/colonies/:colonyId/assignments/:assignmentId/start
export const startAssignment = async (req: Request, res: Response) => {
  const { assignmentId } = req.params;
  const { settlerId } = req.body;
  const colony = req.colony;

  if (!settlerId) {
    return res.status(400).json({ error: 'settlerId is required' });
  }

  if (!Types.ObjectId.isValid(assignmentId) || (settlerId && !Types.ObjectId.isValid(settlerId))) {
    return res.status(400).json({ error: 'Invalid IDs' });
  }

  try {
    const result = await withSession(async (session) => {
      const assignment = await Assignment.findById(assignmentId).session(session);
      if (!assignment) {
        throw new Error('Assignment not found');
      }

      if (assignment.state !== 'available') {
        throw new Error('Assignment already started or completed');
      }

      // Fetch settler data for calculations
      const settler = await Settler.findById(settlerId).session(session);
      if (!settler) {
        throw new Error('Settler not found');
      }

      // Validate settler is available (not already busy)
      if (settler.status !== 'idle') {
        throw new Error(`Settler is currently ${settler.status} and cannot be assigned to a new task`);
      }

      // Calculate adjusted duration and loot based on settler stats/skills/traits
      const adjustments = calculateAssignmentAdjustments(assignment, settler);

      // Set appropriate status based on assignment type
      let settlerStatus: 'working' | 'questing' | 'crafting' = 'working';
      if (assignment.type === 'quest') {
        settlerStatus = 'questing';
      } else if (assignment.type === 'crafting') {
        settlerStatus = 'crafting';
      }

      await Settler.findByIdAndUpdate(settlerId, { status: settlerStatus }, { session });

      assignment.state = 'in-progress';
      assignment.settlerId = settlerId ? new Types.ObjectId(settlerId) : undefined;
      assignment.startedAt = new Date();
      assignment.completedAt = new Date(Date.now() + adjustments.adjustedDuration);

      // Store adjustment calculations for reference
      assignment.adjustments = adjustments;

      await assignment.save({ session });

      const colonyManager = new ColonyManager(colony);
      
      await colonyManager.addLogEntry(
        session,
        "assignment",
        `Assignment '${assignment.name}' started with ${settler.name}.`,
        { assignmentId: assignment._id, settlerId }
      );

      return {
        success: true,
        assignmentId: assignment._id,
        settlerId
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
          const adjustments = calculateAssignmentAdjustments(assignment, settler);
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

// GET /colonies/:colonyId/assignments/:assignmentId/preview?settlerId=...
export const previewAssignment = async (req: Request, res: Response) => {
  const { assignmentId } = req.params;
  const { settlerId } = req.query as { settlerId?: string };

  if (!settlerId) {
    return res.status(400).json({ error: 'settlerId is required' });
  }

  if (!Types.ObjectId.isValid(assignmentId) || !Types.ObjectId.isValid(settlerId)) {
    return res.status(400).json({ error: 'Invalid IDs' });
  }

  try {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const settler = await Settler.findById(settlerId);
    if (!settler) {
      return res.status(404).json({ error: 'Settler not found' });
    }

    // Calculate what the adjustments would be without starting the assignment
    const adjustments = calculateAssignmentAdjustments(assignment, settler);

    res.json({
      settlerId: settler._id,
      settlerName: settler.name,
      baseDuration: assignment.duration,
      basePlannedRewards: assignment.plannedRewards,
      adjustments
    });
  } catch (err) {
    logError('Failed to preview assignment', err, { 
      colonyId: req.colonyId, 
      assignmentId: req.params.assignmentId,
      settlerId: req.query.settlerId 
    });
    res.status(500).json({ error: 'Failed to preview assignment' });
  }
};

export const informAssignment = async (req: Request, res: Response) => {
  const { assignmentId } = req.params;

  try {
    const result = await withSession(async (session) => {
      // Find and update the assignment
      const assignment = await Assignment.findById(assignmentId).session(session);
      if (!assignment) {
        throw new Error('Assignment not found');
      }

      if (assignment.state === 'informed') {
        return {
          _id: assignment._id,
          state: assignment.state
        };
      }

      // Only allow if assignment is 'completed'
      if (assignment.state !== 'completed') {
        throw new Error('Assignment is not completed');
      }

      assignment.state = 'informed';
      await assignment.save({ session });

      let foundSettler = null;
      if (assignment.settlerFoundId) {
        foundSettler = await Settler.findById(assignment.settlerFoundId).session(session).lean();
      }

      return {
        _id: assignment._id,
        state: assignment.state,
        foundSettler,
        actualTransferredItems: assignment.actualTransferredItems || {},
        actualNewInventoryStacks: assignment.actualNewInventoryStacks || 0
      };
    });

    res.json(result);
  } catch (err) {
    logError('Failed to inform assignment', err, { 
      colonyId: req.colonyId, 
      assignmentId: req.params.assignmentId 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};