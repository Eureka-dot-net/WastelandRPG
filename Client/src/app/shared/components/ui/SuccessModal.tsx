// File: src/shared/components/ui/SuccessModal.tsx
import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Alert, 
  Card, 
  CardContent, 
  Box, 
  IconButton 
} from '@mui/material';
import { Close, Person } from '@mui/icons-material';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  successMessage: string;
  entityName: string;
  entityDescription?: string;
  continueButtonText?: string;
  onContinue?: () => void;
  emoji?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  successMessage,
  entityName,
  entityDescription,
  continueButtonText = 'Continue',
  onContinue,
  emoji = '🎉'
}) => {
  const [isNavigating, setIsNavigating] = React.useState(false);

  const handleContinueClick = () => {
    setIsNavigating(true);
    if (onContinue) {
      onContinue();
    } else {
      onClose();
    }
    setIsNavigating(false);
  };

  const handleClose = () => {
    if (!isNavigating) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" component="div">
            {emoji} {title}
          </Typography>
          <IconButton onClick={handleClose} disabled={isNavigating}>
            <Close />
          </IconButton>
        </Box>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            {successMessage}
          </Typography>
        </Alert>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Person color="primary" />
              <Typography variant="h6" color="primary">
                {entityName}
              </Typography>
            </Box>
            {entityDescription && (
              <Typography variant="body1" color="text.secondary">
                {entityDescription}
              </Typography>
            )}
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleContinueClick}
          disabled={isNavigating}
          fullWidth
          size="large"
        >
          {isNavigating ? 'Loading...' : continueButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuccessModal;