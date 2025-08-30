// File: src/shared/components/ui/PageHeader.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  textAlign?: 'left' | 'center' | 'right';
  marginBottom?: number;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  emoji,
  textAlign = 'center',
  marginBottom = 4
}) => {
  return (
    <Box textAlign={textAlign} mb={marginBottom}>
      <Typography variant="h4" gutterBottom>
        {emoji && `${emoji} `}{title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default PageHeader;