// routes/map.ts
import { Router } from 'express';
import { 
  getMapGrid5x5, 
  startExploration, 
  previewExploration, 
  previewExplorationBatch,
} from '../controllers/mapController';

const router = Router({ mergeParams: true }); // mergeParams needed for :colonyId

// GET /api/colonies/:colonyId/map?x=0&y=0 - returns a 5x5 grid centered on x/y
router.get('/', getMapGrid5x5);

// POST /api/colonies/:colonyId/map/start - starts exploring or scouting a tile
router.post('/start', startExploration);

// GET /api/colonies/:colonyId/map/preview-batch?settlerIds=...&coordinates=... - batch preview
router.get('/preview-batch', previewExplorationBatch);

// GET /api/colonies/:colonyId/map/preview?x=...&y=...&settlerId=... - single preview
router.get('/preview', previewExploration);

export default router;