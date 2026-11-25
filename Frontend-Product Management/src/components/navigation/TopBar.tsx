'use client';

import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Chip,
  Breadcrumbs,
} from '@mui/material';
import { Menu as MenuIcon, Storefront as StorefrontIcon } from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import { DRAWER_WIDTH } from './Sidebar';
import { AuthUser } from '@/services/api/authService';

interface TopBarProps {
  user: AuthUser | null;
  shopName?: string;
  currency?: string;
  onDrawerToggle: () => void;
}

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/employees': 'Employee Management',
  '/users': 'User Accounts',
  '/roles': 'Roles & Permissions',
  '/modules': 'Module Configuration',
  '/settings': 'Shop Settings',
  '/audit': 'Audit Logs',
};

export default function TopBar({ user, shopName, currency, onDrawerToggle }: TopBarProps) {
  const pathname = usePathname();
  const title = routeTitles[pathname] || 'Shop Billing & Management';

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { md: `${DRAWER_WIDTH}px` },
        bgcolor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        color: '#0f172a',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 }, minHeight: 64 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onDrawerToggle}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              {title}
            </Typography>
            <Breadcrumbs aria-label="breadcrumb" sx={{ fontSize: '0.75rem', color: '#64748b' }}>
              <span>Phase 1</span>
              <span>{title}</span>
            </Breadcrumbs>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {shopName && (
            <Chip
              icon={<StorefrontIcon fontSize="small" />}
              label={`${shopName} (${currency || 'INR'})`}
              variant="outlined"
              size="small"
              sx={{
                fontWeight: 600,
                borderColor: '#cbd5e1',
                color: '#334155',
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            />
          )}
          {user?.role && (
            <Chip
              label={user.role}
              size="small"
              sx={{
                bgcolor: '#e2e8f0',
                color: '#1e293b',
                fontWeight: 700,
              }}
            />
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
