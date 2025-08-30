// src/routes/dev.ts
import { Router } from 'express';
import { Colony } from '../models/Player/Colony';
import { Assignment } from '../models/Player/Assignment';
import { Inventory } from '../models/Player/Inventory';

const router = Router();

if (process.env.NODE_ENV === 'development') {
  router.post('/reset/:colonyId', async (req, res) => {
    const { colonyId } = req.params;

    await Assignment.deleteMany({ colonyId });
    await Inventory.deleteMany({ colonyId });

    // Optionally, reset colony too
    await Colony.updateMany({ _id: colonyId }, { $set: { settlers: [], level: 1 } });

    res.json({ message: 'Test data reset!' });
  });
}

export default router;