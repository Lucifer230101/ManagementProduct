'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import {
  Box,
  TextField,
  Button,
  Typography,
  Divider,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { authService } from '@/services/api/authService';
import { setAuthSession } from '@/services/api';
import { loginSuccess } from '@/store/slices/authSlice';

const shopTypes = [
  { value: 'grocery', label: 'Grocery / Kirana' },
  { value: 'clothing', label: 'Clothing & Apparel' },
  { value: 'pharmacy', label: 'Pharmacy / Chemist' },
  { value: 'electronics', label: 'Electronics & Mobile' },
  { value: 'hardware', label: 'Hardware Store' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'general', label: 'General Retail' },
];

const registerSchema = z
  .object({
    shopName: z.string().min(2, 'Shop name must be at least 2 characters'),
    shopType: z.string().min(1, 'Shop type is required'),
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    phone: z.string().optional(),
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
  const router = useRouter();
  const dispatch = useDispatch();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      shopName: '',
      shopType: 'general',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setErrorMessage(null);
      const res = await authService.register({
        shopName: data.shopName.trim(),
        shopType: data.shopType,
        name: data.fullName.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || undefined,
        password: data.password,
        currency: 'INR',
      });

      const { user, token } = res.data;
      setAuthSession(token, user, true);
      dispatch(loginSuccess({ user, token }));

      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to create shop account. Please verify your details.'
      );
    }
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
      <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
        Register your shop and get started with your account
      </Typography>

      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)} sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Form */}
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          fullWidth
          label="Shop / Business Name"
          autoFocus
          error={!!errors.shopName}
          helperText={errors.shopName?.message}
          {...register('shopName')}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          select
          label="Shop Type"
          defaultValue="general"
          {...register('shopType')}
          sx={{ mb: 2 }}
        >
          {shopTypes.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          label="Owner Full Name"
          autoComplete="name"
          error={!!errors.fullName}
          helperText={errors.fullName?.message}
          {...register('fullName')}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Email address"
          type="email"
          autoComplete="email"
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register('email')}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Phone number (optional)"
          autoComplete="tel"
          error={!!errors.phone}
          helperText={errors.phone?.message}
          {...register('phone')}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Password (min 8 characters)"
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
                    {showPassword ? (
                      <VisibilityOff fontSize="small" />
                    ) : (
                      <Visibility fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 2 }}
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

        {/* Sign up button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={isSubmitting}
          startIcon={
            isSubmitting ? <CircularProgress size={18} color="inherit" /> : null
          }
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
          onClick={() => setErrorMessage('Google OAuth is not configured in local environment.')}
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
