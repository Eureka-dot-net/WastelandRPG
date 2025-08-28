// src/routes/server.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { Colony } from '../models/Player/Colony';
import { Assignment } from '../models/Player/Assignment';

const router = Router();

// For now, hardcode one server
const SERVERS = ['server-1'];

router.get('/', (req, res) => {
  return res.json({ servers: SERVERS });
});

router.get('/:serverId/colony', authenticate, async (req, res) => {
  const { serverId } = req.params;
  const userId = (req as any).userId;

  const colony = await Colony.findOne({ serverId, userId })
    .populate('settlers');
  if (!colony) return res.status(404).json({ message: 'Colony not found' });

  //TODO : This will get slow when we have a lot of assignments. Store in database and only check if it is false.
  const hasSettlers = colony.settlers.length > 0;

  const assignments = await Assignment.find({ colonyId: colony._id, state: 'completed' });
  const homeUnlocked = assignments.some(a => a.taskId === "salvage_gate_ruins");

  const mapUnlocked = assignments.some(a => a.taskId === "scout_surrounding_area");
  const sleepingQuartersUnlocked = assignments.some(a => a.taskId === "clear_out_ruins");
  const farmingUnlocked = assignments.some(a => a.taskId === "clear_farm_land");
  const craftingUnlocked = assignments.some(a => a.taskId === "clean_out_workshop");
  const defenceUnlocked = assignments.some(a => a.taskId === "scavenge_perimeter_debris");

  return res.json({
      ...colony.toObject(),
      hasSettlers,
      homeUnlocked,
      mapUnlocked,
      craftingUnlocked,
      sleepingQuartersUnlocked,
      farmingUnlocked,
      defenceUnlocked
    });
});

export default router;
