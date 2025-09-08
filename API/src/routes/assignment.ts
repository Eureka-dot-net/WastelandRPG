// routes/assignmentRoutes.ts
import { Router } from 'express';
import { getAssignments, startAssignment, informAssignment, previewAssignmentBatch } from '../controllers/assignmentController';
import { updateCompletedTasks } from '../middleware/updateCompletedTasks';


const router = Router({ mergeParams: true }); // mergeParams needed for :colonyId


// Fetch assignments for a colony
router.get('/', getAssignments);

// Preview assignment effects with a settler (batch version)
router.get('/preview-batch', previewAssignmentBatch);

// Start an assignment for a settler
router.post('/:assignmentId/start', updateCompletedTasks, startAssignment);

router.patch("/:assignmentId/informed", updateCompletedTasks, informAssignment);

export default router;