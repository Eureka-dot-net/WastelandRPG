// src/hooks/useAuth.tsx
import { useState, useEffect, type ReactNode, useMemo, useCallback } from 'react';
import { AuthContext } from './useAuth';
import { agent, setLogoutCallback } from '../api/agent';
import type { QueryClient } from '@tanstack/react-query';

export const AuthProvider = ({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) => {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('token'));

  const setToken = useCallback((newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
    setTokenState(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setTokenState(null);
    // Clear all React Query cache to prevent showing previous user's data
    queryClient.clear();
    // Do NOT call navigate here. Components can react to `token` changes.
  }, [queryClient]);

  // Set up logout callback for agent
  useEffect(() => {
    setLogoutCallback(logout);
  }, [logout]);

  // Validate token on app startup
  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          await agent.get('/auth/validate');
        } catch {
          console.log('Token validation failed, clearing token');
          localStorage.removeItem('token');
          setTokenState(null);
        }
      }
    };
    validateToken();
  }, [token]);

  const isAuthenticated = !!token;

  const contextValue = useMemo(() => ({
    token,
    setToken,
    logout,
    isAuthenticated,
  }), [token, setToken, logout, isAuthenticated]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
