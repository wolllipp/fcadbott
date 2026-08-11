import React from 'react';

const s: React.CSSProperties = { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconCheck(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><path d="M20 6L9 17l-5-5" /></svg>;
}

export function IconX(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><path d="M18 6L6 18M6 6l12 12" /></svg>;
}

export function IconCalendar(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}

export function IconMapPin(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>;
}

export function IconUsers(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
}

export function IconStar(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>;
}

export function IconQrCode(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" /><rect x="14" y="14" width="4" height="4" /><path d="M18 14v8M22 18h-8" /></svg>;
}

export function IconFileText(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>;
}

export function IconPlus(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><path d="M12 5v14M5 12h14" /></svg>;
}

export function IconCamera(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>;
}

export function IconAward(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><circle cx="12" cy="8" r="7" /><polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88" /></svg>;
}

export function IconSend(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" /></svg>;
}

export function IconDownload(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}

export function IconLogOut(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}

export function IconAlertCircle(props: { size?: number; color?: string; style?: React.CSSProperties }) {
  return <svg {...props} viewBox="0 0 24 24" style={{ ...s, width: props.size || 16, height: props.size || 16, color: props.color || 'currentColor', ...props.style }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}
