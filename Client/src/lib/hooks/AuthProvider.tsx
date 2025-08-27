// src/hooks/useAuth.tsx
import { useState, useEffect, type ReactNode, useMemo } from 'react';
import { AuthContext } from './useAuth';

// to do: token gets expired. 
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('token'));

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }

    setTokenState(newToken);
    // The attachToken call is no longer needed. The Axios interceptor handles it automatically.
  };

  useEffect(() => {
    // The attachToken call is no longer needed here either. The interceptor is a better pattern.
  }, [token]);

  const isAuthenticated = !!token;

  const contextValue = useMemo(() => ({
    token,
    setToken,
    isAuthenticated,
  }), [token, isAuthenticated]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};