// src/hooks/useAuth.tsx
import { useState, useEffect, type ReactNode, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './useAuth';
import { agent, setLogoutCallback } from '../api/agent';

// to do: token gets expired. 
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('token'));
  const navigate = useNavigate();

  const setToken = useCallback((newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }

    setTokenState(newToken);
    // The attachToken call is no longer needed. The Axios interceptor handles it automatically.
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setTokenState(null);
    navigate('/login');
  }, [navigate]);

  // Set up logout callback for agent
  useEffect(() => {
    setLogoutCallback(logout);
  }, [logout]);

  // Validate token on app startup
  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          // Make a simple authenticated request to validate the token
          await agent.get('/auth/validate');
        } catch {
          // If validation fails, clear the token
          console.log('Token validation failed, clearing token');
          localStorage.removeItem('token');
          setTokenState(null);
        }
      }
    };

    validateToken();
  }, [token]); // Include token dependency

  useEffect(() => {
    // The attachToken call is no longer needed here either. The interceptor is a better pattern.
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