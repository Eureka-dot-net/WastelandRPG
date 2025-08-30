import cron from 'node-cron';
import { Colony } from '../models/Player/Colony';
import { Inventory } from '../models/Player/Inventory';
import type { ISettler } from '../models/Player/Settler';
import { completeAssignmentsForColony } from '../services/assignmentService';
import { processDailyFood } from '../services/processDailyFood';

const HUNGER_INCREASE = 20;



export async function dailyBatch() {
  const colonies = await Colony.find({}).populate('settlers');
  for (const colony of colonies) {
    await completeAssignmentsForColony(colony);
    // Get inventory for food
    

    for (const settler of colony.settlers) {
      // Increase hunger
      settler.hunger = (settler.hunger || 0) + HUNGER_INCREASE;
      await settler.save(); // persist updates
    }

    processDailyFood(colony);
  }

  console.log('Daily batch process complete');
}

