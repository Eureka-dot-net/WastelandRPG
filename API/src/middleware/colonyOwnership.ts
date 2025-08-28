import { Request, Response, NextFunction } from 'express';
import { Colony, ColonyDoc } from '../models/Player/Colony';

// Extend Express Request type globally for colonyId/colony
declare module 'express-serve-static-core' {
  interface Request {
    colonyId?: string;
    colony: ColonyDoc;
  }
}

export const requireColonyOwnership = async (req: Request, res: Response, next: NextFunction) => {
  // Assume colonyid comes from URL: /players/:colonyId/...
  const { colonyId } = req.params;
  if (!colonyId) return res.status(400).json({ error: 'Missing colonyId' });

  // req.userId set by authenticate middleware
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'User not authenticated' });

  const colony = await Colony.findById(colonyId);
  if (!colony) return res.status(404).json({ error: 'Colony not found' });

  if (colony.userId.toString() !== userId) {
    return res.status(403).json({ error: 'Colony does not belong to authenticated user' });
  }

  // Attach colony info to request for downstream use
  req.colonyId = colonyId;
  req.colony = colony ;
  next();
};