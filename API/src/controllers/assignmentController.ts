// controllers/assignmentController.ts
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Assignment, AssignmentDoc } from '../models/Player/Assignment';
import cleaningTasksCatalogue from '../data/cleaningTasksCatalogue.json';
import itemsCatalogue from '../data/itemsCatalogue.json';
import { Settler } from '../models/Player/Settler';
import { ColonyManager } from '../managers/ColonyManager';

interface AssignmentAdjustments {
  adjustedDuration: number;
  effectiveSpeed: number;
  lootMultiplier: number;
  adjustedPlannedRewards: Record<string, number>;
  effects: {
    speedEffects: string[];
    lootEffects: string[];
    traitEffects: string[];
  };
}

function calculateAssignmentAdjustments(assignment: AssignmentDoc, settler: any): AssignmentAdjustments {
  const baseDuration = assignment.duration || 300000; // 5 minutes default
  const baseRewards = assignment.plannedRewards || {};
  
  // Calculate effective speed based on settler stats, skills and hunger
  let effectiveSpeed = 1.0;
  const speedEffects: string[] = [];
  
  // Speed stat effect (0-20 scale, normalized to 0.5-1.5x multiplier)
  const speedMultiplier = 0.5 + (settler.stats.speed / 20) * 1.0;
  effectiveSpeed *= speedMultiplier;
  speedEffects.push(`Speed stat: ${speedMultiplier.toFixed(2)}x`);
  
  // Hunger penalty (0-100 scale, 0 = no hunger, 100 = very hungry)
  const hungerPenalty = Math.max(0.5, 1.0 - (settler.hunger / 200)); // Max 50% penalty at 100 hunger
  effectiveSpeed *= hungerPenalty;
  if (settler.hunger > 0) {
    speedEffects.push(`Hunger penalty: ${hungerPenalty.toFixed(2)}x`);
  }
  
  // Calculate loot multiplier based on scavenging skill and traits
  let lootMultiplier = 1.0;
  const lootEffects: string[] = [];
  const traitEffects: string[] = [];
  
  // Scavenging skill effect (0-20 scale, normalized to 0.8-1.4x multiplier)
  const scavengingMultiplier = 0.8 + (settler.skills.scavenging / 20) * 0.6;
  lootMultiplier *= scavengingMultiplier;
  lootEffects.push(`Scavenging skill: +${((scavengingMultiplier - 1) * 100).toFixed(0)}%`);
  
  // Intelligence affects loot quality/variety
  const intelligenceMultiplier = 0.9 + (settler.stats.intelligence / 20) * 0.3;
  lootMultiplier *= intelligenceMultiplier;
  lootEffects.push(`Intelligence: +${((intelligenceMultiplier - 1) * 100).toFixed(0)}%`);
  
  // Process trait effects
  if (settler.traits && Array.isArray(settler.traits)) {
    settler.traits.forEach((trait: any) => {
      switch (trait.traitId) {
        case 'scavenger':
          lootMultiplier *= 1.15;
          traitEffects.push(`${trait.name}: +15% loot`);
          break;
        case 'quick':
          effectiveSpeed *= 1.2;
          traitEffects.push(`${trait.name}: +20% speed`);
          break;
        case 'strong':
          lootMultiplier *= 1.1;
          traitEffects.push(`${trait.name}: +10% loot`);
          break;
        case 'lazy':
          effectiveSpeed *= 0.8;
          traitEffects.push(`${trait.name}: -20% speed`);
          break;
        case 'weak':
          lootMultiplier *= 0.9;
          traitEffects.push(`${trait.name}: -10% loot`);
          break;
      }
    });
  }
  
  // Calculate final values
  const adjustedDuration = Math.round(baseDuration / effectiveSpeed);
  
  // Apply loot multiplier to planned rewards
  const adjustedPlannedRewards: Record<string, number> = {};
  Object.entries(baseRewards).forEach(([key, amount]) => {
    adjustedPlannedRewards[key] = Math.max(1, Math.round(amount * lootMultiplier));
  });
  
  return {
    adjustedDuration,
    effectiveSpeed,
    lootMultiplier,
    adjustedPlannedRewards,
    effects: {
      speedEffects,
      lootEffects,
      traitEffects
    }
  };
}

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