// routes/assignmentRoutes.ts
import { Router } from 'express';
import { getAssignments, startAssignment, informAssignment, previewAssignment } from '../controllers/assignmentController';


const router = Router({ mergeParams: true }); // mergeParams needed for :colonyId


// Fetch assignments for a colony
router.get('/', getAssignments);

// Preview assignment effects with a settler
router.get('/:assignmentId/preview', previewAssignment);

// Start an assignment for a settler
router.post('/:assignmentId/start', startAssignment);

router.patch("/:assignmentId/informed", informAssignment);

export default router;