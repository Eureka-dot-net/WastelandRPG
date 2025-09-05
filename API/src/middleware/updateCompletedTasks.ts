import { Request, Response, NextFunction } from "express";
import { completeAssignmentsForColony } from "../services/assignmentService";
import { completeExplorationsForColony } from "../services/explorationService";
import { processFoodConsumption } from "../services/processDailyFood";
import { withSession } from "../utils/sessionUtils";

export const updateCompletedTasks =  async (req: Request, res: Response, next: NextFunction) => {
  const colony = req.colony;
  
  try {
    await withSession(async (session) => {
      await completeAssignmentsForColony(colony, session);
      await completeExplorationsForColony(colony, session); // Handle exploration completion
      await processFoodConsumption(colony, session); // re process daily tasks as settler might have brought needed food or might have to eat.
    });
    
    next();
  } catch (err) {
    next(err);
  }
}