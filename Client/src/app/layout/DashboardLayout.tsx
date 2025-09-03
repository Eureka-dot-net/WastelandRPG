import { Outlet } from 'react-router-dom';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';
import DashboardTopBar from './DashboardTopBar';
import { useUserColonies } from '../../lib/hooks/useUserColonies';
import InitialServerSelection from '../../components/InitialServerSelection/InitialServerSelection';

const MOBILE_HEADER_HEIGHT = 14;    // px (increased for mobile stats bar)
const DESKTOP_HEADER_HEIGHT = 16; 

const DashboardLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobileTopBar = useMediaQuery('(max-width:900px)');
  const { data: coloniesData, isLoading } = useUserColonies();
  const userColonies = coloniesData?.colonies || [];
  
  // Show initial server selection if user has no colonies
  if (!isLoading && userColonies.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth='xl' sx={{ px: isMobile ? 1 : 2 }}>
          <InitialServerSelection />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardTopBar />
      <Container maxWidth='xl' sx={{ 
        pt: isMobileTopBar ? MOBILE_HEADER_HEIGHT + 2 : DESKTOP_HEADER_HEIGHT,
        px: isMobile ? 1 : 2 // Reduced horizontal padding on mobile
      }}>
        <Outlet />
      </Container>
    </Box>
  );
};

export default DashboardLayout;