import cron from 'node-cron';
import { Colony } from '../models/Player/Colony';
import { Inventory } from '../models/Player/Inventory';
import type { ISettler } from '../models/Player/Settler';
import { completeAssignmentsForColony } from '../services/assignmentService';
import { processFoodConsumption } from '../services/processDailyFood';
import { ClientSession } from 'mongoose';

const HUNGER_INCREASE = 20;

export async function dailyBatch() {
  const colonies = await Colony.find({}).populate('settlers');
  for (const colony of colonies) {
    const session: ClientSession = await Colony.startSession();
    session.startTransaction();
    try {
      await completeAssignmentsForColony(colony, session);

      for (const settler of colony.settlers) {
        // Increase hunger
        settler.hunger = (settler.hunger || 0) + HUNGER_INCREASE;
        await settler.save({ session }); // persist updates
      }

      await processFoodConsumption(colony, session);
      //TODO: Check if any settlers died on extreme server

      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  console.log('Daily batch process complete');
}