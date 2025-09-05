// src/routes/dev.ts
import { Router } from 'express';
import { Colony } from '../models/Player/Colony';
import { Assignment } from '../models/Player/Assignment';
import { Inventory } from '../models/Player/Inventory';
import { dailyBatch } from '../jobs/daillyBatch';
import { Settler } from '../models/Player/Settler';
import { withSession } from '../utils/sessionUtils';

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
}

export default router;