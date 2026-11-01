'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  TextField,
  Button,
  Typography,
  Divider,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const registerSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required').min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterForm) => {
    // TODO: integrate with auth API
    console.log('Register:', data);
  };

  const handleGoogleSignup = () => {
    // TODO: integrate Google OAuth
    console.log('Google signup');
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
        Create an account
      </Typography>
      <Typography
        variant="body2"
        sx={{ mb: 4, color: 'text.secondary' }}
      >
        Get started with your free account
      </Typography>

      {/* Form */}
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          fullWidth
          label="Full name"
          autoComplete="name"
          autoFocus
          error={!!errors.fullName}
          helperText={errors.fullName?.message}
          {...register('fullName')}
          sx={{ mb: 2.5 }}
        />

        <TextField
          fullWidth
          label="Email address"
          type="email"
          autoComplete="email"
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register('email')}
          sx={{ mb: 2.5 }}
        />

        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
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
          sx={{ mb: 2.5 }}
        />

        <TextField
          fullWidth
          label="Confirm password"
          type={showConfirmPassword ? 'text' : 'password'}
          autoComplete="new-password"
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
          {...register('confirmPassword')}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    size="small"
                    tabIndex={-1}
                    sx={{ color: 'text.disabled' }}
                  >
                    {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 3 }}
        />

        {/* Sign up button */}
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>

        {/* Divider */}
        <Divider sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.disabled', px: 1 }}>
            or
          </Typography>
        </Divider>

        {/* Google sign up */}
        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={handleGoogleSignup}
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
          Sign up with Google
        </Button>

        {/* Login link */}
        <Typography
          variant="body2"
          sx={{ textAlign: 'center', color: 'text.secondary' }}
        >
          Already have an account?{' '}
          <Link href="/login">
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
              Sign in
            </Typography>
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}

