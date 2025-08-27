// app.ts
import express from 'express';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import serverRoutes from './routes/server';
import settlerRoutes from './routes/settler';
import assignmentRoutes from './routes/assignmentRoutes';

import { authenticate } from './middleware/auth';
import { requireColonyOwnership } from './middleware/colonyOwnership';


export const app = express();

if (process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

// Configure middleware and routes immediately
app.use(express.json());


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


// Add a basic route for your test
app.get('/api/', (req, res) => {
    res.json({ message: 'API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/colonies/:colonyId/settlers', authenticate, requireColonyOwnership, settlerRoutes);
app.use('/api/colonies/:colonyId/assignments', authenticate, requireColonyOwnership, assignmentRoutes);