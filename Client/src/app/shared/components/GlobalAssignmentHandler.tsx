// File: src/app/shared/components/GlobalAssignmentHandler.tsx
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import FoundSettlerDialog from './dialogs/FoundSettlerDialog';
import { showTaskCompletionToast } from './toast/toastHelpers';
import type { Settler } from '../../../lib/types/settler';
import type { Assignment } from '../../../lib/types/assignment';
import type { Colony } from '../../../lib/types/colony';
import { agent } from '../../../lib/api/agent';

interface GlobalAssignmentHandlerProps {
  serverId: string;
  colonyId: string;
}

const GlobalAssignmentHandler: React.FC<GlobalAssignmentHandlerProps> = ({ 
  serverId, 
  colonyId 
}) => {
  const [foundSettler, setFoundSettler] = useState<Settler | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleAssignmentNeedsInforming = async (event: CustomEvent) => {
      const { assignment, serverId: eventServerId, colonyId: eventColonyId } = event.detail;
      
      // Only handle if it's for our colony
      if (eventServerId !== serverId || eventColonyId !== colonyId) return;
      
      try {
        // Call the inform endpoint using the agent directly
        const response = await agent.patch(`/colonies/${colonyId}/assignments/${assignment._id}/informed`);
        const data = response.data;

        // Get settler info for the toast
        const colony = queryClient.getQueryData<Colony>(["colony", serverId]);
        const settler = colony?.settlers?.find(s => s._id === assignment.settlerId);
        
        if (assignment.plannedRewards && settler) {
          const rewards: Record<string, number> = {};
          
          // Apply rewards to colony cache
          Object.entries(assignment.plannedRewards).forEach(([key, reward]) => {
            // Type assertion for the reward object
            const typedReward = reward as { type: string; amount: number; properties?: Record<string, unknown> };
            
            queryClient.setQueryData(["colony", serverId], (old: Colony | undefined) => {
              return updateColonyResource(old, key, typedReward.type, typedReward.amount, typedReward.properties || {});
            });
            rewards[key] = typedReward.amount;
          });

          // Show completion toast
          if (data.state === "informed") {
            showTaskCompletionToast(
              { name: assignment.name, purpose: assignment.description },
              { name: settler.name },
              rewards
            );
          }

          // Update assignment cache to 'informed' state
          queryClient.setQueryData<Assignment[]>(["assignments", colonyId], (old) =>
            old?.map(a => a._id === assignment._id ? { ...a, state: 'informed' } : a) ?? []
          );
        }

        // Handle found settler
        if (data.foundSettler) {
          setFoundSettler(data.foundSettler);
          setDialogOpen(true);
        }

      } catch (error) {
        console.error('Error informing assignment:', error);
      }
    };

    const handleSettlerFound = (event: CustomEvent) => {
      const { settler } = event.detail;
      setFoundSettler(settler);
      setDialogOpen(true);
    };

    // Register event listeners
    const assignmentNeedsInformingListener = (event: Event) => {
      handleAssignmentNeedsInforming(event as CustomEvent);
    };
    window.addEventListener('assignment-needs-informing', assignmentNeedsInformingListener);
    window.addEventListener('settler-found', handleSettlerFound as EventListener);

    return () => {
      window.removeEventListener('assignment-needs-informing', assignmentNeedsInformingListener);
      window.removeEventListener('settler-found', handleSettlerFound as EventListener);
    };
  }, [serverId, colonyId, queryClient]);

  const handleApprove = async (settler: Settler) => {
    try {
      // Call your API to recruit the settler
      // await recruitSettler(settler._id);
      console.log('Recruiting settler:', settler.name);
      // Maybe show a success toast
    } catch (error) {
      console.error('Failed to recruit settler:', error);
      // Maybe show an error toast
    }
  };

  const handleReject = (settler: Settler) => {
    console.log('Rejecting settler:', settler.name);
    // Maybe show a toast saying "Settler sent away"
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFoundSettler(null);
  };

  // Helper function - you'll need to move this from your hook
  function updateColonyResource(
    old: Colony | undefined,
    key: string,
    type: string,
    amount: number,
    properties: Record<string, unknown> = {}
  ): Colony | undefined {
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
  }

  return (
    <FoundSettlerDialog
      open={dialogOpen}
      settler={foundSettler}
      onClose={handleCloseDialog}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
};

export default GlobalAssignmentHandler;