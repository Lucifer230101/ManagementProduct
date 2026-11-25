'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ManageAccounts as UsersIcon,
  Security as RolesIcon,
  Extension as ModulesIcon,
  Settings as SettingsIcon,
  History as AuditIcon,
  ReceiptLong as BillingIcon,
  Inventory2 as InventoryIcon,
  PersonPin as CustomersIcon,
  LocalShipping as SuppliersIcon,
  BarChart as ReportsIcon,
  Store as StoreIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';

import { AuthUser } from '@/services/api/authService';
import { clearAuthSession } from '@/services/api';
import { useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';

export const DRAWER_WIDTH = 260;

interface SidebarProps {
  user: AuthUser | null;
  shopName?: string;
  mobileOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
  phaseChip?: string;
}

export default function Sidebar({ user, shopName, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();

  const handleLogout = () => {
    clearAuthSession();
    dispatch(logout());
    router.push('/login');
  };

  const coreNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
    { label: 'Employees', href: '/employees', icon: <PeopleIcon /> },
    { label: 'Users', href: '/users', icon: <UsersIcon /> },
    { label: 'Roles & Access', href: '/roles', icon: <RolesIcon /> },
    { label: 'Module Settings', href: '/modules', icon: <ModulesIcon /> },
    { label: 'Shop Settings', href: '/settings', icon: <SettingsIcon /> },
    { label: 'Audit Logs', href: '/audit', icon: <AuditIcon /> },
  ];

  const futureNavItems: NavItem[] = [
    { label: 'Billing', href: '#', icon: <BillingIcon />, disabled: true, phaseChip: 'Phase 2' },
    { label: 'Inventory', href: '#', icon: <InventoryIcon />, disabled: true, phaseChip: 'Phase 3' },
    { label: 'Customers', href: '#', icon: <CustomersIcon />, disabled: true, phaseChip: 'Phase 2' },
    { label: 'Suppliers', href: '#', icon: <SuppliersIcon />, disabled: true, phaseChip: 'Phase 3' },
    { label: 'Reports', href: '#', icon: <ReportsIcon />, disabled: true, phaseChip: 'Phase 4' },
  ];

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
      }}
    >
      {/* Brand Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <StoreIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
            {shopName || user?.shopName || 'Shop Platform'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }} noWrap>
            Retail Billing & Inv.
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#f1f5f9' }} />

      {/* Nav links */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 2 }}>
        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            mb: 1,
            display: 'block',
            fontWeight: 700,
            color: '#94a3b8',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontSize: '0.7rem',
          }}
        >
          Phase 1: Core System
        </Typography>

        <List disablePadding>
          {coreNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  selected={isActive}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    px: 1.5,
                    bgcolor: isActive ? '#f1f5f9' : 'transparent',
                    color: isActive ? '#0f172a' : '#475569',
                    '&:hover': {
                      bgcolor: '#f8fafc',
                      color: '#0f172a',
                    },
                    '&.Mui-selected': {
                      bgcolor: '#e2e8f0',
                      '&:hover': { bgcolor: '#cbd5e1' },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: isActive ? '#0f172a' : '#64748b',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 500 }}>
                        {item.label}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 2, borderColor: '#f1f5f9' }} />

        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            mb: 1,
            display: 'block',
            fontWeight: 700,
            color: '#94a3b8',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontSize: '0.7rem',
          }}
        >
          Upcoming Modules
        </Typography>

        <List disablePadding>
          {futureNavItems.map((item) => (
            <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                disabled
                sx={{
                  borderRadius: 2,
                  py: 0.8,
                  px: 1.5,
                  opacity: 0.6,
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: '#94a3b8' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      {item.label}
                    </Typography>
                  }
                />
                {item.phaseChip && (
                  <Chip
                    label={item.phaseChip}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      bgcolor: '#f1f5f9',
                      color: '#64748b',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* User Footer */}
      <Divider sx={{ borderColor: '#f1f5f9' }} />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#f8fafc' }}>
        <Avatar
          sx={{
            width: 38,
            height: 38,
            bgcolor: '#3b82f6',
            color: '#ffffff',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {user?.name ? user.name[0].toUpperCase() : 'U'}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
            {user?.name || 'Shop Admin'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
            <Chip
              label={user?.role || 'Staff'}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 700,
                bgcolor: '#e2e8f0',
                color: '#334155',
              }}
            />
          </Box>
        </Box>
        <Tooltip title="Logout">
          <IconButton onClick={handleLogout} size="small" sx={{ color: '#64748b', '&:hover': { color: '#ef4444' } }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Persistent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid #e2e8f0',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
