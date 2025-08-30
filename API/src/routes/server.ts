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


router.get('/:serverId/colony', authenticate, async (req: Request, res: Response) => {
  const { serverId } = req.params;
  const userId = (req as any).userId;

  const colony = await Colony.findOne({ serverId, userId }).populate('settlers');
  if (!colony) return res.status(404).json({ message: 'Colony not found' });

  const hasSettlers = colony.settlers.length > 0;
  const unlocks = await colony.getUnlocks();
  const resources = await colony.getResources();

  return res.json({
    ...colony.toObject(),
    hasSettlers,
    unlocks,
    ...resources
  });
});

export default router;
