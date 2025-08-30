import cron from 'node-cron';
import { Colony } from '../models/Player/Colony';
import { Inventory } from '../models/Player/Inventory';
import type { ISettler } from '../models/Player/Settler';

const HUNGER_INCREASE = 20;
const FOOD_PER_MEAL = 1; // adjust as needed

export async function dailyBatch() {
 const colonies = await Colony.find({}).populate('settlers');
  for (const colony of colonies) {
    // Get inventory for food
    const inventory = await Inventory.findOne({ colonyId: colony._id });
    let food = inventory ? inventory.items.filter(i => i.type === 'food').reduce((sum, i) => sum + i.quantity, 0) : 0;

    for (const settler of colony.settlers) {
      // Increase hunger
      settler.hunger = (settler.hunger || 0) + HUNGER_INCREASE;
      await settler.save(); // persist updates
    }
  }

  console.log('Daily batch process complete');
}

