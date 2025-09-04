// routes/map.ts
import { Router } from 'express';
import { 
  getMapGrid5x5, 
  startExploration, 
  previewExploration, 
} from '../controllers/mapController';

const router = Router({ mergeParams: true }); // mergeParams needed for :colonyId

// GET /api/colonies/:colonyId/map/:x/:y - returns a 5x5 grid centered on x/y
router.get('/:x/:y', getMapGrid5x5);

// POST /api/colonies/:colonyId/map/:x/:y/start - starts exploring or scouting a tile
router.post('/:x/:y/start', startExploration);

// POST /api/colonies/:colonyId/map/:x/:y/preview - returns speed/loot info based on settlerId
router.post('/:x/:y/preview', previewExploration);

export default router;