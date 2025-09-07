// File: src/lib/contexts/AssignmentNotificationContext.tsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Assignment } from '../types/assignment';
import type { Colony } from '../types/colony';
import type { Settler } from '../types/settler';
import { showTaskCompletionToast } from '../../app/shared/components/toast/toastHelpers';
import { useSettler } from '../hooks/useSettler';
import { useAssignment } from '../hooks/useAssignment';
import { useServerContext } from './ServerContext';

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

  // Loading states
  informingAssignments: Set<string>; // assignmentIds currently being informed (unloading inventory)

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
}

export const AssignmentNotificationProvider: React.FC<AssignmentNotificationProviderProps> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const { currentServerId: serverId, colonyId } = useServerContext();

  const [timers, setTimers] = useState<Record<string, number>>({});
  const [activeTimers, setActiveTimers] = useState<AssignmentTimer[]>([]);
  const [pendingNotifications, setPendingNotifications] = useState<NotificationState[]>([]);
  const [informingAssignments, setInformingAssignments] = useState<Set<string>>(new Set());
  const [settlerDialog, setSettlerDialog] = useState<{ isOpen: boolean; settler: Settler | null }>({
    isOpen: false,
    settler: null,
  });

  const { selectSettler, rejectSettler } = useSettler(serverId, colonyId);
  const { assignments, informAssignment } = useAssignment(serverId, colonyId, {status: ['in-progress', 'completed']});

  // Initialize timers from current assignments
useEffect(() => {
  console.log('Initializing timers from assignments:', assignments);
  if (!assignments) return;
  setActiveTimers(prev => {
    const prevIds = prev.map(t => t.assignmentId);
    const newTimers = assignments
      .filter(a => a.state === 'in-progress' && a.completedAt && !prevIds.includes(a._id))
      .map(a => ({
        assignmentId: a._id,
        completionTime: new Date(a.completedAt!),
        assignmentName: a.name,
      }));

    // Only append new timers
    return [...prev, ...newTimers];
  });
}, [assignments]);

  // Handle assignment completion
  const handleAssignmentCompletion = useCallback(async (assignmentId: string) => {
    try {
      // Find assignment from useAssignment hook
      const assignment = assignments?.find(a => a._id === assignmentId);
      console.log('Handling completion for assignment:', assignmentId, assignment);
      if (!assignment) return;

      // Mark as completed manually in the cache
      queryClient.setQueryData<Assignment[]>(['assignments', colonyId], old =>
        old?.map(a => a._id === assignmentId ? { ...a, state: 'completed' } : a) ?? []
      );

      // Get settler info from the colony cache
      const colony = queryClient.getQueryData<Colony>(['colony', serverId]);
      const settler = colony?.settlers?.find(s => s._id === assignment.settlerId);

      if (!settler) return;

      // Call inform endpoint first to get actual transfer results
      setInformingAssignments(prev => new Set([...prev, assignmentId]));
      const data = await informAssignment.mutateAsync(assignmentId);
      
      // Use actual transferred items and inventory stacks from inform response
      const rewards: Record<string, number> = data?.actualTransferredItems || {};
      const newInventoryStacks = data?.actualNewInventoryStacks || 0;
      
      // Update colony resources with actual transferred items
      if (Object.keys(rewards).length > 0) {
        Object.entries(rewards).forEach(([key, amount]) => {
          // Update colony resources in cache with actual amounts
          queryClient.setQueryData(['colony', serverId], (old: Colony | undefined) => {
            return updateColonyResource(old, key, 'resource', amount, {});
          });
        });
      }

      // Update inventory stacks with actual new stacks
      if (newInventoryStacks > 0) {
        queryClient.setQueryData(['colony', serverId], (old: Colony | undefined) => {
          if (!old) return old;
          return {
            ...old,
            currentInventoryStacks: old.currentInventoryStacks + newInventoryStacks
          };
        });
      }

      // Add to pending notifications
      setPendingNotifications(prev => [
        ...prev,
        {
          assignmentId,
          needsToast: true,
          needsSettlerDialog: !!data?.foundSettler,
          settlerData: data?.foundSettler,
          rewards,
          assignmentName: assignment.name,
          assignmentDescription: assignment.description,
          settlerName: settler.name,
        },
      ]);
    } catch (error) {
      console.error('Error handling assignment completion:', error);
    } finally {
      // Always clear the informing state
      setInformingAssignments(prev => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    }
  }, [assignments, informAssignment, queryClient, colonyId, serverId]);

  // Main timer loop
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

      completedAssignments.forEach(timer => handleAssignmentCompletion(timer.assignmentId));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimers, handleAssignmentCompletion]);

  // Process pending notifications (toast/dialog)
  useEffect(() => {
    if (pendingNotifications.length === 0) return;

    const notification = pendingNotifications.find(n => n.needsToast || n.needsSettlerDialog);
    if (!notification) return;

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

      setPendingNotifications(prev =>
        prev.map(n =>
          n.assignmentId === notification.assignmentId ? { ...n, needsToast: false } : n
        )
      );
    }

    if (notification.needsSettlerDialog && notification.settlerData && !settlerDialog.isOpen) {
      setSettlerDialog({ isOpen: true, settler: notification.settlerData });
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

  // Handle settler dialog approval
  const handleSettlerApproval = useCallback(async (settler: Settler, approve: boolean) => {
    try {
      if (approve) await selectSettler.mutate({ settlerId: settler._id });
      else await rejectSettler.mutate({ settlerId: settler._id });

      setSettlerDialog({ isOpen: false, settler: null });

      setPendingNotifications(prev =>
        prev
          .map(n => (n.settlerData?._id === settler._id ? { ...n, needsSettlerDialog: false } : n))
          .filter(n => !n.needsToast && !n.needsSettlerDialog)
      );
    } catch (error) {
      console.error('Error handling settler approval:', error);
    }
  }, [selectSettler, rejectSettler]);

  const closeSettlerDialog = useCallback(() => setSettlerDialog({ isOpen: false, settler: null }), []);

  const value: AssignmentNotificationContextValue = {
    timers,
    informingAssignments,
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