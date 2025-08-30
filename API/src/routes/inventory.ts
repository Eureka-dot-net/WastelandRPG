import { Router, Request, Response } from "express";
import { Inventory, InventoryDoc } from "../models/Player/Inventory";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const colony = req.colony;

  const unlocks = await colony.getUnlocks();

  if (!unlocks.inventory) {
    return res.status(403).json({ message: "Inventory not unlocked yet." });
  }

  const inventory = await Inventory.findOne({ colonyId: colony._id });
  if (!inventory) return res.status(404).json({ message: "No inventory found" });
  return res.json(inventory);
});

export default router;