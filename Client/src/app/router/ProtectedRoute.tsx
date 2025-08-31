import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth';
import { useColony } from '../../lib/hooks/useColony';
import { CircularProgress, Container } from '@mui/material';
import GlobalAssignmentHandler from '../shared/components/GlobalAssignmentHandler';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { agent } from '../../lib/api/agent';
import { assignmentTimerService } from '../../lib/services/AssignmentTimerService';

export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  const { colony, colonyLoading } = useColony("server-1");
  const location = useLocation();

  // Move ALL hooks to the top before any conditional returns
  const { data: assignments } = useQuery({
    queryKey: ["assignments", colony?._id],
    queryFn: async () => {
      const response = await agent.get(`/colonies/${colony!._id}/assignments`);
      return response.data.assignments;
    },
    enabled: colony && !!colony?._id,
  });

  useEffect(() => {
    if (assignments && colony?._id) {
      assignmentTimerService.initialize(assignments, "server-1", colony._id);
    }
  }, [assignments, colony?._id]);

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
    <>
      <GlobalAssignmentHandler serverId="server-1" colonyId={colony._id} /> 
      <Outlet />
    </>
  );
};