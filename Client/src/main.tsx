import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './app/router/routes';
import { AuthProvider } from './lib/hooks/AuthProvider';
import { ThemeProvider } from '@emotion/react';
import { wastelandTheme } from './app/themes/wastelandTheme';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ServerProvider } from './lib/contexts/ServerProvider';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <ThemeProvider theme={wastelandTheme}>
        <AuthProvider>
          <ServerProvider>
            <AppRouter />
          </ServerProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
