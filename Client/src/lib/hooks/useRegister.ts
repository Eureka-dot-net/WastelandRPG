// src/hooks/useRegister.ts
import { useMutation } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { agent } from '../api/agent'
import { useNavigate } from 'react-router-dom';

interface RegisterData {
  email: string;
  password: string;
  serverId: string;
}

interface LoginResult {
  token: string;
}

export const useRegister = () => {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  return useMutation<LoginResult, Error, RegisterData>({
    mutationFn: async (data: RegisterData) => {
      await agent.post('/auth/register', data); // register

      const res = await agent.post('/auth/login', data); 
      const result: LoginResult = res.data;
      
      setToken(result.token);

      return result;
    },
    onSuccess: () => {
      navigate('/');
    },
  });
};
