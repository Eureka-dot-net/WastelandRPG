// src/routes/server.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { Colony } from '../models/Player/Colony';
import { Assignment, AssignmentDoc } from '../models/Player/Assignment';
import { Inventory } from '../models/Player/Inventory';

const router = Router();

// For now, hardcode one server
const SERVERS = ['server-1'];

router.get('/', (req, res) => {
  return res.json({ servers: SERVERS });
});

function getUnlocks(assignments: AssignmentDoc[]) {
  return {
    homeUnlocked: assignments.some(a => a.taskId === "salvage_gate_ruins"),
    mapUnlocked: assignments.some(a => a.taskId === "scout_surrounding_area"),
    sleepingQuartersUnlocked: assignments.some(a => a.taskId === "clear_out_ruins"),
    farmingUnlocked: assignments.some(a => a.taskId === "clear_farm_land"),
    craftingUnlocked: assignments.some(a => a.taskId === "clean_out_workshop"),
    defenceUnlocked: assignments.some(a => a.taskId === "scavenge_perimeter_debris")
  };
}

router.get('/:serverId/colony', authenticate, async (req, res) => {
  const { serverId } = req.params;
  const userId = (req as any).userId;

  const colony = await Colony.findOne({ serverId, userId }).populate('settlers');
  if (!colony) return res.status(404).json({ message: 'Colony not found' });

  const hasSettlers = colony.settlers.length > 0;
  const assignments = await Assignment.find({ colonyId: colony._id, state: { $in: ['completed', 'informed'] } });

  const unlocks = getUnlocks(assignments);

  const [daysFood, scrapMetal, wood] = await Promise.all([
    Inventory.aggregate([
      { $match: { colonyId: colony._id } },
      { $unwind: "$items" },
      { $match: { "items.type": "food" } },
      { $group: { _id: "$colonyId", totalFood: { $sum: "$items.quantity" } } }
    ]),
    Inventory.findOne(
      { colonyId: colony._id },
      { items: { $elemMatch: { itemId: "scrap" } } }
    ).lean(),
    Inventory.findOne(
      { colonyId: colony._id },
      { items: { $elemMatch: { itemId: "wood" } } }
    ).lean()
  ]);

  return res.json({
    ...colony.toObject(),
    hasSettlers,
    ...unlocks,
    daysFood: daysFood.length > 0 ? Math.floor(daysFood[0].totalFood / (colony.settlers.length || 1)) : 0,
    scrapMetal: scrapMetal?.items?.[0]?.quantity || 0,
    wood: wood?.items?.[0]?.quantity || 0
  });
});

export default router;
