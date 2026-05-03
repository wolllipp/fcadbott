import React, { useEffect, useState } from 'react';

interface Props {
  title: string;
  subtitle: string;
  onDone: () => void;
}

export default function SuccessScreen({ title, subtitle, onDone }: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      textAlign: 'center',
      gap: 20,
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'var(--success-dim)',
        border: '2px solid var(--success)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: visible ? 'checkBounce 0.5s cubic-bezier(0.68,-0.55,0.27,1.55) forwards' : 'none',
        opacity: 0,
      }}>
        <svg width="32" height="26" viewBox="0 0 32 26" fill="none">
          <path d="M2 13L11 22.5L30 2" stroke="#4ade80" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{title}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{subtitle}</div>
      </div>
      <button className="btn btn-primary" style={{ maxWidth: 240 }} onClick={onDone}>
        Готово
      </button>
      <style>{`
        @keyframes checkBounce {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
