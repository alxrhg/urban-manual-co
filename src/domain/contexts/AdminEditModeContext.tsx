'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './AuthContext';

interface AdminEditModeContextValue {
  isEditMode: boolean;
  canUseEditMode: boolean;
  isReady: boolean;
  enableEditMode: () => void;
  disableEditMode: () => void;
  toggleEditMode: () => void;
}

const STORAGE_KEY = 'um-admin-edit-mode';

const AdminEditModeContext = createContext<AdminEditModeContextValue | undefined>(undefined);

export function AdminEditModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const canUseEditMode = Boolean(user && (user.app_metadata as Record<string, unknown> | null)?.role === 'admin');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!canUseEditMode) {
      window.localStorage.removeItem(STORAGE_KEY);
      setIsEditMode(false);
      setIsReady(true);
      return;
    }

    const persistedValue = window.localStorage.getItem(STORAGE_KEY);
    if (persistedValue === 'true') {
      setIsEditMode(true);
    }

    const editParam = searchParams?.get('edit');
    if (editParam && ['1', 'true', 'yes', 'on'].includes(editParam.toLowerCase())) {
      setIsEditMode(true);
      window.localStorage.setItem(STORAGE_KEY, 'true');

      if (router && pathname) {
        const params = new URLSearchParams(searchParams?.toString());
        params.delete('edit');
        const next = params.toString();
        router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
      }
    }

    setIsReady(true);
  }, [canUseEditMode, pathname, router, searchParams]);

  const enableEditMode = useCallback(() => {
    if (!canUseEditMode || typeof window === 'undefined') return;
    setIsEditMode(true);
    window.localStorage.setItem(STORAGE_KEY, 'true');
  }, [canUseEditMode]);

  const disableEditMode = useCallback(() => {
    if (typeof window === 'undefined') return;
    setIsEditMode(false);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const toggleEditMode = useCallback(() => {
    if (isEditMode) {
      disableEditMode();
    } else {
      enableEditMode();
    }
  }, [disableEditMode, enableEditMode, isEditMode]);

  const value = useMemo<AdminEditModeContextValue>(() => ({
    isEditMode: canUseEditMode ? isEditMode : false,
    canUseEditMode,
    isReady,
    enableEditMode,
    disableEditMode,
    toggleEditMode,
  }), [canUseEditMode, disableEditMode, enableEditMode, isEditMode, isReady, toggleEditMode]);

  return (
    <AdminEditModeContext.Provider value={value}>
      {children}
    </AdminEditModeContext.Provider>
  );
}

export function useAdminEditMode() {
  const context = useContext(AdminEditModeContext);
  if (!context) {
    throw new Error('useAdminEditMode must be used within an AdminEditModeProvider');
  }
  return context;
}
