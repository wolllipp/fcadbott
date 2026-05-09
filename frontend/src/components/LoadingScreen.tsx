import React from 'react';

export default function LoadingScreen() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 18,
        background: 'var(--accent-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 32,
      }}>◈</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 6 }}>СС ФКП</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Загрузка...</div>
      </div>
      <div style={{
        width: 40,
        height: 3,
        borderRadius: 2,
        background: 'var(--surface)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: 'var(--accent)',
          animation: 'loading 1.2s ease-in-out infinite',
          borderRadius: 2,
        }} />
      </div>
      <style>{`
        @keyframes loading {
          0% { width: 0%; margin-left: 0; }
          50% { width: 100%; margin-left: 0; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
