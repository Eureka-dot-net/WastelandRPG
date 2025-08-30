

import { updateCompletedTasks } from '../middleware/updateCompletedTasks';
import type { ColonyDoc } from '../models/Player/Colony';
import { Inventory } from '../models/Player/Inventory';
import { completeAssignmentsForColony } from './assignmentService';

export async function processDailyFood(
  //TODO : check if settler has traits that affect food consumption
  colony: ColonyDoc
) {
  if (!colony) throw new Error("Colony is required for daily food processing");

  // 1. Determine which settlers need feeding
  const HUNGER_THRESHOLD = 10;
  const hungrySettlers = colony.settlers.filter(
    s => s.hunger >= HUNGER_THRESHOLD && s.status === "idle"
  );

  if (hungrySettlers.length === 0) {
    // No need to hit the DB for food
    return;
  }

  // 2. Get food inventory only if needed
  const inventory = await Inventory.findOne({ colonyId: colony._id }).lean();
  const foodItems = (inventory?.items || [])
    .filter(i => i.type === "food" && i.quantity > 0)
    .sort((a, b) => (b.properties.foodValue || 0) - (a.properties.foodValue || 0));

  if (foodItems.length === 0) {
    // No food available, settlers will get hungrier (handled elsewhere)
    return;
  }

  // 3. Round-robin feeding
  let anyFoodLeft = true;
  while (
    foodItems.some(f => f.quantity > 0) &&
    hungrySettlers.some(s => s.hunger >= HUNGER_THRESHOLD)
  ) {
    for (const settler of hungrySettlers) {
      if (settler.hunger < HUNGER_THRESHOLD) continue;

      const foodChoice = foodItems.find(f => f.quantity > 0);
      if (!foodChoice) break; // No food left, stop feeding

      const foodValue = 20 * (foodChoice.properties.foodValue || 0);
      settler.hunger = Math.max(0, settler.hunger - (foodValue));
      foodChoice.quantity -= 1;

      await colony.addLogEntry(
        "food",
        `${settler.name} ate (${foodChoice.itemId}) and reduced hunger by ${foodValue}.`,
        { settlerId: settler._id, item: foodChoice.itemId }
      );

      // gluttonous settlers binge immediately
      if (settler.traits?.some(t => t.traitId === "gluttonous")) {
        while (settler.hunger >= HUNGER_THRESHOLD && foodItems.some(f => f.quantity > 0)) {
          const gluttonousFood = foodItems.find(f => f.quantity > 0)!;
          const gluttonousValue = 20 * (gluttonousFood.properties.foodValue || 0);
          settler.hunger = Math.max(0, settler.hunger - gluttonousValue);
          gluttonousFood.quantity -= 1;
          await colony.addLogEntry(
            "food",
            `${settler.name} ate (${gluttonousFood.itemId}) and reduced hunger by ${gluttonousValue}. This happened due to trait gluttonous`,
            { settlerId: settler._id, item: gluttonousFood.itemId }
          );
        }
      }
      await settler.save(); // persist hunger changes
    }
  }

  // 4. Persist changes
  await Inventory.updateOne(
    { colonyId: colony._id },
    { $set: { items: foodItems } }
  );

  // (Optional) If hunger was updated in memory only, persist settlers too
  // await Colony.updateOne({ _id: colony._id }, { $set: { settlers: hungrySettlers } });
}
