// src/routes/server.ts
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { Colony } from '../models/Player/Colony';
import { Assignment, AssignmentDoc } from '../models/Player/Assignment';
import { Inventory } from '../models/Player/Inventory';
import { SettlerManager } from '../managers/SettlerManager';
import { ColonyManager } from '../managers/ColonyManager';
import serverCatalogue from '../data/ServerCatalogue.json';

const router = Router();

router.get('/', (req, res) => {
  return res.json({ servers: serverCatalogue });
});


router.get('/:serverId/colony', authenticate, async (req: Request, res: Response) => {
  const { serverId } = req.params;
  const userId = (req as any).userId;

  const colony = await Colony.findOne({ serverId, userId }).populate('settlers');
  if (!colony) return res.status(404).json({ message: 'Colony not found' });

  const colonyManager = new ColonyManager(colony);
  const viewModel = await colonyManager.toViewModel();

  return res.json({
    ...viewModel
  });
});

export default router;
