import React from 'react';

export default function AccessDenied() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center',
      gap: 16,
    }}>
      <div style={{ fontSize: 56 }}>🔒</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Доступ запрещён</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          Вы не являетесь членом Студенческого совета ФКП БГУИР.<br />
          Обратитесь к председателю для получения доступа.
        </div>
      </div>
    </div>
  );
}
