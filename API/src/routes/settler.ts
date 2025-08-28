import express from 'express';

const router = express.Router({ mergeParams: true });

import { Settler } from '../models/Player/Settler';

import { generateSettlerChoices } from '../services/settlerGenerator';

router.post('/onboard',  async (req, res) => {
    const colonyId = req.colonyId;


    // Step 1: Find all settlers for the player, regardless of their status.
    const existingSettlers = await Settler.find({ colonyId });

    // Step 2: Check for existing settlers and their status
    if (existingSettlers.length > 0) {
        // If the colony has exactly three settlers...
        if (existingSettlers.length === 3) {
            // ...check if ALL of them are currently inactive.
            const allInactive = existingSettlers.every(settler => !settler.isActive);

            if (allInactive) {
                // If all three are inactive, return them for the user to select again.
                // This handles cases where the user closed the page before selecting a settler.
                return res.json({ settlers: existingSettlers });
            }
        }
        
        // If the player has any active settlers, or an unexpected number of settlers,
        // it means they have already completed this part of the onboarding.
        return res.status(403).json({ error: "Player already has settlers. This operation cannot be repeated." });
    }

    // Step 3: If no settlers exist at all, generate and save three new choices.
    const newSettlers = await generateSettlerChoices(colonyId!);
    res.json({ settlers: newSettlers });
});

import mongoose, { Types } from 'mongoose'; // You may need to import this at the top

router.post('/:settlerId/select', async (req, res) => {
    const { settlerId } = req.params;
    const colonyId = req.colonyId;
    const colony = req.colony;

    // Check if the provided settlerId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(settlerId)) {
        return res.status(400).json({ error: 'Invalid Settler ID.' });
    }

    // Step 1: Find the chosen settler directly by its ID.
    // We also verify that it belongs to the player and is currently inactive.
    const chosenSettler = await Settler.findOne({
        _id: settlerId,
        colonyId: colonyId,
        isActive: false
    });

    if (!chosenSettler) {
        return res.status(404).json({ error: 'Settler not found or already activated.' });
    }

    // Step 2: Activate the chosen settler.
    chosenSettler.isActive = true;
    await chosenSettler.save();

    colony.settlers.push(chosenSettler._id as Types.ObjectId);
    await colony.save();

    // Step 3: Delete the other two.
    // Find all other inactive settlers for this player and delete them.
    await Settler.deleteMany({
        _id: { $ne: chosenSettler._id }, // Not equal to the chosen settler's ID
        colonyId: colonyId,
        isActive: false
    });

    res.json(chosenSettler);
});

export default router;