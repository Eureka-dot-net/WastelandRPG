// controllers/assignmentController.ts
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Assignment, AssignmentDoc } from '../models/Player/Assignment';
import cleaningTasksCatalogue from '../data/cleaningTasksCatalogue.json';
import { Settler } from '../models/Player/Settler';
import { ColonyManager } from '../managers/ColonyManager';
import { 
  calculateSettlerAdjustments, 
  generateRewards, 
  enrichRewardsWithMetadata,
  GameAdjustments 
} from '../utils/gameUtils';

// Use the shared type from gameUtils
interface AssignmentAdjustments extends GameAdjustments {}

function calculateAssignmentAdjustments(assignment: AssignmentDoc, settler: any): AssignmentAdjustments {
  const baseDuration = assignment.duration || 300000; // 5 minutes default
  const baseRewards = assignment.plannedRewards || {};
  
  return calculateSettlerAdjustments(baseDuration, baseRewards, settler);
}

// Remove the duplicate functions - now using shared utilities from gameUtils

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

    // Fetch settler data for calculations
    const settler = await Settler.findById(settlerId).session(session);
    if (!settler) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Settler not found' });
    }

    // Calculate adjusted duration and loot based on settler stats/skills/traits
    const adjustments = calculateAssignmentAdjustments(assignment, settler);

    await Settler.findByIdAndUpdate(settlerId, { status: 'busy' }, { session });

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

    await session.commitTransaction();
    session.endSession();

    res.json({
      ...assignment.toObject(),
      plannedRewards: enrichRewardsWithMetadata(assignment.plannedRewards),
      adjustments
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(500).json({ error: 'Failed to start assignment' });
  }
};

// POST /api/colonies/:colonyId/assignments/:assignmentId/preview
export const previewAssignment = async (req: Request, res: Response) => {
  const { assignmentId } = req.params;
  const { settlerId } = req.body;

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
    console.error(err);
    res.status(500).json({ error: 'Failed to preview assignment' });
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