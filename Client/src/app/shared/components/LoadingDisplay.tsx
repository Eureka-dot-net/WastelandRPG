// File: src/shared/components/ui/LoadingDisplay.tsx
import React from 'react';
import { Container, Box, CircularProgress, Paper, Typography } from '@mui/material';

interface LoadingDisplayProps {
  title?: string;
  subtitle?: string;
  size?: number;
  showContainer?: boolean;
  showPaper?: boolean;
  minHeight?: string;
  emoji?: string;
}

const LoadingDisplay: React.FC<LoadingDisplayProps> = ({
  title,
  subtitle,
  size = 60,
  showContainer = true,
  showPaper = false,
  minHeight = '50vh',
  emoji
}) => {
  const content = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight={minHeight}
    >
      {showPaper ? (
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 500, textAlign: 'center' }}>
          {title && (
            <Typography variant="h4" gutterBottom>
              {emoji && `${emoji} `}{title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {subtitle}
            </Typography>
          )}
          <CircularProgress color="primary" size={size} />
        </Paper>
      ) : (
        <>
          {title && (
            <Typography variant="h6" gutterBottom>
              {emoji && `${emoji} `}{title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {subtitle}
            </Typography>
          )}
          <CircularProgress color="primary" size={size} />
        </>
      )}
    </Box>
  );

  if (showContainer) {
    return (
      <Container maxWidth="lg">
        {content}
      </Container>
    );
  }

  return content;
};

export default LoadingDisplay;