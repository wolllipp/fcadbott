const BASE = 'https://fcadbot.site/api';

export async function apiRequest(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  auth: {
    verify: (initData: string, testUsername?: string) =>
      apiRequest('/auth/verify', { method: 'POST', body: JSON.stringify({ initData, testUsername }) }),
  },
  students: {
    list: (params: { sector?: string; role?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest(`/students?${q}`);
    },
  },
  exemptions: {
    list: (week?: string) => apiRequest(`/exemptions${week ? `?week=${week}` : ''}`),
    all: (week?: string) => apiRequest(`/exemptions/all${week ? `?week=${week}` : ''}`),
    alreadyExempted: (date: string) => apiRequest(`/exemptions/already-exempted?date=${date}`),
    pending: () => apiRequest('/exemptions/pending'),
    create: (data: any) => apiRequest('/exemptions', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: number, role: string) => apiRequest(`/exemptions/${id}/approve`, { method: 'POST', body: JSON.stringify({ role }) }),
    reject: (id: number, role: string, rejectReason?: string) => apiRequest(`/exemptions/${id}/reject`, { method: 'POST', body: JSON.stringify({ role, rejectReason }) }),
  },
  bonuses: {
    list: (params: { coordinatorId?: number; role?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest(`/bonuses?${q}`);
    },
    create: (data: any) => apiRequest('/bonuses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/bonuses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateByCoordinator: (id: number, data: any) => apiRequest(`/bonuses/coordinator/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    approve: (id: number, role: string) => apiRequest(`/bonuses/${id}/approve`, { method: 'POST', body: JSON.stringify({ role }) }),
    deferEntry: (entryId: number, data: any) => apiRequest(`/bonuses/entry/${entryId}/defer`, { method: 'POST', body: JSON.stringify(data) }),
    addEntry: (id: number, data: any) => apiRequest(`/bonuses/${id}/add-entry`, { method: 'POST', body: JSON.stringify(data) }),
  },
};
