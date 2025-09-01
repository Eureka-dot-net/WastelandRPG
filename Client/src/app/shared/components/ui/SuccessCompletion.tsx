// File: src/shared/components/ui/SuccessCompletion.tsx
import React from 'react';
import { Container, Box, Paper, Typography, Alert, Card, CardContent, Button } from '@mui/material';
import { Person } from '@mui/icons-material';

interface SuccessCompletionProps {
  title: string;
  subtitle?: string;
  successMessage: string;
  entityName: string;
  entityDescription?: string;
  continueButtonText?: string;
  continueHref?: string;
  onContinue?: () => void;
  emoji?: string;
  showContainer?: boolean;
  maxWidth?: number;
}

const SuccessCompletion: React.FC<SuccessCompletionProps> = ({
  title,
  subtitle,
  successMessage,
  entityName,
  entityDescription,
  continueButtonText = 'Continue',
  continueHref,
  onContinue,
  emoji = '🎉',
  showContainer = true,
  maxWidth = 600
}) => {
  const [isNavigating, setIsNavigating] = React.useState(false);

  const handleContinueClick = () => {
    setIsNavigating(true);
    if (onContinue) {
      onContinue();
    }
    // If it's a link, let the default behavior happen
    if (!continueHref && !onContinue) {
      setIsNavigating(false);
    }
  };
  const content = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth }}>
        <Box textAlign="center" mb={3}>
          <Typography variant="h4" gutterBottom>
            {emoji} {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            {successMessage}
          </Typography>
        </Alert>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Person color="primary" />
              <Typography variant="h5" color="primary">
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
        
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 4 }}
            component={continueHref ? "a" : "button"}
            href={continueHref}
            onClick={handleContinueClick}
            disabled={isNavigating}
          >
            {isNavigating ? 'Loading...' : continueButtonText}
          </Button>
        </Box>
      </Paper>
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

export default SuccessCompletion;