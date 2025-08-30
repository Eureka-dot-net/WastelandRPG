// src/routes/server.ts
import { Router, Request, Response } from 'express';
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

function getUnlocks(assignments: AssignmentDoc[]): Record<string, boolean> {
  const unlocks: Record<string, boolean> = {};

  for (const a of assignments) {
      if (a.unlocks) {
        // Could be string or array
        if (Array.isArray(a.unlocks)) {
          for (const key of a.unlocks) unlocks[key] = true;
        } else {
          unlocks[a.unlocks] = true;
        }
    }
  }

  return unlocks;
}

router.get('/:serverId/colony', authenticate, async (req: Request, res: Response) => {
  const { serverId } = req.params;
  const userId = (req as any).userId;

  const colony = await Colony.findOne({ serverId, userId }).populate('settlers');
  if (!colony) return res.status(404).json({ message: 'Colony not found' });

  const hasSettlers = colony.settlers.length > 0;
  const completeAssignments = await Assignment.find({ colonyId: colony._id, type: "general", state: { $in: ['completed', 'informed'] } });

  const unlocks = getUnlocks(completeAssignments);

  const [daysFood, scrapMetal, wood] = await Promise.all([
    Inventory.aggregate([
      { $match: { colonyId: colony._id } },
      { $unwind: "$items" },
      { $match: { "items.type": "food" } },
      {
        $group: {
          _id: "$colonyId",
          totalFood: {
            $sum: {
              $multiply: ["$items.quantity", "$items.properties.foodValue"]
            }
          }
        }
      }
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
    unlocks,
    daysFood: daysFood.length > 0 ? Number((daysFood[0].totalFood / (colony.settlers.length || 1)).toFixed(1)) : 0,
    scrapMetal: scrapMetal?.items?.[0]?.quantity || 0,
    wood: wood?.items?.[0]?.quantity || 0
  });
});

export default router;
