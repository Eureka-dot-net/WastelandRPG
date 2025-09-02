import { Types } from "mongoose";
import { Assignment, AssignmentDoc } from "../models/Player/Assignment";
import { Request, Response, NextFunction } from "express";
import { Settler } from "../models/Player/Settler";
import itemsCatalogue from "../data/itemsCatalogue.json";
import { Inventory } from "../models/Player/Inventory";
import { completeAssignmentsForColony } from "../services/assignmentService";
import { completeExplorationsForColony } from "../services/explorationService";
import { processFoodConsumption } from "../services/processDailyFood";
import { ClientSession } from "mongoose";

export const updateCompletedTasks =  async (req: Request, res: Response, next: NextFunction) => {
  const colony = req.colony;
  const session: ClientSession = await Assignment.startSession();
  session.startTransaction();

  try {
    await completeAssignmentsForColony(colony, session);
    await completeExplorationsForColony(colony, session); // Handle exploration completion
    await processFoodConsumption(colony, session); // re process daily tasks as settler might have brought needed food or might have to eat.
    await session.commitTransaction();
    session.endSession();
    next();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
}