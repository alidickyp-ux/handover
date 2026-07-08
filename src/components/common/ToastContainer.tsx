'use client';

import { useState, useEffect } from 'react';
import Toast from './Toast';

interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { message, type, duration } = customEvent.detail;
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    };

    window.addEventListener('showToast' as any, handleToast);

    return () => {
      window.removeEventListener('showToast' as any, handleToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

// Helper function
export const showToast = (
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
  duration?: number
) => {
  const event = new CustomEvent('showToast', {
    detail: { message, type, duration },
  });
  window.dispatchEvent(event);
};