import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Colony } from '../models/Player/Colony';
import serverCatalogue from '../data/ServerCatalogue.json';
import { createColonyWithSpiralLocation } from '../services/mapService';

const router = Router();

// Helper function to get server by ID
function getServerById(serverId: string) {
    return serverCatalogue.find(server => server.id === serverId);
}

// Register
router.post('/register', async (req: Request, res: Response) => {
    const { email, password, serverId } = req.body;

    // Validate serverId
    const server = getServerById(serverId);
    if (!server) {
        return res.status(400).json({ message: 'Invalid server selected' });
    }

    const session = await User.startSession();
    session.startTransaction();

    let errorOccurred = false;

    try {
        const existingUser = await User.findOne({ email }).session(session);
        if (existingUser) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });

        await user.save({ session });
      
        const colony = await createColonyWithSpiralLocation(user._id, server.id, 'First Colony', server.type, server.name, 5, 5, session);

        await session.commitTransaction();
        return res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        errorOccurred = true;
        await session.abortTransaction();
        res.status(500).json({ message: 'Server error', error });
    } finally {
        // Always end session, but only after commit/abort
        session.endSession();
    }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string);

        return res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

export default router;
