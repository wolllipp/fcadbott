import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

interface Toast {
  id: number;
  message: string;
  type?: 'success' | 'info' | 'warning';
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useMascotToast() {
  return useContext(ToastContext);
}

export function MascotToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let nextId = 0;

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  function dismiss(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 100px)',
        left: 16, right: 16,
        zIndex: 950,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map((toast, i) => (
          <div
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--bg-card)',
              border: `1px solid ${toast.type === 'success' ? 'var(--success)' : toast.type === 'warning' ? 'var(--warning)' : 'var(--accent)'}`,
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              animation: 'toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
            }}
          >
            <img src="/fcad.svg" alt="" style={{ width: 36, height: 36, flexShrink: 0 }} />
            <span style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--text)' }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
