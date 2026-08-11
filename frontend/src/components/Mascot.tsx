import React, { useState, useEffect } from 'react';

interface MascotProps {
  message?: string;
  size?: number;
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  dismissible?: boolean;
  onDismiss?: () => void;
  animate?: boolean;
}

export default function Mascot({ message, size = 80, position = 'bottom-right', dismissible, onDismiss, animate = true }: MascotProps) {
  const [visible, setVisible] = useState(!animate);
  const [bubbleVisible, setBubbleVisible] = useState(false);

  useEffect(() => {
    if (animate) {
      const t1 = setTimeout(() => setVisible(true), 100);
      const t2 = setTimeout(() => setBubbleVisible(true), 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [animate]);

  function handleDismiss() {
    setBubbleVisible(false);
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 200);
  }

  if (!visible && !message) return null;

  const wrapperStyle: React.CSSProperties = position === 'inline'
    ? { display: 'inline-flex', alignItems: 'flex-end', gap: 8 }
    : {
        position: 'fixed',
        bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 12px)',
        ...(position === 'bottom-left' ? { left: 16 } : { right: 16 }),
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        alignItems: position === 'bottom-left' ? 'flex-start' : 'flex-end',
        gap: 8,
        pointerEvents: 'none',
      };

  return (
    <div style={{
      ...wrapperStyle,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
      transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      {message && bubbleVisible && (
        <div style={{
          position: 'relative',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          maxWidth: 220,
          fontSize: 13,
          lineHeight: 1.4,
          color: 'var(--text)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          pointerEvents: 'auto',
          animation: 'fadeIn 0.2s ease',
        }}>
          {message}
          {dismissible && (
            <button onClick={handleDismiss} style={{
              position: 'absolute', top: -6, right: -6,
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          )}
          <div style={{
            position: 'absolute',
            bottom: -6,
            ...(position === 'bottom-left' ? { left: 20 } : { right: 20 }),
            width: 12, height: 12,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderTop: 'none',
            borderRight: 'none',
            transform: 'rotate(-45deg)',
          }} />
        </div>
      )}
      <img
        src="/fcad.svg"
        alt="ФКад"
        style={{
          width: size,
          height: size,
          pointerEvents: 'auto',
          filter: 'drop-shadow(0 2px 8px rgba(123,110,246,0.3))',
          animation: animate ? 'mascotBounce 2s ease-in-out infinite' : undefined,
        }}
      />
    </div>
  );
}
