# Crafting System Implementation

## Overview

I've successfully implemented a complete crafting system for WastelandRPG following the existing patterns from the lodging controller. The implementation includes:

## Features Implemented

### 1. GetRecipes Endpoint
- **Route**: `GET /api/colonies/:colonyId/crafting/recipes`
- **Purpose**: Returns all available recipes with availability status
- **Response**: Array of recipes with `canCraft` boolean indicating if colony has sufficient materials

### 2. StartRecipe Endpoint  
- **Route**: `POST /api/colonies/:colonyId/crafting/start-recipe`
- **Purpose**: Starts a crafting assignment for a settler
- **Body**: `{ settlerId: string, itemId: string }`
- **Features**:
  - Validates settler availability (must be idle)
  - Checks material requirements from colony inventory
  - Consumes input materials immediately
  - Creates crafting assignment with adjusted duration based on settler skills
  - Sets settler status to 'crafting'

### 3. PreviewCrafting Endpoint
- **Route**: `POST /api/colonies/:colonyId/crafting/preview-crafting`
- **Purpose**: Previews crafting time and requirements for a settler-recipe combination
- **Body**: `{ settlerId: string, itemId: string }`
- **Response**: Duration calculations, settler adjustments, and eligibility status

## Architecture Integration

### Assignment Completion
- Crafting assignments automatically complete via existing `updateCompletedTasks` middleware
- When completed, the `AssignmentManager` processes `plannedRewards` (the crafted item)
- Crafted items are added to colony inventory through the existing reward system
- Settler returns to 'idle' status automatically

### Settler Adjustments
- Uses `SettlerManager.calculateAdjustments()` with 'crafting' activity type
- Settler's crafting skill, intelligence, and traits affect crafting speed
- Higher crafting skill = faster completion times

### Recipe System
- Recipes are defined in `itemsCatalogue.json` with the following structure:
```json
{
  "itemId": "spear",
  "name": "Spear", 
  "recipe": [
    { "itemId": "wood", "quantity": 4 },
    { "itemId": "scrap", "quantity": 2 }
  ],
  "craftingTime": 5
}
```

## Usage Example

1. **Get Available Recipes**:
   ```
   GET /api/colonies/{colonyId}/crafting/recipes
   Authorization: Bearer {token}
   ```

2. **Preview Crafting**:
   ```
   POST /api/colonies/{colonyId}/crafting/preview-crafting
   {
     "settlerId": "settler123",
     "itemId": "spear"
   }
   ```

3. **Start Crafting**:
   ```
   POST /api/colonies/{colonyId}/crafting/start-recipe
   {
     "settlerId": "settler123", 
     "itemId": "spear"
   }
   ```

4. **Wait for Completion**: Assignment auto-completes when time expires and crafted item appears in colony inventory

## Implementation Files

- **Controller**: `API/src/controllers/craftingController.ts`
- **Routes**: `API/src/routes/crafting.ts` 
- **App Integration**: Added to `API/src/app.ts`
- **Tests**: `API/tests/crafting.test.ts` (comprehensive test suite)

## Validation & Error Handling

- Invalid colonyId/settlerId validation
- Settler availability checks (must be idle)
- Material sufficiency validation
- Energy requirement validation
- Proper error responses with descriptive messages

## MongoDB Session Safety

All write operations use `withSession()` for transaction safety, following the established patterns in the codebase.

The crafting system is fully integrated with the existing game mechanics and ready for use!