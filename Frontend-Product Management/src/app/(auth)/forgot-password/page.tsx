'use client';

import Link from 'next/link';
import {
  Box,
  TextField,
  Button,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

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
    // TODO: integrate with password reset API
    console.log('Forgot password:', data);
    setSubmitted(true);
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
        <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
          We&apos;ve sent a password reset link to{' '}
          <strong>{getValues('email')}</strong>
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

