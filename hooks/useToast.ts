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
  timers: Map<string, NodeJS.Timeout>;
  addToast: (_toast: Omit<Toast, 'id'>) => void;
  removeToast: (_id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  timers: new Map(),
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;

    // デフォルトで指定時間後に自動削除
    const timerId = setTimeout(() => {
      get().removeToast(id);
    }, toast.duration || DEFAULT_TOAST_DURATION_MS);

    set((state) => {
      const newTimers = new Map(state.timers);
      newTimers.set(id, timerId);
      return {
        toasts: [...state.toasts, { ...toast, id }],
        timers: newTimers,
      };
    });
  },
  removeToast: (id) => {
    const timerId = get().timers.get(id);
    if (timerId) {
      clearTimeout(timerId);
    }

    set((state) => {
      const newTimers = new Map(state.timers);
      newTimers.delete(id);
      return {
        toasts: state.toasts.filter((t) => t.id !== id),
        timers: newTimers,
      };
    });
  },
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
