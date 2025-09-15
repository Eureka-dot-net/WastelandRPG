import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Settler } from '../models/Player/Settler';
import { Assignment, IAssignment } from '../models/Player/Assignment';
import { Inventory } from '../models/Player/Inventory';
import { ColonyManager } from '../managers/ColonyManager';
import { SettlerManager } from '../managers/SettlerManager';
import { logError } from '../utils/logger';
import { withSession } from '../utils/sessionUtils';
import itemsCatalogue from '../data/itemsCatalogue.json';

// GET /api/colonies/:colonyId/crafting/recipes
export const getRecipes = async (req: Request, res: Response) => {
  const { colonyId } = req.params;

  if (!Types.ObjectId.isValid(colonyId)) {
    return res.status(400).json({ error: 'Invalid colonyId' });
  }

  try {
    const colony = req.colony;

    // Get colony inventory
    const inventory = await Inventory.findOne({ colonyId: colony._id });
    const inventoryItems = inventory?.items || [];
    
    // Create a map for quick lookup of available items
    const availableItems = new Map(
      inventoryItems.map(item => [item.itemId, item.quantity])
    );

    // Filter items that have recipes and enrich with availability
    const recipes = itemsCatalogue
      .filter(item => item.recipe && Array.isArray(item.recipe))
      .map(item => {
        const canCraft = item.recipe!.every(ingredient => {
          const available = availableItems.get(ingredient.itemId) || 0;
          return available >= ingredient.quantity;
        });

        return {
          itemId: item.itemId,
          name: item.name,
          type: item.type,
          description: item.description,
          icon: item.icon,
          tradeValue: item.tradeValue,
          rarity: item.rarity,
          recipe: item.recipe,
          craftingTime: item.craftingTime || 60, // Default to 60 minutes if not specified
          canCraft,
          obtainMethods: item.obtainMethods,
          properties: item.properties
        };
      });

    res.json({ recipes });
  } catch (err) {
    logError('Failed to get recipes', err, { colonyId });
    res.status(500).json({ error: 'Failed to get recipes' });
  }
};

// POST /api/colonies/:colonyId/crafting/start-recipe
export const startRecipe = async (req: Request, res: Response) => {
  const { colonyId } = req.params;
  const { settlerId, itemId } = req.body;

  if (!Types.ObjectId.isValid(colonyId)) {
    return res.status(400).json({ error: 'Invalid colonyId' });
  }

  if (!settlerId) {
    return res.status(400).json({ error: 'settlerId is required' });
  }

  if (!Types.ObjectId.isValid(settlerId)) {
    return res.status(400).json({ error: 'Invalid settlerId' });
  }

  if (!itemId) {
    return res.status(400).json({ error: 'itemId is required' });
  }

  try {
    const result = await withSession(async (session) => {
      const colony = req.colony;

      // Find the item and its recipe
      const craftableItem = itemsCatalogue.find(item => item.itemId === itemId);
      if (!craftableItem || !craftableItem.recipe) {
        throw new Error('Item not found or not craftable');
      }

      // Find the settler
      const settler = await Settler.findById(settlerId).session(session);
      if (!settler) {
        throw new Error('Settler not found');
      }

      if (settler.colonyId.toString() !== colony._id.toString()) {
        throw new Error('Settler does not belong to this colony');
      }

      // Check if settler is available
      if (settler.status !== 'idle') {
        throw new Error(`Settler is currently ${settler.status} and cannot be assigned to crafting`);
      }

      // Get colony inventory and check materials
      const inventory = await Inventory.findOne({ colonyId: colony._id }).session(session);
      if (!inventory) {
        throw new Error('Colony inventory not found');
      }

      // Create a map for quick lookup
      const inventoryMap = new Map(
        inventory.items.map(item => [item.itemId, item])
      );

      // Check if we have all required materials
      const missingMaterials: string[] = [];
      for (const ingredient of craftableItem.recipe) {
        const available = inventoryMap.get(ingredient.itemId);
        if (!available || available.quantity < ingredient.quantity) {
          missingMaterials.push(`${ingredient.itemId} (need ${ingredient.quantity}, have ${available?.quantity || 0})`);
        }
      }

      if (missingMaterials.length > 0) {
        throw new Error(`Insufficient materials: ${missingMaterials.join(', ')}`);
      }

      // Remove input materials from inventory
      for (const ingredient of craftableItem.recipe) {
        const inventoryItem = inventoryMap.get(ingredient.itemId)!;
        inventoryItem.quantity -= ingredient.quantity;
        
        // Remove item entirely if quantity reaches 0
        if (inventoryItem.quantity <= 0) {
          inventory.items = inventory.items.filter(item => item.itemId !== ingredient.itemId);
        }
      }

      await inventory.save({ session });

      const settlerManager = new SettlerManager(settler);

      // Calculate crafting duration based on settler stats and item crafting time
      const baseDurationMinutes = craftableItem.craftingTime || 60;
      const baseDurationMs = baseDurationMinutes * 60 * 1000;
      
      // Use crafting activity type for adjustments
      const adjustments = settlerManager.calculateAdjustments(baseDurationMs, 'crafting');

      // Check if settler has enough energy for the task
      const taskDurationHours = adjustments.adjustedDuration / (1000 * 60 * 60);
      if (!settlerManager.canCompleteTask('crafting', taskDurationHours)) {
        throw new Error('Settler does not have enough energy to complete this crafting assignment');
      }

      // Create the crafting assignment
      const completedAt = new Date(Date.now() + adjustments.adjustedDuration);
      const assignmentData: IAssignment = {
        colonyId: colony._id,
        settlerId: settler._id,
        name: `Crafting ${craftableItem.name}`,
        type: 'crafting',
        duration: baseDurationMinutes, // Store original duration in minutes
        description: `${settler.name} is crafting ${craftableItem.name}`,
        state: 'in-progress',
        startedAt: new Date(),
        completedAt,
        plannedRewards: { [itemId]: 1 }, // The crafted item
        adjustments
      };

      const assignment = new Assignment(assignmentData);

      // Change settler status to crafting
      await settlerManager.changeStatus('crafting', new Date(), session);

      // Save the assignment
      await assignment.save({ session });

      // Log crafting start
      const colonyManager = new ColonyManager(colony);
      await colonyManager.addLogEntry(
        session,
        'crafting',
        `${settler.name} started crafting ${craftableItem.name}.`,
        { settlerId, itemId }
      );

      return {
        success: true,
        assignmentId: assignment._id,
        settlerId,
        itemId,
        duration: adjustments.adjustedDuration,
        completedAt,
        adjustments
      };
    });

    res.json(result);
  } catch (err) {
    const error = err as Error;

    if (error.message === 'Settler not found') {
      return res.status(404).json({ error: 'Settler not found' });
    }
    if (error.message === 'Settler does not belong to this colony') {
      return res.status(400).json({ error: 'Settler does not belong to this colony' });
    }
    if (error.message === 'Item not found or not craftable') {
      return res.status(400).json({ error: 'Item not found or not craftable' });
    }
    if (error.message === 'Colony inventory not found') {
      return res.status(404).json({ error: 'Colony inventory not found' });
    }
    if (error.message.includes('Insufficient materials')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Settler is currently') && error.message.includes('cannot be assigned')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('does not have enough energy')) {
      return res.status(400).json({ error: error.message });
    }

    logError('Failed to start crafting assignment', err, {
      colonyId,
      settlerId,
      itemId
    });
    res.status(500).json({ error: 'Failed to start crafting assignment' });
  }
};

// REMOVED: previewCrafting function
// It returned: { settlerId, settlerName, itemId, itemName, baseDuration, adjustments, canCraft, reason?, recipe }
// The adjustments included: { adjustedDuration, effectiveSpeed, lootMultiplier }
// The baseDuration was calculated from craftableItem.craftingTime
// This data can now be calculated on frontend using settler.adjustments and crafting time from items catalogue