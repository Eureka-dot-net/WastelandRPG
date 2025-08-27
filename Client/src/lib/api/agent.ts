import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const agent = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Use an interceptor to automatically attach the token to every request
agent.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    // If a token exists in localStorage, attach it to the Authorization header
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);