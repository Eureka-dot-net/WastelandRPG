import { AssignmentDoc, Assignment } from "../models/Player/Assignment";
import { Inventory } from "../models/Player/Inventory";
import { Settler } from "../models/Player/Settler";
import itemsCatalogue from '../data/itemsCatalogue.json';
import { Colony, ColonyDoc } from "../models/Player/Colony";

function getItemCatalogue(itemId: string) {
  return itemsCatalogue.find(item => item.itemId === itemId);
}

async function addRewardsToColonyInventory(colonyId: string, rewards: Record<string, number>) {
  //todo: inventory should not exceed max size
  if (!colonyId) throw new Error("colonyId required!");

  let inventory = await Inventory.findOne({ colonyId });

  // If no inventory exists, create one
  if (!inventory) {
    inventory = new Inventory({
      colonyId,
      items: [],
    });
  }

  for (const [itemId, qty] of Object.entries(rewards)) {
    if (qty <= 0) continue;
    const catalogueItem = getItemCatalogue(itemId);
    if (!catalogueItem) throw new Error(`Item ${itemId} not found in catalogue`);

    // Find item in inventory
    const invItem = inventory.items.find(item => item.itemId === itemId);
    if (invItem) {
      invItem.quantity += qty;
    } else {
      inventory.items.push({
        itemId,
        name: catalogueItem.name,
        icon: catalogueItem.icon,
        quantity: qty,
        type: catalogueItem.type,
        properties: catalogueItem.properties || {},
      });
    }
  }

  await inventory.save();
}

export async function completeAssignmentsForColony(colony: ColonyDoc, now: Date = new Date()) {
  const assignments: AssignmentDoc[] = await Assignment.find({
    colonyId: colony._id,
    state: 'in-progress',
    completedAt: { $lte: now }
  });

  for (const assignment of assignments) {
    assignment.state = 'completed';
    await Settler.findByIdAndUpdate(assignment.settlerId, { status: 'idle' });
    if (assignment.plannedRewards) {
      await addRewardsToColonyInventory(colony._id.toString(), assignment.plannedRewards);
    }
    await colony.addLogEntry("assignment", `Assignment '${assignment.name}' completed. Rewards ${JSON.stringify(assignment.plannedRewards)}`, { assignmentId: assignment._id });
    await assignment.save();
    
  }
}