'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Divider,
  Paper,
} from '@mui/material';
import {
  Store as StoreIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  Logout as LogoutIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

import type { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { authService, AuthUser } from '@/services/api/authService';
import { getToken, getUserData, clearAuthSession } from '@/services/api';

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const reduxUser = useSelector((state: RootState) => state.auth.user);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(reduxUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const storedUser = getUserData<AuthUser>();
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    // Fetch fresh profile from backend
    authService
      .getMe()
      .then((res) => {
        if (res.data) {
          setCurrentUser(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore API logout error and still clear local session
    } finally {
      clearAuthSession();
      dispatch(logout());
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Loading dashboard…
        </Typography>
      </Container>
    );
  }

  const role = currentUser?.role || 'User';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 5 }}>
      <Container maxWidth="lg">
        {/* Top App Bar Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: '#334155',
                width: 52,
                height: 52,
                fontSize: '1.25rem',
                fontWeight: 600,
              }}
            >
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  {currentUser?.name || 'Welcome'}
                </Typography>
                <Chip
                  label={role}
                  color={role === 'Owner' ? 'primary' : 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {currentUser?.email}
              </Typography>
            </Box>
          </Box>

          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ borderRadius: 2, textTransform: 'none', px: 2.5 }}
          >
            Sign out
          </Button>
        </Paper>

        {/* Status Banner */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            bgcolor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CheckCircleIcon sx={{ color: '#059669', fontSize: 32 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#065f46' }}>
              Authentication Connected Successfully!
            </Typography>
            <Typography variant="body2" sx={{ color: '#047857' }}>
              Your frontend is securely authenticated with the Shop Billing & Management Backend API.
            </Typography>
          </Box>
        </Paper>

        {/* Shop Info & Session Overview */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
            mb: 4,
          }}
        >
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <StoreIcon sx={{ color: '#2563eb' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Current Shop
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Shop Name:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1.5 }}>
                {currentUser?.shopName || 'Retail Shop'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Shop ID:
              </Typography>
              <Typography variant="caption" sx={{ wordBreak: 'break-all', color: '#64748b' }}>
                {currentUser?.shopId || 'N/A'}
              </Typography>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <SecurityIcon sx={{ color: '#16a34a' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Active Role
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Permission Level:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1.5 }}>
                {role} {role === 'Owner' ? '(Full Access)' : '(Standard)'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Role ID:
              </Typography>
              <Typography variant="caption" sx={{ wordBreak: 'break-all', color: '#64748b' }}>
                {currentUser?.roleId || 'System Role'}
              </Typography>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <PeopleIcon sx={{ color: '#7c3aed' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Account Details
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                User ID:
              </Typography>
              <Typography variant="caption" sx={{ wordBreak: 'break-all', color: '#64748b', mb: 1.5, display: 'block' }}>
                {currentUser?.id}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Phone:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {currentUser?.phone || 'Not specified'}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Module Shortcuts */}
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
          Platform Modules
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 3,
          }}
        >
          <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <InventoryIcon sx={{ fontSize: 36, color: '#3b82f6', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Inventory
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track products, categories, stock levels and pricing.
            </Typography>
          </Card>

          <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <PeopleIcon sx={{ fontSize: 36, color: '#10b981', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Employees
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage staff accounts, employee profiles and roles.
            </Typography>
          </Card>

          <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <SecurityIcon sx={{ fontSize: 36, color: '#8b5cf6', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Roles & Permissions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Granular RBAC enforcement across 21 permission codes.
            </Typography>
          </Card>

          <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <HistoryIcon sx={{ fontSize: 36, color: '#f59e0b', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Audit Logs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Immutable, append-only security and activity ledger.
            </Typography>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}
