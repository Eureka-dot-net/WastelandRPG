

import type { ColonyDoc } from '../models/Player/Colony';

export async function processDailyFood(colony: ColonyDoc, serverType: "pve" | "pvpHardcore") {
  // 1. Calculate total available food (daysFood already exists in your colony)
  const resources = await colony.getResources();
//   let totalFood = resources.daysFood * colony.settlers.length;

//   // 2. Loop through settlers
//   const updatedSettlers = colony.settlers.map(settler => {
//     // Consume 1 day of food per settler
//     if (totalFood >= 1) {
//       totalFood -= 1;
//       settler.hunger = Math.max(0, settler.hunger - 20); // reduce hunger
//     } else {
//       settler.hunger = Math.min(100, (settler.hunger || 0) + 20); // increase hunger
//     }

//     // 3. Apply effects based on hunger & server type
//     if (settler.hunger >= HUNGER_CONFIG[serverType].max) {
//       if (serverType === "pve") {
//         settler.speed *= HUNGER_EFFECTS.maxPve.speedMultiplier;
//         settler.health -= HUNGER_EFFECTS.maxPve.healthDrain;
//       } else {
//         settler.status = HUNGER_EFFECTS.maxPvp.status; // dead
//       }
//     } else if (settler.hunger >= HUNGER_CONFIG[serverType].heavy) {
//       settler.speed *= HUNGER_EFFECTS.heavy.speedMultiplier;
//       settler.morale += HUNGER_EFFECTS.heavy.moraleChange;
//     } else if (settler.hunger >= HUNGER_CONFIG[serverType].mild) {
//       settler.speed *= HUNGER_EFFECTS.mild.speedMultiplier;
//       settler.morale += HUNGER_EFFECTS.mild.moraleChange;
//     }

    // return settler;
//   });

//   // 4. Update colony daysFood
//   colony.daysFood = totalFood / colony.settlers.length;

//   // 5. Save changes
//   await colony.save();

//   return updatedSettlers;
}
