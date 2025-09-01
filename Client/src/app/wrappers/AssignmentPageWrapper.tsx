import React from 'react';
import { useServerContext } from '../../lib/contexts/ServerContext';
import AssignmentPage from '../../features/Assignments/AssignmentPage';
import { CircularProgress, Box, Typography } from '@mui/material';

const AssignmentPageWrapper: React.FC = () => {
  const { currentServerId, isLoading } = useServerContext();

  if (isLoading || !currentServerId) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading server...
        </Typography>
      </Box>
    );
  }

  return <AssignmentPage serverId={currentServerId} />;
};

export default AssignmentPageWrapper;