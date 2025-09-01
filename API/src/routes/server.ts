// src/routes/server.ts
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { Colony } from '../models/Player/Colony';
import { Assignment, AssignmentDoc } from '../models/Player/Assignment';
import { Inventory } from '../models/Player/Inventory';
import { SettlerManager } from '../managers/SettlerManager';
import { ColonyManager } from '../managers/ColonyManager';
import serverCatalogue from '../data/ServerCatalogue.json';
import { createColonyWithSpiralLocation } from '../services/mapService';

const router = Router();

router.get('/', (req, res) => {
  return res.json({ servers: serverCatalogue });
});

// Get all colonies for the authenticated user across all servers
router.get('/colonies', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    const colonies = await Colony.find({ userId }).populate('settlers');
    
    const coloniesByServer = await Promise.all(
      colonies.map(async (colony) => {
        const colonyManager = new ColonyManager(colony);
        const viewModel = await colonyManager.toViewModel();
        const server = serverCatalogue.find(s => s.id === colony.serverId);
        
        return {
          ...viewModel,
          server: server
        };
      })
    );

    return res.json({ colonies: coloniesByServer });
  } catch (error) {
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
    const colony = await createColonyWithSpiralLocation(userId, server.id, colonyName || 'New Colony', server.type);
    // const colony = new Colony({
    //   userId,
    //   serverId: server.id,
    //   serverType: server.type,
    //   colonyName: colonyName || 'New Colony',
    //   level: 1,
    // });
    
    // await colony.save();
    
    const colonyManager = new ColonyManager(colony);
    const viewModel = await colonyManager.toViewModel();
    
    return res.status(201).json({
      message: `Successfully joined ${server.name} server`,
      colony: viewModel
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to join server', error });
  }
});

export default router;
