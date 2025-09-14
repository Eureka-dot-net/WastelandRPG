// src/routes/dev.ts
import { Router } from 'express';
import { Colony } from '../models/Player/Colony';
import { Assignment } from '../models/Player/Assignment';
import { Inventory } from '../models/Player/Inventory';
import { dailyBatch } from '../jobs/daillyBatch';
import { Settler } from '../models/Player/Settler';
import { withSession } from '../utils/sessionUtils';
import { Types } from 'mongoose';

const router = Router();

if (process.env.NODE_ENV === 'development') {
  router.post('/reset/:colonyId', async (req, res) => {
    console.log(process.env.NODE_ENV);
    const { colonyId } = req.params;

    try {
      await withSession(async (session) => {
        await Assignment.deleteMany({ colonyId }).session(session);
        await Inventory.deleteMany({ colonyId }).session(session);
        await Settler.deleteMany({ colonyId }).session(session);
        await Colony.updateMany({ _id: colonyId }, { $set: { settlers: [], logs: [], level: 1, hasInitialSettlers: false } }).session(session);
      });

      res.json({ message: 'Test data reset!' });
    } catch (error) {
      console.error('Reset failed:', error);
      res.status(500).json({ message: 'Reset failed', error });
    }
  });

  router.post('/dailybatch', async (req, res) => {
    await dailyBatch();
    res.json({ message: 'Daily batch process started!' });
  });

  // Update settler energy for testing
  router.patch('/settler/:settlerId/energy', async (req, res) => {
    const { settlerId } = req.params;
    const { energy } = req.body;

    if (!Types.ObjectId.isValid(settlerId)) {
      return res.status(400).json({ error: 'Invalid settlerId' });
    }

    if (typeof energy !== 'number' || energy < 0 || energy > 100) {
      return res.status(400).json({ error: 'Energy must be a number between 0 and 100' });
    }

    try {
      const settler = await Settler.findByIdAndUpdate(
        settlerId,
        { 
          energy,
          lastUpdate: new Date()
        },
        { new: true }
      );

      if (!settler) {
        return res.status(404).json({ error: 'Settler not found' });
      }

      res.json({
        success: true,
        settler: {
          _id: settler._id,
          name: settler.name,
          energy: settler.energy
        }
      });
    } catch (error) {
      console.error('Energy update failed:', error);
      res.status(500).json({ error: 'Failed to update settler energy' });
    }
  });
}

export default router;