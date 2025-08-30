// File: src/lib/hooks/useCountdownTimer.ts
import { useState, useEffect, useCallback } from 'react';

export interface TimedTask {
  id: string;
  startedAt: string | Date;
  duration: number; // in milliseconds
  state: 'in-progress' | 'completed' | string;
}

export interface CountdownTimerHook {
  activeTimers: Record<string, number>;
  setTimerForTask: (task: TimedTask) => void;
  removeTimer: (taskId: string) => void;
  clearAllTimers: () => void;
}

export const useCountdownTimer = (
  onTimerComplete?: (taskId: string) => void | Promise<void>
): CountdownTimerHook => {
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});

  // Timer effect
  useEffect(() => {
    const intervalIds: number[] = [];

    // Set up timers for all active tasks
    Object.entries(activeTimers).forEach(([taskId, timeRemaining]) => {
      if (timeRemaining > 0) {
        const intervalId = setInterval(() => {
          setActiveTimers(prev => {
            const newTimeRemaining = Math.max((prev[taskId] || 0) - 1000, 0);

            // If timer just hit zero, trigger completion check
            if (newTimeRemaining === 0 && prev[taskId] > 0) {
              // Use setTimeout to avoid state update during render
              setTimeout(() => {
                if (onTimerComplete) {
                  onTimerComplete(taskId);
                }
              }, 100);
            }

            return {
              ...prev,
              [taskId]: newTimeRemaining
            };
          });
        }, 1000);

        intervalIds.push(intervalId);
      }
    });

    return () => {
      intervalIds.forEach(clearInterval);
    };
  }, [activeTimers, onTimerComplete]);

  const setTimerForTask = useCallback((task: TimedTask) => {
    if (task.state === 'in-progress' && task.startedAt && task.duration) {
      const now = Date.now();
      const startedAt = new Date(task.startedAt).getTime();
      const timeElapsed = now - startedAt;
      const timeRemaining = Math.max(task.duration - timeElapsed, 0);
      
      setActiveTimers(prev => ({
        ...prev,
        [task.id]: timeRemaining
      }));
    }
  }, []);

  const removeTimer = useCallback((taskId: string) => {
    setActiveTimers(prev => {
      const newTimers = { ...prev };
      delete newTimers[taskId];
      return newTimers;
    });
  }, []);

  const clearAllTimers = useCallback(() => {
    setActiveTimers({});
  }, []);

  return {
    activeTimers,
    setTimerForTask,
    removeTimer,
    clearAllTimers
  };
};