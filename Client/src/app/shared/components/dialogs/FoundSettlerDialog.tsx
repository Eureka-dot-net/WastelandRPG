// File: src/app/shared/components/dialogs/FoundSettlerDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import { Close } from '@mui/icons-material';
import SettlerCard from '../../../../features/settlers/SettlerCard';
import type { Settler } from '../../../../lib/types/settler';

interface FoundSettlerDialogProps {
  open: boolean;
  settler: Settler | null;
  onClose: () => void;
  onApprove: (settler: Settler) => void;
  onReject: (settler: Settler) => void;
  isLoading?: boolean;
}

const FoundSettlerDialog: React.FC<FoundSettlerDialogProps> = ({
  open,
  settler,
  onClose,
  onApprove,
  onReject,
  isLoading = false
}) => {
  if (!settler) return null;

  const handleApprove = () => {
    onApprove(settler);
    // Don't automatically close - let the parent handle it after API success
  };

  const handleReject = () => {
    onReject(settler);
    // Don't automatically close - let the parent handle it after API success
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" component="div" color="primary">
            Settler Discovered!
          </Typography>
          <IconButton 
            onClick={onClose} 
            size="small"
            disabled={isLoading}
          >
            <Close />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Your settlers have encountered someone willing to join your colony.
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        <SettlerCard
          settler={settler}
          actions={[]} // No actions on the card itself - we'll use dialog actions
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={handleReject}
          variant="outlined"
          color="error"
          size="large"
          disabled={isLoading}
          sx={{ minWidth: 120 }}
        >
          {isLoading ? 'Processing...' : 'Reject'}
        </Button>
        <Button
          onClick={handleApprove}
          variant="contained"
          color="success"
          size="large"
          disabled={isLoading}
          sx={{ minWidth: 120 }}
        >
          {isLoading ? 'Processing...' : 'Recruit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FoundSettlerDialog;