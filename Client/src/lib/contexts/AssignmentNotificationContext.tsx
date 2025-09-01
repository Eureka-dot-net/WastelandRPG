// File: src/lib/contexts/AssignmentNotificationContext.tsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Assignment } from '../types/assignment';
import type { Colony } from '../types/colony';
import type { Settler } from '../types/settler';
import { agent } from '../api/agent';
import { showTaskCompletionToast } from '../../app/shared/components/toast/toastHelpers';

interface NotificationState {
  assignmentId: string;
  needsToast: boolean;
  needsSettlerDialog: boolean;
  settlerData?: Settler;
  rewards?: Record<string, number>;
  assignmentName?: string;
  assignmentDescription?: string;
  settlerName?: string;
}

interface AssignmentTimer {
  assignmentId: string;
  completionTime: Date;
  assignmentName: string;
}

interface AssignmentNotificationContextValue {
  // Timer data for UI display
  timers: Record<string, number>; // assignmentId -> milliseconds remaining
  
  // Notification management  
  pendingNotifications: NotificationState[];
  
  // Actions
  startAssignment: (assignment: Assignment) => void;
  clearNotification: (assignmentId: string) => void;
  handleSettlerApproval: (settler: Settler, approve: boolean) => Promise<void>;
  
  // Dialog state
  settlerDialog: {
    isOpen: boolean;
    settler: Settler | null;
  };
  closeSettlerDialog: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AssignmentNotificationContext = createContext<AssignmentNotificationContextValue | null>(null);

interface AssignmentNotificationProviderProps {
  children: React.ReactNode;
  serverId: string;
  colonyId: string;
}

export const AssignmentNotificationProvider: React.FC<AssignmentNotificationProviderProps> = ({
  children,
  serverId,
  colonyId,
}) => {
  const queryClient = useQueryClient();
  
  // Local state
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [activeTimers, setActiveTimers] = useState<AssignmentTimer[]>([]);
  const [pendingNotifications, setPendingNotifications] = useState<NotificationState[]>([]);
  const [settlerDialog, setSettlerDialog] = useState<{ isOpen: boolean; settler: Settler | null }>({
    isOpen: false,
    settler: null,
  });

  // Storage keys
  const STORAGE_KEY = `assignment_notifications_${serverId}_${colonyId}`;

  // Load persisted notifications from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as NotificationState[];
        setPendingNotifications(parsed);
      } catch (error) {
        console.error('Failed to parse saved notifications:', error);
      }
    }
  }, [STORAGE_KEY]);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (pendingNotifications.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingNotifications));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [pendingNotifications, STORAGE_KEY]);

  // Initialize timers from current assignments
  useEffect(() => {
    const assignments = queryClient.getQueryData<Assignment[]>(['assignments', colonyId]);
    if (!assignments) return;

    const inProgressAssignments = assignments.filter(
      a => a.state === 'in-progress' && a.completedAt
    );

    const newTimers: AssignmentTimer[] = inProgressAssignments.map(assignment => ({
      assignmentId: assignment._id,
      completionTime: new Date(assignment.completedAt!),
      assignmentName: assignment.name,
    }));

    setActiveTimers(newTimers);
    
    // Also invalidate and refetch assignments to ensure we have latest data
    queryClient.invalidateQueries({ queryKey: ['assignments', colonyId] });
  }, [queryClient, colonyId]);

  // Listen for assignment query updates to reinitialize timers
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] === 'assignments' && 
          event.query.queryKey[1] === colonyId && 
          event.type === 'updated') {
        
        const assignments = event.query.state.data as Assignment[];
        if (!assignments) return;

        const inProgressAssignments = assignments.filter(
          a => a.state === 'in-progress' && a.completedAt
        );

        const newTimers: AssignmentTimer[] = inProgressAssignments.map(assignment => ({
          assignmentId: assignment._id,
          completionTime: new Date(assignment.completedAt!),
          assignmentName: assignment.name,
        }));

        setActiveTimers(prev => {
          // Only update if different to avoid infinite loops
          if (JSON.stringify(prev) !== JSON.stringify(newTimers)) {
            return newTimers;
          }
          return prev;
        });
      }
    });

    return unsubscribe;
  }, [queryClient, colonyId]);

  // Handle assignment completion
  const handleAssignmentCompletion = useCallback(async (assignmentId: string) => {
    try {
      // Get assignment data
      const assignments = queryClient.getQueryData<Assignment[]>(['assignments', colonyId]);
      const assignment = assignments?.find(a => a._id === assignmentId);
      if (!assignment) return;

      // Get colony data for settler info
      const colony = queryClient.getQueryData<Colony>(['colony', serverId]);
      const settler = colony?.settlers?.find(s => s._id === assignment.settlerId);
      if (!settler) return;

      // Prepare rewards data
      const rewards: Record<string, number> = {};
      if (assignment.plannedRewards) {
        Object.entries(assignment.plannedRewards).forEach(([key, reward]) => {
          rewards[key] = reward.amount;
          
          // Update colony resources in cache
          queryClient.setQueryData(['colony', serverId], (old: Colony | undefined) => {
            return updateColonyResource(old, key, reward.type, reward.amount, reward.properties || {});
          });
        });
      }

      // Call the inform endpoint
      const response = await agent.patch(`/colonies/${colonyId}/assignments/${assignmentId}/informed`);
      const data = response.data;

      // Update assignment state in cache
      queryClient.setQueryData<Assignment[]>(['assignments', colonyId], (old) =>
        old?.map(a => a._id === assignmentId ? { ...a, state: 'informed' } : a) ?? []
      );

      // Create notification state
      const notificationState: NotificationState = {
        assignmentId,
        needsToast: true,
        needsSettlerDialog: !!data.foundSettler,
        settlerData: data.foundSettler,
        rewards,
        assignmentName: assignment.name,
        assignmentDescription: assignment.description,
        settlerName: settler.name,
      };

      // Add to pending notifications
      setPendingNotifications(prev => [...prev, notificationState]);

    } catch (error) {
      console.error('Error handling assignment completion:', error);
    }
  }, [queryClient, serverId, colonyId]);

  // Main timer loop - check every second for completed assignments
  useEffect(() => {
    if (activeTimers.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const newTimers: Record<string, number> = {};
      const completedAssignments: AssignmentTimer[] = [];
      const stillActiveTimers: AssignmentTimer[] = [];

      activeTimers.forEach(timer => {
        const timeRemaining = timer.completionTime.getTime() - now;
        
        if (timeRemaining <= 0) {
          completedAssignments.push(timer);
        } else {
          newTimers[timer.assignmentId] = timeRemaining;
          stillActiveTimers.push(timer);
        }
      });

      setTimers(newTimers);
      setActiveTimers(stillActiveTimers);

      // Handle completed assignments
      completedAssignments.forEach(timer => {
        handleAssignmentCompletion(timer.assignmentId);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimers, handleAssignmentCompletion]);

  // Process pending notifications (show toasts/dialogs)
  useEffect(() => {
    if (pendingNotifications.length === 0) return;

    // Find first notification that needs to be processed
    const notification = pendingNotifications.find(n => n.needsToast || n.needsSettlerDialog);
    if (!notification) return;

    // Show toast if needed
    if (notification.needsToast && notification.rewards) {
      showTaskCompletionToast(
        {
          name: notification.assignmentName || 'Assignment',
          purpose: notification.assignmentDescription || 'Completed',
        },
        {
          name: notification.settlerName || 'Settler',
        },
        notification.rewards
      );

      // Mark toast as shown
      setPendingNotifications(prev =>
        prev.map(n =>
          n.assignmentId === notification.assignmentId
            ? { ...n, needsToast: false }
            : n
        )
      );
    }

    // Show settler dialog if needed
    if (notification.needsSettlerDialog && notification.settlerData && !settlerDialog.isOpen) {
      setSettlerDialog({
        isOpen: true,
        settler: notification.settlerData,
      });
    }
  }, [pendingNotifications, settlerDialog.isOpen]);

  // Helper function to update colony resources
  const updateColonyResource = (
    old: Colony | undefined,
    key: string,
    type: string,
    amount: number,
    properties: Record<string, unknown> = {}
  ): Colony | undefined => {
    if (!old) return old;

    if (type === "food") {
      const settlerCount = Array.isArray(old.settlers) ? old.settlers.length : (old.settlers || 1);
      const currentFood = (old.daysFood || 0) * (settlerCount || 1);
      const addedFood = amount * (properties["foodValue"] as number || 0);
      const newFood = currentFood + addedFood;
      return { ...old, daysFood: Math.round((newFood / (settlerCount || 1)) * 10) / 10 };
    }

    if (key === "scrap") {
      return { ...old, scrapMetal: (old.scrapMetal || 0) + amount };
    }

    if (key === "wood") {
      return { ...old, wood: (old.wood || 0) + amount };
    }

    return old;
  };

  // Start a new assignment
  const startAssignment = useCallback((assignment: Assignment) => {
    if (!assignment.completedAt) return;

    const timer: AssignmentTimer = {
      assignmentId: assignment._id,
      completionTime: new Date(assignment.completedAt),
      assignmentName: assignment.name,
    };

    setActiveTimers(prev => [...prev.filter(t => t.assignmentId !== assignment._id), timer]);
  }, []);

  // Clear a notification
  const clearNotification = useCallback((assignmentId: string) => {
    setPendingNotifications(prev => prev.filter(n => n.assignmentId !== assignmentId));
  }, []);

  // Handle settler dialog actions
  const handleSettlerApproval = useCallback(async (settler: Settler, approve: boolean) => {
    try {
      // Make API call based on approval
      if (approve) {
        console.log('Recruiting settler:', settler.name);
        // TODO: Add actual recruit API call when endpoint is available
      } else {
        console.log('Rejecting settler:', settler.name);
      }

      // Close dialog and clear notification
      setSettlerDialog({ isOpen: false, settler: null });
      
      // Clear the settler dialog notification
      setPendingNotifications(prev =>
        prev.map(n =>
          n.settlerData?._id === settler._id
            ? { ...n, needsSettlerDialog: false }
            : n
        ).filter(n => !n.needsToast && !n.needsSettlerDialog) // Remove fully processed notifications
      );

    } catch (error) {
      console.error('Error handling settler approval:', error);
    }
  }, []);

  const closeSettlerDialog = useCallback(() => {
    setSettlerDialog({ isOpen: false, settler: null });
  }, []);

  const value: AssignmentNotificationContextValue = {
    timers,
    pendingNotifications,
    startAssignment,
    clearNotification,
    handleSettlerApproval,
    settlerDialog,
    closeSettlerDialog,
  };

  return (
    <AssignmentNotificationContext.Provider value={value}>
      {children}
    </AssignmentNotificationContext.Provider>
  );
};