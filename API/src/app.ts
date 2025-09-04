// app.ts
import express from 'express';
import dotenv from 'dotenv';
import cron from 'node-cron';

import authRoutes from './routes/auth';
import serverRoutes from './routes/server';
import settlerRoutes from './routes/settler';
import assignmentRoutes from './routes/assignment';
import inventoryRoutes from './routes/inventory';
import mapRoutes from './routes/map';
import devRoutes from './routes/dev';

import { authenticate } from './middleware/auth';
import { requireColonyOwnership } from './middleware/colonyOwnership';
import { updateCompletedTasks } from './middleware/updateCompletedTasks';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { dailyBatch } from './jobs/daillyBatch';
import { logInfo } from './utils/logger';


export const app = express();

if (process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

// Configure middleware and routes immediately
app.use(express.json());

// Request logging middleware (before routes)
app.use(requestLogger);


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  } 
  next();
});

cron.schedule('0 0 * * *', () => {
  // Your batch process code here
  logInfo('Running daily batch process');
  dailyBatch();
});


// Add a basic route for your test
app.get('/api/', (req, res) => {
    res.json({ message: 'API is running' });
});

app.use('/api/dev', devRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/colonies/:colonyId/settlers', authenticate, requireColonyOwnership, updateCompletedTasks, settlerRoutes);
app.use('/api/colonies/:colonyId/assignments', authenticate, requireColonyOwnership, assignmentRoutes);
app.use('/api/colonies/:colonyId/inventory', authenticate, requireColonyOwnership, updateCompletedTasks, inventoryRoutes);
app.use('/api/colonies/:colonyId/map', authenticate, requireColonyOwnership, updateCompletedTasks, mapRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);
