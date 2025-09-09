import { Request, Response, NextFunction } from "express";
import { processFoodConsumption } from "../services/processDailyFood";
import { withSession } from "../utils/sessionUtils";
import { ColonyManager } from "../managers/ColonyManager";

export const updateCompletedTasks =  async (req: Request, res: Response, next: NextFunction) => {
  const colony = req.colony;
  
  try {
    await withSession(async (session) => {
      const colonyManager = new ColonyManager(colony);
      await colonyManager.completeAssignmentsForColony(session);
      await processFoodConsumption(colony, session); // re process daily tasks as settler might have brought needed food or might have to eat.
    });
    
    next();
  } catch (err) {
    next(err);
  }
}