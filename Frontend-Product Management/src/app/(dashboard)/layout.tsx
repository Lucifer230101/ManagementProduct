'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import Sidebar, { DRAWER_WIDTH } from '@/components/navigation/Sidebar';
import TopBar from '@/components/navigation/TopBar';
import { getToken, getUserData } from '@/services/api';
import { authService, AuthUser } from '@/services/api/authService';
import { shopService } from '@/services/api/shopService';
import { Shop } from '@/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const cachedUser = getUserData<AuthUser>();
    if (cachedUser) {
      setUser(cachedUser);
    }

    // Refresh profile and shop in parallel
    Promise.allSettled([authService.getMe(), shopService.getCurrentShop()])
      .then(([meRes, shopRes]) => {
        if (meRes.status === 'fulfilled' && meRes.value?.data) {
          setUser(meRes.value.data);
        }
        if (shopRes.status === 'fulfilled' && shopRes.value?.data) {
          setShop(shopRes.value.data);
        }
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, [router]);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  if (checkingAuth) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f8fafc',
          gap: 2,
        }}
      >
        <CircularProgress size={36} sx={{ color: '#3b82f6' }} />
        <Typography variant="body2" color="text.secondary">
          Initializing Shop Session…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <Sidebar
        user={user}
        shopName={shop?.name || user?.shopName}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <TopBar
          user={user}
          shopName={shop?.name || user?.shopName}
          currency={shop?.currency}
          onDrawerToggle={handleDrawerToggle}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            ml: { md: `${DRAWER_WIDTH}px` },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
