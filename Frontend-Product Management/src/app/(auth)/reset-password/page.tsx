'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/api/authService';

const resetSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
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

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: tokenFromUrl,
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (tokenFromUrl) {
      setValue('token', tokenFromUrl);
    }
  }, [tokenFromUrl, setValue]);

  const onSubmit = async (data: ResetForm) => {
    try {
      setErrorMessage(null);
      await authService.resetPassword(data.token.trim(), data.password);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to reset password. Token may be invalid or expired.'
      );
    }
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
        Enter your reset token and new password below
      </Typography>

      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)} sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          fullWidth
          label="Reset Token"
          error={!!errors.token}
          helperText={errors.token?.message}
          {...register('token')}
          sx={{ mb: 2.5 }}
        />

        <TextField
          fullWidth
          label="New password"
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
                    {showConfirmPassword ? (
                      <VisibilityOff fontSize="small" />
                    ) : (
                      <Visibility fontSize="small" />
                    )}
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
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Typography>Loading…</Typography>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
