import { Router } from 'express';
import { getRecipes, startRecipe } from '../controllers/craftingController';

const router = Router();

// GET /api/colonies/:colonyId/crafting/recipes
router.get('/recipes', getRecipes);

// POST /api/colonies/:colonyId/crafting/start-recipe
router.post('/start-recipe', startRecipe);

// REMOVED: router.post('/preview-crafting', previewCrafting) - preview functionality moved to frontend

export default router;