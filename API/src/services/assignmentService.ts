import { AssignmentDoc, Assignment } from "../models/Player/Assignment";
import { ColonyDoc } from "../models/Player/Colony";
import cleaningTasksCatalogue from '../data/cleaningTasksCatalogue.json';
import { ClientSession } from "mongoose";
import { completeGameEventsForColony } from './gameEventsService';

export async function completeAssignmentsForColony(colony: ColonyDoc, session: ClientSession, now: Date = new Date()) {
  await completeGameEventsForColony(colony, session, 'assignment', Assignment, {
    getTaskData: (assignment: AssignmentDoc) => {
      return cleaningTasksCatalogue.find(task => task.taskId === assignment.taskId);
    }
  }, now, { type: { $ne: 'exploration' } }); // Exclude exploration assignments
}