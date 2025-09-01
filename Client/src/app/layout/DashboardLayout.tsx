import { Outlet } from 'react-router-dom';
import { Box, Container, useMediaQuery } from '@mui/material';
import DashboardTopBar from './DashboardTopBar';
import { useServerContext } from '../../lib/contexts/ServerContext';
import InitialServerSelection from '../../components/InitialServerSelection/InitialServerSelection';

const MOBILE_HEADER_HEIGHT = 10;    // px (adjust based on your AppBar height on mobile)
const DESKTOP_HEADER_HEIGHT = 16; 

const DashboardLayout = () => {
  // Use MUI hook for match (keep consistent with DashboardTopBar)
  const isMobile = useMediaQuery('(max-width:900px)');
  const { userColonies, isLoading } = useServerContext();
  
  // Show initial server selection if user has no colonies
  if (!isLoading && userColonies.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth='xl'>
          <InitialServerSelection />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardTopBar />
      <Container maxWidth='xl' sx={{ pt: isMobile ? MOBILE_HEADER_HEIGHT : DESKTOP_HEADER_HEIGHT }}>
        <Outlet />
      </Container>
    </Box>
  );
};

export default DashboardLayout;