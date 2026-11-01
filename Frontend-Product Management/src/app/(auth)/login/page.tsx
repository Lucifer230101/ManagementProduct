'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Divider,
  IconButton,
  InputAdornment,
  Alert,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    // TODO: integrate with auth API
    console.log('Login:', { ...data, rememberMe });
  };

  const handleGoogleLogin = () => {
    // TODO: integrate Google OAuth
    console.log('Google login');
  };

  return (
    <Box>
      {/* Header */}
      <Typography
        variant="h4"
        sx={{
          mb: 0.5,
          fontWeight: 600,
          color: 'text.primary',
          letterSpacing: '-0.02em',
        }}
      >
        Welcome back
      </Typography>
      <Typography
        variant="body2"
        sx={{ mb: 4, color: 'text.secondary' }}
      >
        Sign in to your account to continue
      </Typography>

      {/* Form */}
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          fullWidth
          label="Email address"
          type="email"
          autoComplete="email"
          autoFocus
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register('email')}
          sx={{ mb: 2.5 }}
        />

        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          error={!!errors.password}
          helperText={errors.password?.message}
          {...register('password')}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                    tabIndex={-1}
                    sx={{ color: 'text.disabled' }}
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1.5 }}
        />

        {/* Remember me & Forgot password */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Remember me
              </Typography>
            }
          />
          <Link href="/forgot-password">
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                cursor: 'pointer',
                '&:hover': { color: 'text.primary', textDecoration: 'underline' },
                transition: 'color 200ms',
              }}
            >
              Forgot password?
            </Typography>
          </Link>
        </Box>

        {/* Sign in button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={isSubmitting}
          sx={{
            mb: 3,
            py: 1.4,
            bgcolor: '#333333',
            '&:hover': { bgcolor: '#1a1a1a' },
            fontSize: '0.95rem',
            fontWeight: 500,
          }}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>

        {/* Divider */}
        <Divider sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.disabled', px: 1 }}>
            or
          </Typography>
        </Divider>

        {/* Google sign in */}
        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={handleGoogleLogin}
          startIcon={<GoogleIcon />}
          sx={{
            mb: 4,
            py: 1.3,
            color: 'text.primary',
            borderColor: '#e0e0e0',
            '&:hover': {
              borderColor: '#cccccc',
              bgcolor: '#fafafa',
            },
            fontSize: '0.95rem',
            fontWeight: 400,
          }}
        >
          Sign in with Google
        </Button>

        {/* Sign up link */}
        <Typography
          variant="body2"
          sx={{ textAlign: 'center', color: 'text.secondary' }}
        >
          Don&apos;t have an account?{' '}
          <Link href="/register">
            <Typography
              component="span"
              variant="body2"
              sx={{
                color: 'text.primary',
                fontWeight: 500,
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Create an account
            </Typography>
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}

