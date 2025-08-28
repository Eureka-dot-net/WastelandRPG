import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth';
import { useColony } from '../../lib/hooks/useColony';
import { CircularProgress, Container } from '@mui/material';

export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  const { colony, colonyLoading } = useColony("server-1");
  const location = useLocation();

  // 1. Auth guard
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. Colony loading guard
  if (colonyLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 20, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // 3. Colony not found (shouldn't happen, but fallback)
  if (!colony) return <Navigate to="/login" replace />;

  // 4. Onboarding guards
  if (!colony.hasSettlers && location.pathname !== "/settler-selection") {
    return <Navigate to="/settler-selection" replace />;
  }

  if (colony.hasSettlers && !colony.homeUnlocked && location.pathname !== "/assignments") {
    return <Navigate to="/assignments" replace />;
  }

  // 5. Allow intended route
  return <Outlet />;
};