import React, { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Person } from '@mui/icons-material';
import type { Settler } from '../../../../lib/types/settler';
import type { Assignment } from '../../../../lib/types/assignment';
import SettlerPreviewCard from './SettlerPreviewCard';

export interface SettlerSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (settler: Settler) => void;
  settlers: Settler[];
  selectedTask?: Assignment | null;
  colonyId?: string;
  title?: string;
  emptyStateMessage?: string;
  emptyStateSubMessage?: string;
  showSkills?: boolean;
  showStats?: boolean;
  confirmPending?: boolean;
}

const SettlerSelectorDialog: React.FC<SettlerSelectorDialogProps> = ({
  open,
  onClose,
  onSelect,
  settlers,
  selectedTask,
  colonyId,
  title = "Select Settler",
  emptyStateMessage = "No available settlers",
  emptyStateSubMessage = "All settlers are currently assigned to other tasks.",
  showSkills = true,
  showStats = false,
  confirmPending = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management to prevent ARIA-hidden accessibility warnings
  useEffect(() => {
    if (open && cancelButtonRef.current) {
      // Small delay to ensure dialog is fully rendered
      const timeoutId = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  // Enhanced onClose handler with proper focus management
  const handleClose = () => {
    // Blur any currently focused element within the dialog before closing
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  // Dialog width logic
  const isSingleSettler = settlers.length === 1;
  const dialogMaxWidth = isSingleSettler ? 'xs' : 'md';
  const dialogFullWidth = !isSingleSettler;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={dialogMaxWidth}
      fullWidth={dialogFullWidth}
      PaperProps={{
        sx: { bgcolor: 'background.paper', border: '1px solid #333' }
      }}
    >
      <DialogTitle sx={{ color: 'primary.main', pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Person color="primary" />
          {title}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: isMobile ? 1 : 2, maxHeight: '70vh', overflowY: 'auto' }}>
        {settlers.length > 0 && selectedTask && colonyId ? (
          isSingleSettler ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              sx={{
                minHeight: isMobile ? 'auto' : 150,
                width: '100%',
              }}
            >
              <SettlerPreviewCard
                key={settlers[0]._id}
                settler={settlers[0]}
                assignment={selectedTask}
                colonyId={colonyId}
                showSkills={showSkills}
                showStats={showStats}
                avatarIndex={0}
                onClick={!confirmPending ? () => onSelect(settlers[0]) : undefined}
                confirmPending={confirmPending}
              />
            </Box>
          ) : (
            <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={isMobile ? 1 : 2}>
              {settlers.map((settler, index) => (
                <SettlerPreviewCard
                  key={settler._id}
                  settler={settler}
                  assignment={selectedTask}
                  colonyId={colonyId}
                  showSkills={showSkills}
                  showStats={showStats}
                  avatarIndex={index}
                  onClick={!confirmPending ? () => onSelect(settler) : undefined}
                  confirmPending={confirmPending}
                />
              ))}
            </Box>
          )
        ) : (
          <Box sx={{ textAlign: 'center', py: 4, width: '100%' }}>
            <Typography variant="body1" color="text.secondary">
              {emptyStateMessage}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {emptyStateSubMessage}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          ref={cancelButtonRef}
          onClick={handleClose} 
          color="inherit" 
          disabled={confirmPending}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettlerSelectorDialog;