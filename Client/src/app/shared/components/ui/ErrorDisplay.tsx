// File: src/shared/components/ErrorDisplay.tsx
import React from 'react';
import { Alert, Container, Box, type SxProps } from '@mui/material';

interface ErrorDisplayProps {
  error: string | Error | null;
  severity?: 'error' | 'warning' | 'info' | 'success';
  sx?: SxProps;
  showContainer?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  severity = 'error', 
  sx = {},
  showContainer = false
}) => {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;

  const alertComponent = (
    <Alert severity={severity} sx={{ ...sx }}>
      {errorMessage}
    </Alert>
  );

  if (showContainer) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 2 }}>
          {alertComponent}
        </Box>
      </Container>
    );
  }

  return alertComponent;
};

export default ErrorDisplay;