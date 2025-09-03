import { createTheme } from '@mui/material';

export const wastelandTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#d32f2f', // Blood red
    },
    secondary: {
      main: '#4caf50', // Survival green
    },
    background: {
      default: '#1c2526',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
    error: {
      main: '#ff5722',
    },
    warning: {
      main: '#ff9800',
    }
  },
  typography: {
    fontFamily: '"Roboto", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      color: '#ffffff',
      '@media (max-width:600px)': {
        fontSize: '1.75rem', // Reduced from default 2.125rem
        lineHeight: 1.3,
      },
    },
    h5: {
      fontWeight: 600,
      color: '#ffffff',
      '@media (max-width:600px)': {
        fontSize: '1.25rem', // Reduced from default 1.5rem
        lineHeight: 1.3,
      },
    },
    h6: {
      fontWeight: 600,
      color: '#ffffff',
      '@media (max-width:600px)': {
        fontSize: '1.1rem', // Reduced from default 1.25rem
        lineHeight: 1.3,
      },
    },
    body1: {
      '@media (max-width:600px)': {
        fontSize: '0.875rem', // Reduced from default 1rem
        lineHeight: 1.4,
      },
    },
    body2: {
      '@media (max-width:600px)': {
        fontSize: '0.75rem', // Reduced from default 0.875rem
        lineHeight: 1.4,
      },
    },
    subtitle1: {
      '@media (max-width:600px)': {
        fontSize: '0.95rem', // Reduced from default 1rem
        lineHeight: 1.4,
      },
    },
  },
  components: {
     MuiCssBaseline: {
    styleOverrides: {
      '*::-webkit-scrollbar': {
        width: '8px',
      },
      '*::-webkit-scrollbar-track': {
        background: '#2a2a2a',
        borderRadius: '4px',
      },
      '*::-webkit-scrollbar-thumb': {
        background: '#555',
        borderRadius: '4px',
        '&:hover': {
          background: '#666',
        },
      },
      '*::-webkit-scrollbar-thumb:active': {
        background: '#777',
      },
      // Firefox scrollbar styling
      '*': {
        scrollbarWidth: 'thin',
        scrollbarColor: '#555 #2a2a2a',
      },
    },
  },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#0a0a0aff',
          '--Paper-overlay': 'none',
          border: '1px solid #555',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#555',
            },
            '&:hover fieldset': {
              borderColor: '#777',
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});