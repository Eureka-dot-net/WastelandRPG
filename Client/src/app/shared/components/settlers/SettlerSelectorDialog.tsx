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
import SettlerPreviewCard from './SettlerPreviewCard';
import type { BasePreviewResult } from '../../../../lib/types/preview';

export interface SettlerSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (settler: Settler) => void;
  settlers: Settler[];
  title?: string;
  emptyStateMessage?: string;
  emptyStateSubMessage?: string;
  showSkills?: boolean;
  showStats?: boolean;
  confirmPending?: boolean;
  // Unified preview data for all settlers - key is settlerId
  settlerPreviews?: Record<string, BasePreviewResult>;
  previewsLoading?: boolean;
  previewsError?: Error | null;
}

const SettlerSelectorDialog: React.FC<SettlerSelectorDialogProps> = ({
  open,
  onClose,
  onSelect,
  settlers,
  title = "Select Settler",
  emptyStateMessage = "No available settlers",
  emptyStateSubMessage = "All settlers are currently assigned to other tasks.",
  showSkills = true,
  showStats = false,
  confirmPending = false,
  settlerPreviews = {},
  previewsLoading = false,
  previewsError = null
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
      <DialogTitle sx={{ 
        color: 'primary.main', 
        pb: isMobile ? 0.5 : 1,
        pt: isMobile ? 1.5 : 2,
        px: isMobile ? 2 : 3,
        fontSize: isMobile ? '1rem' : '1.25rem',
        fontWeight: 600
      }}>
        <Box display="flex" alignItems="center" gap={isMobile ? 0.75 : 1}>
          <Person 
            color="primary" 
            sx={{ fontSize: isMobile ? '1.1rem' : '1.25rem' }}
          />
          <Typography 
            variant={isMobile ? 'subtitle1' : 'h6'} 
            component="span"
            sx={{ 
              fontSize: isMobile ? '0.95rem' : '1.1rem',
              fontWeight: 600,
              lineHeight: 1.2
            }}
          >
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ 
        pt: isMobile ? 0.5 : 1, 
        pb: isMobile ? 1 : 1.5,
        px: isMobile ? 2 : 3,
        maxHeight: isMobile ? '60vh' : '70vh', 
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#1a1a1a',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#555',
          borderRadius: '3px',
          '&:hover': {
            background: '#666',
          },
        },
      }}>
        {settlers.length > 0 ? (
          isSingleSettler ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              sx={{
                minHeight: isMobile ? 'auto' : 120,
                width: '100%',
              }}
            >
              <SettlerPreviewCard
                key={settlers[0]._id}
                settler={settlers[0]}
                showSkills={showSkills}
                showStats={showStats}
                onClick={!confirmPending ? () => onSelect(settlers[0]) : undefined}
                confirmPending={confirmPending}
                preview={settlerPreviews[settlers[0]._id]}
                isLoading={previewsLoading}
                error={previewsError}
              />
            </Box>
          ) : (
            <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={isMobile ? 0.75 : 1.5}>
              {settlers.map((settler) => (
                <SettlerPreviewCard
                  key={settler._id}
                  settler={settler}
                  showSkills={showSkills}
                  showStats={showStats}
                  onClick={!confirmPending ? () => onSelect(settler) : undefined}
                  confirmPending={confirmPending}
                  preview={settlerPreviews[settler._id]}
                  isLoading={previewsLoading}
                  error={previewsError}
                />
              ))}
            </Box>
          )
        ) : (
          <Box sx={{ 
            textAlign: 'center', 
            py: isMobile ? 2 : 3, 
            px: isMobile ? 1 : 2,
            width: '100%',
            opacity: 0.8
          }}>
            <Typography 
              variant={isMobile ? "body2" : "body1"} 
              color="text.secondary"
              sx={{ 
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                mb: isMobile ? 0.5 : 1
              }}
            >
              {emptyStateMessage}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                fontSize: isMobile ? '0.7rem' : '0.8rem',
                lineHeight: 1.3,
                opacity: 0.7
              }}
            >
              {emptyStateSubMessage}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{
        px: isMobile ? 2 : 3,
        pb: isMobile ? 1.5 : 2,
        pt: isMobile ? 0.5 : 1,
        borderTop: '1px solid #333333',
        backgroundColor: 'rgba(0, 0, 0, 0.3)'
      }}>
        <Button 
          ref={cancelButtonRef}
          onClick={handleClose} 
          color="inherit" 
          disabled={confirmPending}
          size={isMobile ? "small" : "medium"}
          sx={{
            fontSize: isMobile ? '0.8rem' : '0.875rem',
            minWidth: isMobile ? '60px' : '80px',
            textTransform: 'none',
            fontWeight: 500,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettlerSelectorDialog;