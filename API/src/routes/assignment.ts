// routes/assignmentRoutes.ts
import { Router } from 'express';
import { getAssignments, startAssignment } from '../controllers/assignmentController';


const router = Router({ mergeParams: true }); // mergeParams needed for :colonyId


// Fetch assignments for a colony
router.get('/', getAssignments);

// Start an assignment for a settler
router.post('/:assignmentId/start', startAssignment);


export default router;