// File: src/lib/hooks/useAssignmentNotifications.ts
import { useContext } from 'react';
import { AssignmentNotificationContext } from '../contexts/AssignmentNotificationContext';

export const useAssignmentNotifications = () => {
  const context = useContext(AssignmentNotificationContext);
  if (!context) {
    throw new Error('useAssignmentNotifications must be used within AssignmentNotificationProvider');
  }
  return context;
};