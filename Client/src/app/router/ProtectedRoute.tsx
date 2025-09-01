import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth';
import { useColony } from '../../lib/hooks/useColony';
import { CircularProgress, Container } from '@mui/material';
import { AssignmentNotificationProvider } from '../../lib/contexts/AssignmentNotificationContext';
import GlobalSettlerDialog from '../shared/components/GlobalSettlerDialog';
import { useServerContext } from '../../lib/contexts/ServerContext';

export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  const { currentServerId } = useServerContext();
  const { colony, colonyLoading } = useColony(currentServerId);
  const location = useLocation();

  // NOW do your conditional logic
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (colonyLoading)
    return (
      <Container maxWidth="lg" sx={{ mt: 20, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  
  if (!colony) return <Navigate to="/login" replace />;

  const routeUnlockMap: Record<string, string> = {
    "/homestead": "homestead",
    "/inventory": "inventory",
    "/map": "map",
    "/lodgings": "lodgings",
    "/crafting": "crafting",
    "/farming": "farming",
    "/defence": "defence",
  };

  const path = location.pathname;

  // Whitelist onboarding pages
  const onboardingPages = ["/settler-selection"];
  if (onboardingPages.includes(path)) return <Outlet />;

  // Check for settlers
  if (colony.settlerCount <= 0) return <Navigate to="/settler-selection" replace />;

  // Check unlocks dynamically
  const requiredUnlock = routeUnlockMap[location.pathname];
  if (requiredUnlock && !colony.unlocks[requiredUnlock]) {
    return <Navigate to="/assignments" replace />;
  }

  return (
    <AssignmentNotificationProvider>
      <GlobalSettlerDialog />
      <Outlet />
    </AssignmentNotificationProvider>
  );
};