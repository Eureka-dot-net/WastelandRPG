import express from 'express';
import mongoose from 'mongoose';
import { logError } from '../utils/logger';
import { withSession } from '../utils/sessionUtils';

const router = express.Router({ mergeParams: true });

import { Settler } from '../models/Player/Settler';
import { Colony } from '../models/Player/Colony';
import { ColonyManager } from '../managers/ColonyManager';

import { generateSettlerChoices } from '../services/settlerGenerator';

router.post('/onboard', async (req, res) => {
    const colonyId = req.colonyId;
    
    try {
        const result = await withSession(async (session) => {
            // Atomic check-and-set: only succeed if hasInitialSettlers is still false
            const colonyUpdate = await Colony.findOneAndUpdate(
                { 
                    _id: colonyId, 
                    hasInitialSettlers: false  // Only match if flag is still false
                },
                { 
                    hasInitialSettlers: true   // Set flag to true atomically
                },
                { 
                    new: true,
                    session: session  // Within transaction
                }
            );

            // If update succeeded, we won the race - create settlers
            if (colonyUpdate) {
                const newSettlers = await generateSettlerChoices(colonyId!, session);
                return { settlers: newSettlers };
            }

            // If update failed (returned null), settlers already exist
            // Find existing settlers for this colony
            const existingSettlers = await Settler.find({ colonyId }).session(session);
            
            // Handle the special case where all 3 settlers are inactive
            if (existingSettlers.length === 3) {
                const allInactive = existingSettlers.every(settler => !settler.isActive);
                if (allInactive) {
                    return { settlers: existingSettlers };
                }
            }

            // Default case: settlers exist and operation cannot be repeated
            throw new Error("Player already has settlers. This operation cannot be repeated.");
        });

        res.json(result);
    } catch (err) {
        logError('Failed to onboard settlers', err, { colonyId });
        if (err instanceof Error && err.message.includes("already has settlers")) {
            return res.status(403).json({ error: err.message });
        }
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post('/:settlerId/select', async (req, res) => {
    const { settlerId } = req.params;
    const { interests } = req.body;
    const colonyId = req.colonyId;
    const colony = req.colony;

    // Check if the provided settlerId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(settlerId)) {
        return res.status(400).json({ error: 'Invalid Settler ID.' });
    }

    // Validate interests if provided
    if (interests && (!Array.isArray(interests) || interests.length > 2)) {
        return res.status(400).json({ error: 'Interests must be an array of up to 2 skill names.' });
    }

    try {
        const result = await withSession(async (session) => {
            // Step 1: Find the chosen settler directly by its ID.
            // We also verify that it belongs to the player and is currently inactive.
            const chosenSettler = await Settler.findOne({
                _id: settlerId,
                colonyId: colonyId,
                isActive: false
            }).session(session);

            if (!chosenSettler) {
                throw new Error('Settler not found or already activated.');
            }

            // Step 2: Update interests if provided
            if (interests && interests.length > 0) {
                chosenSettler.interests = interests;
            }

            // Step 3: Activate the chosen settler.
            chosenSettler.isActive = true;
            await chosenSettler.save({ session });

            colony.settlers.push(chosenSettler);

            const colonyManager = new ColonyManager(colony);
            await colonyManager.addLogEntry(session, "settler", `Settler '${chosenSettler.name}' onboarded!`, { settlerId: chosenSettler._id });

            await colony.save({ session });

            // Step 4: Delete the other two.
            // Find all other inactive settlers for this player and delete them.
            await Settler.deleteMany({
                _id: { $ne: chosenSettler._id }, // Not equal to the chosen settler's ID
                colonyId: colonyId,
                isActive: false
            }).session(session);

            return chosenSettler;
        });

        res.json(result);
    } catch (err) {
        logError('Failed to select settler', err, { settlerId, colonyId, interests });
        if (err instanceof Error && err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to select settler.' });
    }
});

router.delete('/:settlerId/reject', async (req, res) => {
    const { settlerId } = req.params;
    const colonyId = req.colonyId;

    // Step 1: Validate the settler ID format
    if (!mongoose.Types.ObjectId.isValid(settlerId)) {
        return res.status(400).json({ error: 'Invalid Settler ID.' });
    }

    try {
        const result = await withSession(async (session) => {
            // Step 2: Find the settler to delete (must belong to colony and be inactive)
            const settlerToDelete = await Settler.findOne({
                _id: settlerId,
                colonyId,
                isActive: false
            }).session(session);

            if (!settlerToDelete) {
                throw new Error('Settler not found or already active.');
            }

            // Step 3: Delete the settler
            await Settler.deleteOne({ _id: settlerToDelete._id }).session(session);

            // Optional: Add log entry for rejection
            const colonyManager = new ColonyManager(req.colony);
            await colonyManager.addLogEntry(
                session,
                "settler",
                `Settler '${settlerToDelete.name}' was rejected.`,
                { settlerId: settlerToDelete._id }
            );

            return { success: true, deletedSettlerId: settlerToDelete._id };
        });

        res.json(result);
    } catch (err) {
        logError('Failed to reject settler', err, { settlerId, colonyId });
        if (err instanceof Error && err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to reject settler.' });
    }
});

// Get a specific settler by ID (for event interactions)
router.get('/:settlerId', async (req, res) => {
    const { settlerId } = req.params;
    const colonyId = req.colonyId;

    // Validate settler ID format
    if (!mongoose.Types.ObjectId.isValid(settlerId)) {
        return res.status(400).json({ error: 'Invalid Settler ID.' });
    }

    try {
        // Find the settler that belongs to this colony
        const settler = await Settler.findOne({
            _id: settlerId,
            colonyId: colonyId
        });

        if (!settler) {
            return res.status(404).json({ error: 'Settler not found.' });
        }

        res.json(settler);
    } catch (err) {
        logError('Failed to retrieve settler', err, { settlerId, colonyId });
        res.status(500).json({ error: 'Failed to retrieve settler.' });
    }
});

export default router;