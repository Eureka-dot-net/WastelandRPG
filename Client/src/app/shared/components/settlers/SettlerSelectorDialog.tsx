// File: src/shared/components/settlers/SettlerSelectorDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Divider,
  Chip
} from '@mui/material';
import type { Settler } from '../../../../lib/types/settler';

interface SettlerSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (settler: Settler) => void;
  settlers: Settler[];
  title?: string;
  emptyStateMessage?: string;
  emptyStateSubMessage?: string;
  showSkills?: boolean;
  showStats?: boolean;
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
  showStats = false
}) => {
  const avatarColors = ['primary.main', 'secondary.main', 'success.main', 'warning.main', 'info.main', 'error.main'];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'background.paper', border: '1px solid #333' }
      }}
    >
      <DialogTitle sx={{ color: 'primary.main', pb: 1 }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ pt: 2, maxHeight: '60vh', overflowY: 'auto' }}>
        <Box display="flex" flexDirection="column" gap={2}>
          {settlers.map((settler, index) => {
            const avatarColor = avatarColors[index % avatarColors.length];

            return (
              <Card
                key={settler._id}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid #333',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                    borderColor: 'primary.main'
                  }
                }}
                onClick={() => onSelect(settler)}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar
                      sx={{
                        bgcolor: avatarColor,
                        width: 48,
                        height: 48,
                        fontSize: '1.25rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {settler.name.charAt(0)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                        {settler.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        {settler.backstory}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {showSkills && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                        Skills:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {Object.entries(settler.skills).map(([skill, level]) => (
                          <Chip
                            key={skill}
                            size="small"
                            label={`${skill}: ${level}`}
                            variant="filled"
                            color="secondary"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                    </>
                  )}

                  {showStats && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                        Stats:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {Object.entries(settler.stats).map(([stat, level]) => (
                          <Chip
                            key={stat}
                            size="small"
                            label={`${stat}: ${level}`}
                            variant="outlined"
                            color="primary"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {settlers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
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
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettlerSelectorDialog;