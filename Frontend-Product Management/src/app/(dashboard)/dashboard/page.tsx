'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Chip,
  Paper,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  People as PeopleIcon,
  ManageAccounts as UsersIcon,
  Security as SecurityIcon,
  Extension as ModulesIcon,
  Settings as SettingsIcon,
  History as AuditIcon,
  Store as StoreIcon,
} from '@mui/icons-material';

import { authService, AuthUser } from '@/services/api/authService';
import { shopService } from '@/services/api/shopService';
import { userService } from '@/services/api/userService';
import { employeeService } from '@/services/api/employeeService';
import { roleService } from '@/services/api/roleService';
import { moduleService } from '@/services/api/moduleService';
import { auditService } from '@/services/api/auditService';
import { Shop, AuditLogItem } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [stats, setStats] = useState({
    userCount: 0,
    employeeCount: 0,
    roleCount: 0,
    enabledModules: 0,
  });
  const [recentAudit, setRecentAudit] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [meRes, shopRes, usersRes, empRes, rolesRes, modRes, auditRes] =
          await Promise.allSettled([
            authService.getMe(),
            shopService.getCurrentShop(),
            userService.getUsers({ limit: 1 }),
            employeeService.getEmployees(),
            roleService.getRoles(),
            moduleService.getModules(),
            auditService.getAuditLogs({ limit: 5 }),
          ]);

        if (meRes.status === 'fulfilled' && meRes.value?.data) {
          setUser(meRes.value.data);
        }
        if (shopRes.status === 'fulfilled' && shopRes.value?.data) {
          setShop(shopRes.value.data);
        }

        const userCount = usersRes.status === 'fulfilled' ? usersRes.value.total || 0 : 0;
        const employeeCount = empRes.status === 'fulfilled' ? empRes.value.data?.length || 0 : 0;
        const roleCount = rolesRes.status === 'fulfilled' ? rolesRes.value.data?.length || 0 : 0;
        const enabledModules =
          modRes.status === 'fulfilled'
            ? modRes.value.data?.filter((m) => m.isEnabled).length || 0
            : 0;

        setStats({ userCount, employeeCount, roleCount, enabledModules });

        if (auditRes.status === 'fulfilled' && auditRes.value.data) {
          setRecentAudit(auditRes.value.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const quickLinks = [
    {
      title: 'Employees Directory',
      desc: 'View designations, emergency contacts, and joining dates',
      icon: <PeopleIcon sx={{ fontSize: 28, color: '#3b82f6' }} />,
      href: '/employees',
    },
    {
      title: 'User Accounts',
      desc: 'Add staff credentials, toggle login status, and assign roles',
      icon: <UsersIcon sx={{ fontSize: 28, color: '#10b981' }} />,
      href: '/users',
    },
    {
      title: 'Roles & Privileges',
      desc: 'Configure granular permission checklists for cashier and staff',
      icon: <SecurityIcon sx={{ fontSize: 28, color: '#f59e0b' }} />,
      href: '/roles',
    },
    {
      title: 'Module Toggles',
      desc: 'Enable or disable Employee, Inventory, and Billing modules',
      icon: <ModulesIcon sx={{ fontSize: 28, color: '#8b5cf6' }} />,
      href: '/modules',
    },
    {
      title: 'Shop Configuration',
      desc: 'Edit store name, GSTIN, business category, and base currency',
      icon: <SettingsIcon sx={{ fontSize: 28, color: '#06b6d4' }} />,
      href: '/settings',
    },
    {
      title: 'Audit Trails',
      desc: 'Inspect tamper-evident change logs and old vs. new value diffs',
      icon: <AuditIcon sx={{ fontSize: 28, color: '#ef4444' }} />,
      href: '/audit',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {/* Welcome Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          mb: 4,
          borderRadius: 3,
          bgcolor: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Welcome, {user?.name || 'Shop Admin'}
            </Typography>
            <Chip
              label={user?.role || 'Owner'}
              size="small"
              sx={{ bgcolor: '#0f172a', color: '#ffffff', fontWeight: 700, fontSize: '0.7rem' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Store: <strong>{shop?.name || user?.shopName}</strong> ({shop?.shopType || 'General Retail'}) • Currency:{' '}
            <strong>{shop?.currency || 'INR'}</strong>
          </Typography>
        </Box>

        <Chip
          icon={<StoreIcon fontSize="small" />}
          label="Phase 1 Active"
          sx={{
            bgcolor: '#dcfce7',
            color: '#166534',
            fontWeight: 700,
          }}
        />
      </Paper>

      {/* Metric Cards Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
        >
          <CardActionArea onClick={() => router.push('/users')} sx={{ p: 2.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              TOTAL USERS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', my: 0.5 }}>
              {stats.userCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 600 }}>
              Manage accounts →
            </Typography>
          </CardActionArea>
        </Card>

        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
        >
          <CardActionArea onClick={() => router.push('/employees')} sx={{ p: 2.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              EMPLOYEES
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', my: 0.5 }}>
              {stats.employeeCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>
              Staff directory →
            </Typography>
          </CardActionArea>
        </Card>

        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
        >
          <CardActionArea onClick={() => router.push('/roles')} sx={{ p: 2.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              SYSTEM ROLES
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', my: 0.5 }}>
              {stats.roleCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 600 }}>
              Permissions matrix →
            </Typography>
          </CardActionArea>
        </Card>

        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
        >
          <CardActionArea onClick={() => router.push('/modules')} sx={{ p: 2.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              ACTIVE MODULES
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', my: 0.5 }}>
              {stats.enabledModules}
            </Typography>
            <Typography variant="caption" sx={{ color: '#8b5cf6', fontWeight: 600 }}>
              Toggle features →
            </Typography>
          </CardActionArea>
        </Card>
      </Box>

      {/* Quick Launch Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>
          Module 1 Core Controls
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
            gap: 2.5,
          }}
        >
          {quickLinks.map((link) => (
            <Card
              key={link.title}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: '#94a3b8',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardActionArea onClick={() => router.push(link.href)} sx={{ p: 2.5, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  {link.icon}
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    {link.title}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                  {link.desc}
                </Typography>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Recent Activity Feed */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AuditIcon sx={{ color: '#64748b' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Recent Audit Activity
            </Typography>
          </Box>
          <Chip
            label="View Full Log →"
            size="small"
            onClick={() => router.push('/audit')}
            clickable
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        </Box>
        <Divider sx={{ mb: 2 }} />

        {recentAudit.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No recent activity recorded.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {recentAudit.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                    <code>{item.action}</code> on <em>{item.entity}</em>
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    By {item.userName || 'System'} • {new Date(item.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Chip
                  label={item.entity}
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#e2e8f0' }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
