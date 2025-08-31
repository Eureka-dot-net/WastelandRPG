// controllers/assignmentController.ts
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Assignment, AssignmentDoc } from '../models/Player/Assignment';
import cleaningTasksCatalogue from '../data/cleaningTasksCatalogue.json';
import itemsCatalogue from '../data/itemsCatalogue.json';
import { Settler } from '../models/Player/Settler';
import { ColonyManager } from '../managers/ColonyManager';

function generateRewards(taskTemplate: any) {
  const rewards: Record<string, number> = {};
  Object.entries(taskTemplate.rewards).forEach(([key, val]: any) => {
    const chance = val.chance ?? 1;
    if (Math.random() <= chance) {
      rewards[key] = Math.floor(Math.random() * (val.max - val.min + 1)) + val.min;
    }
  });
  return rewards;
}

function enrichRewardsWithMetadata(plannedRewards: Record<string, number> = {}) {
  const enriched: Record<string, any> = {};
  for (const [key, amount] of Object.entries(plannedRewards)) {
    const itemMeta = itemsCatalogue.find(i => i.itemId === key);
    if (itemMeta) {
      enriched[key] = { ...itemMeta, amount };
    } else {
      enriched[key] = { itemId: key, name: key, description: '', icon: null, amount };
    }
  }
  return enriched;
}

// GET /api/colonies/:colonyId/assignments
export const getAssignments = async (req: Request, res: Response) => {
  const { colonyId } = req.params;

  if (!Types.ObjectId.isValid(colonyId)) {
    return res.status(400).json({ error: 'Invalid colonyId' });
  }

  // Start a session for transaction
  const session = await Assignment.startSession();
  session.startTransaction();

  try {
    // Fetch existing assignments for this colony
    const existingAssignments = await Assignment.find({ colonyId }).session(session);

    // Only auto-create cleanup assignments if they don't exist yet
    const tasksToCreate = cleaningTasksCatalogue.filter(
      task => !existingAssignments.some(a => a.taskId === task.taskId)
    );

    const createdAssignments: AssignmentDoc[] = [];

    for (const taskTemplate of tasksToCreate) {
      const plannedRewards = generateRewards(taskTemplate);
      const assignment = await Assignment.create([{
        colonyId,
        taskId: taskTemplate.taskId,
        type: 'general',
        state: 'available',
        name: taskTemplate.name,
        description: taskTemplate.description,
        dependsOn: taskTemplate.dependsOn,
        duration: taskTemplate.duration,
        completionMessage: taskTemplate.completionMessage,
        unlocks: taskTemplate.unlocks,
        plannedRewards,
      }], { session });
      createdAssignments.push(assignment[0]);
    }

    // Return all assignments for this colony with enriched reward metadata
    const allAssignments = await Assignment.find({ colonyId }).session(session);
    const assignmentsWithRewardDetails = allAssignments.map(a => {
      return {
        ...a.toObject(),
        plannedRewards: enrichRewardsWithMetadata(a.plannedRewards),
      };
    });

    await session.commitTransaction();
    session.endSession();

    res.json({ assignments: assignmentsWithRewardDetails });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
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

  const session = await Assignment.startSession();
  session.startTransaction();
  try {
    const assignment = await Assignment.findById(assignmentId).session(session);
    if (!assignment) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.state !== 'available') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Assignment already started or completed' });
    }

    await Settler.findByIdAndUpdate(settlerId, { status: 'busy' }, { session });

    assignment.state = 'in-progress';
    assignment.settlerId = settlerId ? new Types.ObjectId(settlerId) : undefined;
    assignment.startedAt = new Date();
    assignment.completedAt = new Date(Date.now() + (assignment.duration || 0));

    await assignment.save({ session });

    const colonyManager = new ColonyManager(colony);
    await colonyManager.addLogEntry(
      session,
      "assignment",
      `Assignment '${assignment.name}' started.`,
      { assignmentId: assignment._id }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({
      ...assignment.toObject(),
      plannedRewards: enrichRewardsWithMetadata(assignment.plannedRewards),
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(500).json({ error: 'Failed to start assignment' });
  }
};

export const informAssignment = async (req: Request, res: Response) => {
  const { assignmentId } = req.params;

  try {
    // Find and update the assignment
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Only allow if assignment is 'completed'
    if (assignment.state !== 'completed') {
      return res.status(400).json({ error: 'Assignment is not completed' });
    }

    assignment.state = 'informed';
    await assignment.save();

    let foundSettler = null;
    if (assignment.settlerFoundId) {
      foundSettler = await Settler.findById(assignment.settlerFoundId).lean();
    }

    res.json({
      _id: assignment._id,
      state: assignment.state,
      foundSettler,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};