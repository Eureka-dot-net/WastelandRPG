import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Colony } from '../models/Player/Colony';
import serverCatalogue from '../data/ServerCatalogue.json';
import { createColonyWithSpiralLocation } from '../services/mapService';
import { authenticate } from '../middleware/auth';
import { logError, logInfo, logWarn } from '../utils/logger';
import { withSession } from '../utils/sessionUtils';

const router = Router();

// Helper function to get server by ID
function getServerById(serverId: string) {
    return serverCatalogue.find(server => server.id === serverId);
}

// Register
router.post('/register', async (req: Request, res: Response) => {
    const { email, password, serverId, colonyName } = req.body;

    // Validate serverId
    const server = getServerById(serverId);
    if (!server) {
        logWarn('Registration attempt with invalid server', { email, serverId });
        return res.status(400).json({ message: 'Invalid server selected' });
    }

    try {
        const result = await withSession(async (session) => {
            const existingUser = await User.findOne({ email }).session(session);
            if (existingUser) {
                logWarn('Registration attempt with existing email', { email });
                throw new Error('User already exists');
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User({ email, password: hashedPassword });

            await user.save({ session });

            const colony = await createColonyWithSpiralLocation(user._id, server.id, colonyName || 'First Colony', server.type, server.name, 5, 5, session);

            logInfo('User registered successfully', { 
                userId: user._id, 
                email, 
                serverId: server.id,
                serverName: server.name,
                colonyName: colony.colonyName 
            });

            return { user, colony };
        });
        
        return res.status(201).json({ message: 'User created successfully' });
    } catch (error: unknown) {
        if ((error as Error).message === 'User already exists') {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        logError('Failed to register user', error, { email, serverId });
        
        res.status(500).json({
            message: 'Server error',
            error: {
                message: (error as Error).message,
                stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
            }
        });
    }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            logWarn('Login attempt with non-existent email', { email });
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logWarn('Login attempt with incorrect password', { email, userId: user._id });
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string);
        
        logInfo('User logged in successfully', { userId: user._id, email });

        return res.json({ token });
    } catch (error) {
        logError('Login failed', error, { email });
        res.status(500).json({ message: 'Server error', error });
    }
});

// Token validation endpoint
router.get('/validate', authenticate, async (req: Request, res: Response) => {
    logInfo('Token validation successful', { userId: req.userId });
    return res.json({ valid: true, userId: req.userId });
});

export default router;
