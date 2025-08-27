// src/routes/server.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { Colony } from '../models/Player/Colony';

const router = Router();

// For now, hardcode one server
const SERVERS = ['server-1'];

router.get('/', (req, res) => {
  return res.json({ servers: SERVERS });
});

router.get('/:serverId/colony', authenticate, async (req, res) => {
  const { serverId } = req.params;
  const userId = (req as any).userId;

  const colony = await Colony.findOne({ serverId, userId });
  if (!colony) return res.status(404).json({ message: 'Colony not found' });

  return res.json(colony);
});

export default router;
