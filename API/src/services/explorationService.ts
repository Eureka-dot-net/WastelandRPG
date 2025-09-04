import { Assignment } from "../models/Player/Assignment";
import { Settler } from "../models/Player/Settler";
import { ColonyDoc } from "../models/Player/Colony";
import { ClientSession } from "mongoose";
import { completeGameEventsForColony, shouldFindSettlerDuringEvent, completeGameEvent } from './gameEventsService';

export async function completeExplorationsForColony(colony: ColonyDoc, session: ClientSession, now: Date = new Date()) {
  await completeGameEventsForColony(colony, session, 'exploration', Assignment, undefined, now);
}