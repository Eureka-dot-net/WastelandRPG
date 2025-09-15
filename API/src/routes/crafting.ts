import { Router } from 'express';
import { getRecipes, startRecipe, previewCrafting } from '../controllers/craftingController';

const router = Router();

// GET /api/colonies/:colonyId/crafting/recipes
router.get('/recipes', getRecipes);

// POST /api/colonies/:colonyId/crafting/start-recipe
router.post('/start-recipe', startRecipe);

// POST /api/colonies/:colonyId/crafting/preview-crafting
router.post('/preview-crafting', previewCrafting);

export default router;