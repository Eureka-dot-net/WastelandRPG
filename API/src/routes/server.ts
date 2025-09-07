// src/routes/server.ts
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { Colony } from '../models/Player/Colony';
import { ColonyManager } from '../managers/ColonyManager';
import serverCatalogue from '../data/ServerCatalogue.json';
import { createColonyWithSpiralLocation } from '../services/mapService';
import { logError } from '../utils/logger';
import { withSession } from '../utils/sessionUtils';

const router = Router();

router.get('/', (req, res) => {
  return res.json({ servers: serverCatalogue });
});

// Get all colonies for the authenticated user across all servers
router.get('/colonies', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    const colonies = await Colony.find({ userId }).populate('settlers');
    
    const coloniesViewModels = colonies.map((colony) => ({
      userId: colony.userId,
      serverId: colony.serverId,
      serverName: colony.serverName,
      serverType: colony.serverType,
      colonyName: colony.colonyName
    }));

    return res.json({ colonies: coloniesViewModels });
  } catch (error) {
    logError('Failed to retrieve colonies', error, { userId });
    return res.status(500).json({ message: 'Failed to retrieve colonies', error });
  }
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

// Join a new server (create colony on additional server)
router.post('/:serverId/join', authenticate, async (req: Request, res: Response) => {
  const { serverId } = req.params;
  const { colonyName } = req.body;
  const userId = (req as any).userId;

  // Validate serverId exists in catalogue
  const server = serverCatalogue.find(s => s.id === serverId);
  if (!server) {
    return res.status(400).json({ message: 'Invalid server' });
  }

  // Check if user already has a colony on this server
  const existingColony = await Colony.findOne({ serverId, userId });
  if (existingColony) {
    return res.status(400).json({ message: 'You already have a colony on this server' });
  }

  try {
    const result = await withSession(async (session) => {
      const colony = await createColonyWithSpiralLocation(userId, server.id, colonyName || 'New Colony', server.type, server.name, 10, 5, session);
      
      const colonyManager = new ColonyManager(colony);
      const viewModel = await colonyManager.toViewModel();
      
      return {
        message: `Successfully joined ${server.name} server`,
        colony: viewModel
      };
    });
    
    return res.status(201).json(result);
  } catch (error) {
    logError('Failed to join server', error, { userId, serverId, colonyName, serverName: server.name });
    return res.status(500).json({ message: 'Failed to join server', error });
  }
});

export default router;
