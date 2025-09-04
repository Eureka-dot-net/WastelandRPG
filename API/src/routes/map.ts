// routes/map.ts
import { Router } from 'express';
import { 
  getMapGrid5x5, 
  startExploration, 
  previewExploration, 
} from '../controllers/mapController';

const router = Router({ mergeParams: true }); // mergeParams needed for :colonyId

// GET /api/colonies/:colonyId/map?x=0&y=0 - returns a 5x5 grid centered on x/y
router.get('/', getMapGrid5x5);

// POST /api/colonies/:colonyId/map/start - starts exploring or scouting a tile
router.post('/start', startExploration);

// GET /api/colonies/:colonyId/map/preview?x=...&y=...&settlerId=... - returns speed/loot info based on query params
router.get('/preview', previewExploration);

export default router;