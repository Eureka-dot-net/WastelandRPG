// src/hooks/useLogin.ts
import { useMutation } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { agent } from '../api/agent';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';

interface LoginData {
  email: string;
  password: string;
}

interface LoginResult {
  token: string;
}

interface ApiErrorResponse {
  message: string;
}

export const useLogin = () => {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  return useMutation<LoginResult, Error, LoginData>({
    mutationFn: async (data: LoginData) => {
      try {
        const res = await agent.post('/auth/login', data);
        const result: LoginResult = res.data;
        setToken(result.token);
        return result;
      } catch (error: unknown) {
        // Extract the error message from the API response
        const axiosError = error as AxiosError<ApiErrorResponse>;
        const message = axiosError.response?.data?.message || 'Login failed';
        throw new Error(message);
      }
    },
    onSuccess: () => {
      navigate('/');
    },
  });
};