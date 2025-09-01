// File: src/app/shared/components/GlobalSettlerDialog.tsx
import React from 'react';
import FoundSettlerDialog from './dialogs/FoundSettlerDialog';
import { useAssignmentNotifications } from '../../../lib/hooks/useAssignmentNotifications';

const GlobalSettlerDialog: React.FC = () => {
  const { settlerDialog, handleSettlerApproval, closeSettlerDialog } = useAssignmentNotifications();

  const handleApprove = async (settler: import('../../../lib/types/settler').Settler) => {
    await handleSettlerApproval(settler, true);
  };

  const handleReject = async (settler: import('../../../lib/types/settler').Settler) => {
    await handleSettlerApproval(settler, false);
  };

  return (
    <FoundSettlerDialog
      open={settlerDialog.isOpen}
      settler={settlerDialog.settler}
      onClose={closeSettlerDialog}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
};

export default GlobalSettlerDialog;