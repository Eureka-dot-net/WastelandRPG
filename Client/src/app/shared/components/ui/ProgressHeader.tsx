// File: src/shared/components/ui/ProgressHeader.tsx
import React from 'react';
import { Paper, Typography, Alert, Box, LinearProgress, useTheme, useMediaQuery } from '@mui/material';

interface ProgressHeaderProps {
  title: string;
  alertMessage?: string;
  alertSeverity?: 'error' | 'warning' | 'info' | 'success';
  progressLabel: string;
  currentValue: number;
  totalValue: number;
  progressColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  emoji?: string;
  backgroundColor?: string;
  borderColor?: string;
}

const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  title,
  alertMessage,
  alertSeverity = 'warning',
  progressLabel,
  currentValue,
  totalValue,
  progressColor = 'secondary',
  emoji,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const progressPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: isMobile ? 2 : 3, 
        mb: isMobile ? 2 : 4, 
      }}
    >
      <Typography variant={isMobile ? "h5" : "h4"} gutterBottom sx={{ color: 'primary.main', mb: isMobile ? 1 : undefined }}>
        {emoji && `${emoji} `}{title}
      </Typography>
      
      {alertMessage && (
        <Alert severity={alertSeverity} sx={{ mb: isMobile ? 1.5 : 2 }}>
          {alertMessage}
        </Alert>
      )}
      
      <Box sx={{ mt: isMobile ? 2 : 3 }}>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">
            {progressLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentValue}/{totalValue} completed
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progressPercentage} 
          color={progressColor} 
          sx={{ height: isMobile ? 6 : 8, borderRadius: 4 }} 
        />
      </Box>
    </Paper>
  );
};

export default ProgressHeader;