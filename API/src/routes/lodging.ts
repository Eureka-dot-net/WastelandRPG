// routes/lodging.ts
import { Router } from 'express';
import { 
  getBeds, 
  startSleep, 
  getSleepPreviewBatch 
} from '../controllers/lodgingController';

const router = Router({ mergeParams: true }); // mergeParams needed for :colonyId

// GET /api/colonies/:colonyId/lodging/beds - returns all beds for the colony
router.get('/beds', getBeds);

// POST /api/colonies/:colonyId/lodging/start-sleep - starts a sleep assignment
router.post('/start-sleep', startSleep);

// POST /api/colonies/:colonyId/lodging/preview-sleep-batch - batch preview sleep durations
router.post('/preview-sleep-batch', getSleepPreviewBatch);

export default router;