'use client';

import Link from 'next/link';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { authService } from '@/services/api/authService';

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotForm) => {
    try {
      setErrorMessage(null);
      const res = await authService.forgotPassword(data.email.trim());
      if (res.data?.resetToken) {
        setGeneratedToken(res.data.resetToken);
      }
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process password reset request.');
    }
  };

  if (submitted) {
    return (
      <Box>
        <Typography
          variant="h4"
          sx={{ mb: 1, fontWeight: 600, color: 'text.primary', letterSpacing: '-0.02em' }}
        >
          Check your email
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
          Instructions have been generated for <strong>{getValues('email')}</strong>.
        </Typography>

        {generatedToken && (
          <Alert severity="info" sx={{ mb: 3, wordBreak: 'break-all' }}>
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>
              [Development Mode Token]:
            </Typography>
            <code style={{ fontSize: '0.8rem' }}>{generatedToken}</code>
          </Alert>
        )}

        <Link href={`/reset-password${generatedToken ? `?token=${generatedToken}` : ''}`}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{
              py: 1.4,
              mb: 2,
              bgcolor: '#333333',
              '&:hover': { bgcolor: '#1a1a1a' },
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            Enter Reset Token
          </Button>
        </Link>

        <Link href="/login">
          <Button
            fullWidth
            variant="text"
            startIcon={<ArrowBackIcon sx={{ fontSize: '1rem' }} />}
            sx={{ color: 'text.secondary' }}
          >
            Back to sign in
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
        Forgot password?
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
        Enter your email and we&apos;ll send you a reset link
      </Typography>

      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)} sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

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
            mb: 3,
            py: 1.4,
            bgcolor: '#333333',
            '&:hover': { bgcolor: '#1a1a1a' },
            fontSize: '0.95rem',
            fontWeight: 500,
          }}
        >
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>

        <Link href="/login">
          <Button
            fullWidth
            startIcon={<ArrowBackIcon sx={{ fontSize: '1rem' }} />}
            sx={{
              color: 'text.secondary',
              '&:hover': { bgcolor: '#f5f5f5' },
              fontSize: '0.9rem',
            }}
          >
            Back to sign in
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
