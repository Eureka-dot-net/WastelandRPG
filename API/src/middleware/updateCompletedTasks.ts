import { Types } from "mongoose";
import { Assignment, AssignmentDoc } from "../models/Player/Assignment";
import { Request, Response, NextFunction } from "express";
import { Settler } from "../models/Player/Settler";


function addRewardsToSettlerInventory(settlerId: Types.ObjectId | undefined, rewards: any) {
    //throw new Error("Function not implemented.");
    // TODO: Implement reward addition logic
}

export const updateCompletedTasks =  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const { colonyId } = req.params;
  const assignmentToComplete: AssignmentDoc[] = await Assignment.find({
    colonyId: colonyId,
    state: 'in-progress',
    completedAt: { $lte: now }
  });

  for (const assignment of assignmentToComplete) {
    assignment.state = 'completed';

    await Settler.findByIdAndUpdate(assignment.settlerId, { status: 'idle' });

    // Add rewards to inventory
    await addRewardsToSettlerInventory(assignment.settlerId, assignment.plannedRewards);

    await assignment.save();
  }
  next();
}