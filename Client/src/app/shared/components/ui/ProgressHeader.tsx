// File: src/shared/components/ui/ProgressHeader.tsx
import React from 'react';
import { Paper, Typography, Alert, Box, LinearProgress } from '@mui/material';

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
  backgroundColor = 'rgba(211, 47, 47, 0.1)',
  borderColor = 'rgba(211, 47, 47, 0.3)'
}) => {
  const progressPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        mb: 4, 
        bgcolor: backgroundColor, 
        border: `1px solid ${borderColor}` 
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
        {emoji && `${emoji} `}{title}
      </Typography>
      
      {alertMessage && (
        <Alert severity={alertSeverity} sx={{ mb: 2 }}>
          {alertMessage}
        </Alert>
      )}
      
      <Box sx={{ mt: 3 }}>
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
          sx={{ height: 8, borderRadius: 4 }} 
        />
      </Box>
    </Paper>
  );
};

export default ProgressHeader;