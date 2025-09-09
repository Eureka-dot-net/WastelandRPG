import { Colony } from '../models/Player/Colony';
import { processFoodConsumption } from '../services/processDailyFood';
import { withSession } from '../utils/sessionUtils';
import { logError, logInfo } from '../utils/logger';
import { ColonyManager } from '../managers/ColonyManager';

const HUNGER_INCREASE = 20;

export async function dailyBatch() {
  logInfo('Starting daily batch process');
  const colonies = await Colony.find({}).populate('settlers');
  
  for (const colony of colonies) {
    try {
      await withSession(async (session) => {
        const colonyManager = new ColonyManager(colony);
        await colonyManager.completeAssignmentsForColony(session);

        for (const settler of colony.settlers) {
          // Increase hunger
          settler.hunger = (settler.hunger || 0) + HUNGER_INCREASE;
          await settler.save({ session }); // persist updates
        }

        await processFoodConsumption(colony, session);
        //TODO: Check if any settlers died on extreme server
      });
    } catch (err) {
      logError('Daily batch failed for colony', err, { colonyId: colony._id });
      // Continue with other colonies even if one fails
    }
  }

  logInfo('Daily batch process complete');
}