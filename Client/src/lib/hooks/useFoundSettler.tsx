// // File: src/lib/hooks/useFoundSettler.tsx
// import { useState, useEffect } from 'react';
// import { useAssignment } from './useAssignment';
// import type { Settler } from '../types/settler';
// import FoundSettlerDialog from '../../app/shared/components/dialogs/FoundSettlerDialog';

// export function useFoundSettler(serverId: string, colonyId: string) {
//   const [foundSettler, setFoundSettler] = useState<Settler | null>(null);
//   const [dialogOpen, setDialogOpen] = useState(false);

//   const { onFoundSettlerRef } = useAssignment(serverId, colonyId);

//   // Register the found settler handler when hook is used
//   useEffect(() => {
//     onFoundSettlerRef.current = (settler) => {
//       setFoundSettler(settler);
//       setDialogOpen(true);
//     };
//   }, [onFoundSettlerRef]);

//   const handleApprove = async (settler: Settler) => {
//     try {
//       // Call your API to recruit the settler
//       // await recruitSettler(settler._id);
//       console.log('Recruiting settler:', settler.name);
//       // Maybe show a success toast
//     } catch (error) {
//       console.error('Failed to recruit settler:', error);
//       // Maybe show an error toast
//     }
//   };

//   const handleReject = (settler: Settler) => {
//     console.log('Rejecting settler:', settler.name);
//     // Maybe show a toast saying "Settler sent away"
//   };

//   const handleCloseDialog = () => {
//     setDialogOpen(false);
//     setFoundSettler(null);
//   };

//   // Return both the assignment hook data AND the dialog component
//   return {
//     ...onFoundSettlerRef, // All the original assignment hook functionality
//     FoundSettlerDialog: () => (
//       <FoundSettlerDialog
//         open={dialogOpen}
//         settler={foundSettler}
//         onClose={handleCloseDialog}
//         onApprove={handleApprove}
//         onReject={handleReject}
//       />
//     )
//   };
// }