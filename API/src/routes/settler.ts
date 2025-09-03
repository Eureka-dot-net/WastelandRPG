import express from 'express';

const router = express.Router({ mergeParams: true });

import { Settler } from '../models/Player/Settler';

import { generateSettlerChoices } from '../services/settlerGenerator';

router.post('/onboard', async (req, res) => {
    const colonyId = req.colonyId;

    const session = await Settler.startSession();
    session.startTransaction();
    
    try {
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
            await session.commitTransaction();
            return res.json({ settlers: newSettlers });
        }

        // If update failed (returned null), settlers already exist
        // Find existing settlers for this colony
        const existingSettlers = await Settler.find({ colonyId }).session(session);
        
        // Handle the special case where all 3 settlers are inactive
        if (existingSettlers.length === 3) {
            const allInactive = existingSettlers.every(settler => !settler.isActive);
            if (allInactive) {
                await session.commitTransaction();
                return res.json({ settlers: existingSettlers });
            }
        }

        // Default case: settlers exist and operation cannot be repeated
        await session.commitTransaction();
        return res.status(403).json({ 
            error: "Player already has settlers. This operation cannot be repeated." 
        });

    } catch (err) {
        await session.abortTransaction();
        return res.status(500).json({ error: "Internal server error" });
    } finally {
        session.endSession();
    }
});

import mongoose, { Types } from 'mongoose'; // You may need to import this at the top
import { ColonyManager } from '../managers/ColonyManager';
import { Colony } from '../models/Player/Colony';

router.post('/:settlerId/select', async (req, res) => {
    const { settlerId } = req.params;
    const colonyId = req.colonyId;
    const colony = req.colony;

    // Check if the provided settlerId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(settlerId)) {
        return res.status(400).json({ error: 'Invalid Settler ID.' });
    }

    const session = await Settler.startSession();
    session.startTransaction();

    try {
        // Step 1: Find the chosen settler directly by its ID.
        // We also verify that it belongs to the player and is currently inactive.
        const chosenSettler = await Settler.findOne({
            _id: settlerId,
            colonyId: colonyId,
            isActive: false
        }).session(session);

        if (!chosenSettler) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Settler not found or already activated.' });
        }

        // Step 2: Activate the chosen settler.
        chosenSettler.isActive = true;
        await chosenSettler.save({ session });

        colony.settlers.push(chosenSettler);

        const colonyManager = new ColonyManager(colony);
        await colonyManager.addLogEntry(session, "settler", `Settler '${chosenSettler.name}' onboarded!`, { settlerId: chosenSettler._id });

        await colony.save({ session });

        // Step 3: Delete the other two.
        // Find all other inactive settlers for this player and delete them.
        await Settler.deleteMany({
            _id: { $ne: chosenSettler._id }, // Not equal to the chosen settler's ID
            colonyId: colonyId,
            isActive: false
        }).session(session);

        await session.commitTransaction();
        session.endSession();

        res.json(chosenSettler);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(err);
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

    const session = await Settler.startSession();
    session.startTransaction();

    try {
        // Step 2: Find the settler to delete (must belong to colony and be inactive)
        const settlerToDelete = await Settler.findOne({
            _id: settlerId,
            colonyId,
            isActive: false
        }).session(session);

        if (!settlerToDelete) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Settler not found or already active.' });
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

        await session.commitTransaction();
        session.endSession();

        res.json({ success: true, deletedSettlerId: settlerToDelete._id });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(err);
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
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve settler.' });
    }
});

export default router;