// src/routes/dev.ts
import { Router } from 'express';
import { Colony } from '../models/Player/Colony';
import { Assignment } from '../models/Player/Assignment';
import { Inventory } from '../models/Player/Inventory';
import { dailyBatch } from '../jobs/daillyBatch';

const router = Router();

if (process.env.NODE_ENV === 'development') {
  router.post('/reset/:colonyId', async (req, res) => {
    console.log(process.env.NODE_ENV);
    const { colonyId } = req.params;

    await Assignment.deleteMany({ colonyId });
    await Inventory.deleteMany({ colonyId });

    // Optionally, reset colony too
    //await Colony.updateMany({ _id: colonyId }, { $set: { settlers: [], level: 1 } });

    res.json({ message: 'Test data reset!' });
  });

  router.post('/dailybatch', async (req, res) => {
    await dailyBatch();
    res.json({ message: 'Daily batch process started!' });
  });
}

export default router;