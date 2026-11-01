'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4a4a4a',
      dark: '#333333',
      light: '#6b6b6b',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7a7a7a',
      dark: '#5a5a5a',
      light: '#9a9a9a',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#2d2d2d',
      secondary: '#666666',
      disabled: '#999999',
    },
    error: {
      main: '#c0392b',
    },
    success: {
      main: '#27ae60',
    },
    divider: '#e0e0e0',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 600,
      color: '#2d2d2d',
    },
    h5: {
      fontWeight: 600,
      color: '#2d2d2d',
    },
    h6: {
      fontWeight: 600,
      color: '#2d2d2d',
    },
    body2: {
      color: '#666666',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.95rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#fafafa',
            '& fieldset': {
              borderColor: '#e0e0e0',
            },
            '&:hover fieldset': {
              borderColor: '#cccccc',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4a4a4a',
              borderWidth: '1.5px',
            },
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#cccccc',
          '&.Mui-checked': {
            color: '#4a4a4a',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#e0e0e0',
        },
      },
    },
  },
});

export default theme;

