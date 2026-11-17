'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { loginSuccess } from '@/store/slices/authSlice';
import { getToken, getUserData } from '@/services/api';
import type { AuthUser } from '@/services/api/authService';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Rehydrate auth state from client storage on mount
    const token = getToken();
    const user = getUserData<AuthUser>();
    if (token && user) {
      store.dispatch(loginSuccess({ user, token }));
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
