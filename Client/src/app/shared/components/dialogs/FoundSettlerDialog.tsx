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
  IconButton,
  useMediaQuery,
  useTheme
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
          backgroundColor: '#000000',
          backgroundImage: 'linear-gradient(145deg, #000000 0%, #111111 50%, #000000 100%)',
          border: '1px solid #333333',
          borderRadius: isMobile ? 1 : 2,
          boxShadow: '0 8px 32px rgba(211, 47, 47, 0.3), 0 0 0 1px rgba(211, 47, 47, 0.1)',
          minHeight: isMobile ? 'auto' : '200px',
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