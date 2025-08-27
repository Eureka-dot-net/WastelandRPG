// routes/assignmentRoutes.ts
import { Router } from 'express';
import { completeAssignment, getAssignments, startAssignment } from '../controllers/assignmentController';


const router = Router({ mergeParams: true }); // mergeParams needed for :colonyId


// Fetch assignments for a colony
router.get('/', getAssignments);

// Start an assignment for a settler
router.post('/:assignmentId/start', startAssignment);

// Mark an assignment as complete (optional manual endpoint, mainly for testing)
router.post('/:assignmentId/complete', completeAssignment);

export default router;