import { Router, Request, Response } from "express";
import { Inventory } from "../models/Player/Inventory";
import { ColonyManager } from "../managers/ColonyManager";
import { SettlerManager } from "../managers/SettlerManager";
import { Settler } from "../models/Player/Settler";
import { withSession } from "../utils/sessionUtils";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const colony = req.colony;
  const colonyManager = new ColonyManager(colony);

  const unlocks = await colonyManager.getUnlocks();

  if (!unlocks.inventory) {
    return res.status(403).json({ message: "Inventory not unlocked yet." });
  }

  const inventory = await Inventory.findOne({ colonyId: colony._id });
  if (!inventory) return res.status(404).json({ message: "No inventory found" });
  return res.json(inventory);
});

/**
 * Drop an item from colony inventory
 * DELETE /colonies/:colonyId/inventory/:itemId
 */
router.delete("/:itemId", async (req: Request, res: Response) => {
  try {
    const colony = req.colony;
    const { itemId } = req.params;

    const colonyManager = new ColonyManager(colony);

    const result = await withSession(async (session) => {
      return await colonyManager.dropItems(itemId, session);
    });

    if (result.success) {
      res.json({
        message: result.message,
        droppedItems: result.droppedItems
      });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error dropping item from colony inventory:', error);
    res.status(500).json({ error: 'Failed to drop item from colony inventory' });
  }
});

/**
 * Drop an item from settler inventory
 * DELETE /colonies/:colonyId/inventory/settler/:settlerId/:itemId
 */
router.delete("/settler/:settlerId/:itemId", async (req: Request, res: Response) => {
  try {
    const colony = req.colony;
    const { settlerId, itemId } = req.params;

    // Verify settler belongs to the colony
    const settler = await Settler.findById(settlerId);
    if (!settler) {
      return res.status(404).json({ error: 'Settler not found' });
    }
    
    // Check if settler belongs to this colony
    const settlerBelongsToColony = colony.settlers.some(s => s._id.toString() === settlerId);
    if (!settlerBelongsToColony) {
      return res.status(403).json({ error: 'Settler does not belong to this colony' });
    }

    const settlerManager = new SettlerManager(settler);

    const result = await withSession(async (session) => {
      return await settlerManager.dropItems(itemId, session);
    });

    if (result.success) {
      res.json({
        message: result.message,
        droppedItems: result.droppedItems
      });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error dropping item from settler inventory:', error);
    res.status(500).json({ error: 'Failed to drop item from settler inventory' });
  }
});

export default router;