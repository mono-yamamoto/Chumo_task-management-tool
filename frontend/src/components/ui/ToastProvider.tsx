import { type ReactNode, useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { IconButton } from './IconButton';
import { ToastContext, type Toast, type ToastVariant } from '../../hooks/useToast';

const DISMISS_MS = 5000;

const variantStyles: Record<ToastVariant, string> = {
  error: 'bg-error-bg text-error-text border-red-200',
  success: 'bg-success-bg text-success-text border-green-200',
  warning: 'bg-warning-bg text-warning-text border-amber-200',
  info: 'bg-info-bg text-info-text border-blue-200',
};

const variantIcons: Record<ToastVariant, ReactNode> = {
  error: <AlertCircle size={18} />,
  success: <CheckCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    const timer = setTimeout(() => {
      timersRef.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, DISMISS_MS);
    timersRef.current.set(id, timer);
  }, []);

  return (
    <ToastContext value={{ addToast, removeToast }}>
      {children}

      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${variantStyles[toast.variant]}`}
              style={{ minWidth: 280, maxWidth: 420 }}
            >
              <span className="shrink-0">{variantIcons[toast.variant]}</span>
              <span className="flex-1 text-sm">{toast.message}</span>
              <IconButton
                size="sm"
                aria-label="閉じる"
                onPress={() => removeToast(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100"
              >
                <X size={16} />
              </IconButton>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}
