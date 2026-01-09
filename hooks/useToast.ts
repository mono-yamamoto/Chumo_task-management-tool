'use client';

import { useCallback } from 'react';
import { create } from 'zustand';
import { DEFAULT_TOAST_DURATION_MS } from '@/constants/timer';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (_toast: Omit<Toast, 'id'>) => void;
  removeToast: (_id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    // デフォルトで指定時間後に自動削除
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, toast.duration || DEFAULT_TOAST_DURATION_MS);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

/**
 * トースト通知を表示するカスタムフック
 * window.alertの代替として使用し、より良いUXを提供する
 */
export function useToast() {
  const addToast = useToastStore((state) => state.addToast);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      addToast({ message, type, duration });
    },
    [addToast]
  );

  const success = useCallback(
    (message: string, duration?: number) => showToast(message, 'success', duration),
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => showToast(message, 'error', duration),
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => showToast(message, 'warning', duration),
    [showToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => showToast(message, 'info', duration),
    [showToast]
  );

  return {
    showToast,
    success,
    error,
    warning,
    info,
  };
}
