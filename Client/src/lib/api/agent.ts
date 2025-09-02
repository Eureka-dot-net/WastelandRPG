import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const agent = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Store logout callback to be set by AuthProvider
let logoutCallback: (() => void) | null = null;

export const setLogoutCallback = (callback: () => void) => {
  logoutCallback = callback;
};

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

// Response interceptor to handle 401 errors
agent.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token from localStorage
      localStorage.removeItem('token');
      
      // Call logout callback if available, otherwise fallback to direct navigation
      if (logoutCallback) {
        logoutCallback();
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);