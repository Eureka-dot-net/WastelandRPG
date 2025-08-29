import { Types } from "mongoose";
import { Assignment, AssignmentDoc } from "../models/Player/Assignment";
import { Request, Response, NextFunction } from "express";
import { Settler } from "../models/Player/Settler";
import itemsCatalogue from "../data/itemsCatalogue.json";
import { Inventory } from "../models/Player/Inventory";

function getItemCatalogue(itemId: string) {
  return itemsCatalogue.find(item => item.itemId === itemId);
}


async function addRewardsToColonyInventory(colonyId: string, rewards: Record<string, number>) {
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
        quantity: qty,
        type: catalogueItem.type,
        properties: catalogueItem.properties || {},
      });
    }
  }

  await inventory.save();
}

export const updateCompletedTasks =  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const { colonyId } = req.params;
  const assignmentToComplete: AssignmentDoc[] = await Assignment.find({
    colonyId: colonyId,
    state: 'in-progress',
    completedAt: { $lte: now }
  });

  for (const assignment of assignmentToComplete) {
    assignment.state = 'completed';

    await Settler.findByIdAndUpdate(assignment.settlerId, { status: 'idle' });

    if (assignment.plannedRewards)
    {
      await addRewardsToColonyInventory(colonyId, assignment.plannedRewards);
    }

    await assignment.save();
  }
  next();
}