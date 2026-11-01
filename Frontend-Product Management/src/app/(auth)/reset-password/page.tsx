'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const resetSchema = z
  .object({
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

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetForm) => {
    // TODO: integrate with reset password API
    console.log('Reset password:', data);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Box>
        <Typography
          variant="h4"
          sx={{ mb: 1, fontWeight: 600, color: 'text.primary', letterSpacing: '-0.02em' }}
        >
          Password reset
        </Typography>
        <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
          Your password has been successfully reset. You can now sign in with your new password.
        </Typography>

        <Link href="/login">
          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{
              py: 1.4,
              bgcolor: '#333333',
              '&:hover': { bgcolor: '#1a1a1a' },
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            Sign in
          </Button>
        </Link>
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ mb: 0.5, fontWeight: 600, color: 'text.primary', letterSpacing: '-0.02em' }}
      >
        Reset password
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
        Enter your new password below
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          fullWidth
          label="New password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          autoFocus
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
          label="Confirm new password"
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

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={isSubmitting}
          sx={{
            py: 1.4,
            bgcolor: '#333333',
            '&:hover': { bgcolor: '#1a1a1a' },
            fontSize: '0.95rem',
            fontWeight: 500,
          }}
        >
          {isSubmitting ? 'Resetting…' : 'Reset password'}
        </Button>
      </Box>
    </Box>
  );
}

