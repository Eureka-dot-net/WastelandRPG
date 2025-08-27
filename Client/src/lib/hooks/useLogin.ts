// src/hooks/useLogin.ts
import { useMutation } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { agent } from '../api/agent';
import { useNavigate } from 'react-router-dom';

interface LoginData {
  email: string;
  password: string;
}

interface LoginResult {
  token: string;
}

export const useLogin = () => {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  return useMutation<LoginResult, Error, LoginData>({
    mutationFn: async (data: LoginData) => {
      const res = await agent.post('/auth/login', data);
      const result: LoginResult = res.data;

      if (!res.status.toString().startsWith('2')) {
        throw new Error(result.token || 'Login failed'); // fallback
      }
      setToken(result.token);
      return result;
    },
    onSuccess: () => {
      navigate('/');
    },
  });
};