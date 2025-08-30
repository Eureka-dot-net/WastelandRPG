import { Types } from "mongoose";
import { Assignment, AssignmentDoc } from "../models/Player/Assignment";
import { Request, Response, NextFunction } from "express";
import { Settler } from "../models/Player/Settler";
import itemsCatalogue from "../data/itemsCatalogue.json";
import { Inventory } from "../models/Player/Inventory";
import { completeAssignmentsForColony } from "../services/assignmentService";



export const updateCompletedTasks =  async (req: Request, res: Response, next: NextFunction) => {
  const colony = req.colony;
  await completeAssignmentsForColony(colony);
  next();
}