// src/hooks/useRegister.ts
import { useMutation } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { agent } from '../api/agent'
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';

interface RegisterData {
  email: string;
  password: string;
  serverId: string;
  colonyName?: string;
}

interface LoginResult {
  token: string;
}

interface ApiErrorResponse {
  message: string;
}

export const useRegister = () => {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  return useMutation<LoginResult, Error, RegisterData>({
    mutationFn: async (data: RegisterData) => {
      try {
        // First register the user
        await agent.post('/auth/register', data);
        
        // Then login to get the token
        const res = await agent.post('/auth/login', data); 
        const result: LoginResult = res.data;
        
        setToken(result.token);
        return result;
      } catch (error: unknown) {
        // Extract the error message from the API response
        const axiosError = error as AxiosError<ApiErrorResponse>;
        const message = axiosError.response?.data?.message || 'Registration failed';
        throw new Error(message);
      }
    },
    onSuccess: () => {
      navigate('/');
    },
  });
};
