import { Types } from "mongoose";
import { Assignment, AssignmentDoc } from "../models/Player/Assignment";
import { Request, Response, NextFunction } from "express";
import { Settler } from "../models/Player/Settler";
import itemsCatalogue from "../data/itemsCatalogue.json";
import { Inventory } from "../models/Player/Inventory";
import { completeAssignmentsForColony } from "../services/assignmentService";
import { processDailyFood } from "../services/processDailyFood";



export const updateCompletedTasks =  async (req: Request, res: Response, next: NextFunction) => {
  const colony = req.colony;
  await completeAssignmentsForColony(colony);
  await processDailyFood(colony); // re process daily tasks as settler might have brought
    //needed food or might have to eat.
  next();
}