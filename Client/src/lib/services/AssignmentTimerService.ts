import type { Assignment } from '../types/assignment';
import { agent } from '../api/agent';

interface TimerData {
  assignmentId: string;
  colonyId: string;
  serverId: string;
  endTime: Date;
  timeoutId: number;
}

class AssignmentTimerService {
  private static instance: AssignmentTimerService | null = null;
  private timers: Map<string, TimerData> = new Map();
  private isInitialized = false;

  static getInstance(): AssignmentTimerService {
    if (!AssignmentTimerService.instance) {
      AssignmentTimerService.instance = new AssignmentTimerService();
    }
    return AssignmentTimerService.instance;
  }

  // Initialize the service with current assignments
  initialize(assignments: Assignment[], serverId: string, colonyId: string) {
    if (this.isInitialized) return;
    
    console.log('Initializing AssignmentTimerService with', assignments.length, 'assignments');
    
    // Clear any existing timers
    this.clearAllTimers();
    
    // Set up timers for in-progress assignments
    assignments
      .filter(a => a.state === 'in-progress' && a.completedAt)
      .forEach(assignment => {
        this.startTimer(assignment, serverId, colonyId);
      });
    
    this.isInitialized = true;
  }

  // Start a timer for a specific assignment
  startTimer(assignment: Assignment, serverId: string, colonyId: string) {
    if (!assignment.completedAt) return;

    const endTime = new Date(assignment.completedAt);
    const now = new Date();
    const timeRemaining = endTime.getTime() - now.getTime();

    // If assignment should have already completed
    if (timeRemaining <= 0) {
      console.log(`Assignment ${assignment.name} should have completed already`);
      this.handleAssignmentCompletion(assignment, serverId, colonyId);
      return;
    }

    // Set up timer for future completion
    const timeoutId = setTimeout(() => {
      console.log(`Assignment ${assignment.name} timer completed`);
      this.handleAssignmentCompletion(assignment, serverId, colonyId);
    }, timeRemaining);

    // Store timer data
    this.timers.set(assignment._id, {
      assignmentId: assignment._id,
      colonyId,
      serverId,
      endTime,
      timeoutId
    });

    console.log(`Timer set for assignment ${assignment.name}, completing in ${Math.round(timeRemaining / 1000)}s`);
  }

  // Handle when an assignment completes
  private async handleAssignmentCompletion(assignment: Assignment, serverId: string, colonyId: string) {
    try {
      // Remove the timer since it's completed
      this.clearTimer(assignment._id);

      // Dispatch completion event (for rewards/toast)
      window.dispatchEvent(new CustomEvent('assignment-completed', {
        detail: {
          assignment,
          serverId,
          colonyId
        }
      }));

      // Inform the server that assignment completed
      const response = await agent.patch(`/colonies/${colonyId}/assignments/${assignment._id}/informed`);
      
      // If settler was found, dispatch settler event
      if (response.data.foundSettler) {
        window.dispatchEvent(new CustomEvent('settler-found', {
          detail: {
            settler: response.data.foundSettler,
            serverId,
            colonyId
          }
        }));
      }

    } catch (error) {
      console.error('Error handling assignment completion:', error);
    }
  }

  // Add a new assignment to be tracked
  addAssignment(assignment: Assignment, serverId: string, colonyId: string) {
    if (assignment.state === 'in-progress' && assignment.completedAt) {
      this.startTimer(assignment, serverId, colonyId);
    }
  }

  // Remove/update an assignment
  updateAssignment(assignment: Assignment, serverId: string, colonyId: string) {
    // Clear existing timer
    this.clearTimer(assignment._id);

    // If still in-progress, restart timer
    if (assignment.state === 'in-progress' && assignment.completedAt) {
      this.startTimer(assignment, serverId, colonyId);
    }
  }

  // Clear a specific timer
  clearTimer(assignmentId: string) {
    const timer = this.timers.get(assignmentId);
    if (timer) {
      clearTimeout(timer.timeoutId);
      this.timers.delete(assignmentId);
      console.log(`Cleared timer for assignment ${assignmentId}`);
    }
  }

  // Clear all timers (useful for cleanup)
  clearAllTimers() {
    this.timers.forEach((timer) => {
      clearTimeout(timer.timeoutId);
    });
    this.timers.clear();
    console.log('Cleared all assignment timers');
  }

  // Get remaining time for an assignment (useful for UI)
  getRemainingTime(assignmentId: string): number {
    const timer = this.timers.get(assignmentId);
    if (!timer) return 0;
    
    const now = new Date();
    const remaining = timer.endTime.getTime() - now.getTime();
    return Math.max(0, remaining);
  }

  // Check if an assignment has an active timer
  hasActiveTimer(assignmentId: string): boolean {
    return this.timers.has(assignmentId);
  }

  // Reset initialization state (useful for testing or user switching)
  reset() {
    this.clearAllTimers();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const assignmentTimerService = AssignmentTimerService.getInstance();