const BASE = '/api';

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
    studentLogin: (telegramUsername: string) =>
      apiRequest('/auth/student-login', { method: 'POST', body: JSON.stringify({ telegramUsername }) }),
    studentRegister: (data: { fullName: string; studentCardNumber: string; telegramUsername: string; groupNumber?: string; budgetStatus?: string }) =>
      apiRequest('/auth/student-register', { method: 'POST', body: JSON.stringify(data) }),
    updateProfile: (userId: number, role: string, photoUrl?: string) =>
      apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify({ userId, role, photoUrl }) }),
  },
  students: {
    list: (params: { sector?: string; role?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest(`/students?${q}`);
    },
  },
  exemptions: {
    list: (week?: string, weekOffset?: number) => apiRequest(`/exemptions${week ? `?week=${week}` : ''}${weekOffset ? `&weekOffset=${weekOffset}` : ''}`),
    all: (week?: string, weekOffset?: number) => apiRequest(`/exemptions/all${week ? `?week=${week}` : ''}${weekOffset ? `&weekOffset=${weekOffset}` : ''}`),
    alreadyExempted: (date: string) => apiRequest(`/exemptions/already-exempted?date=${date}`),
    byStudent: (params: { studentId?: number; fullName?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest(`/exemptions/by-student?${q}`);
    },
    pending: () => apiRequest('/exemptions/pending'),
    create: (data: any) => apiRequest('/exemptions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiRequest(`/exemptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => apiRequest(`/exemptions/${id}`, { method: 'DELETE' }),
    toggleExhibited: (id: number, role: string) => apiRequest(`/exemptions/${id}/toggle-exhibited`, { method: 'POST', body: JSON.stringify({ role }) }),
    togglePrinted: (id: number, role: string) => apiRequest(`/exemptions/${id}/toggle-printed`, { method: 'POST', body: JSON.stringify({ role }) }),
    nonExhibited: () => apiRequest('/exemptions/non-exhibited'),
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
  sectors: {
    list: () => apiRequest('/sectors'),
    my: (coordinatorId: number) => apiRequest(`/sectors/my?coordinatorId=${coordinatorId}`),
    create: (data: { coordinatorId: number; name: string }) => apiRequest('/sectors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { name: string }) => apiRequest(`/sectors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => apiRequest(`/sectors/${id}`, { method: 'DELETE' }),
    addMember: (sectorId: number, data: { fullName: string; groupNumber: string; studentCardNumber: string }) => apiRequest(`/sectors/${sectorId}/members`, { method: 'POST', body: JSON.stringify(data) }),
    removeMember: (sectorId: number, memberId: number) => apiRequest(`/sectors/${sectorId}/members/${memberId}`, { method: 'DELETE' }),
  },
  events: {
    list: () => apiRequest('/events'),
    byStudent: (fullName: string) => apiRequest(`/events/by-student?fullName=${encodeURIComponent(fullName)}`),
    create: (data: { name: string; eventDate: string; description?: string; coordinatorId: number; role?: string; location?: string; status?: string; pointsForAttendance?: number; maxParticipants?: number; audience?: string; facultyOnly?: boolean; requireApproval?: boolean; scannerCoordinatorId?: number; scannerCoordinatorIds?: number[] }) => apiRequest('/events', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { name?: string; eventDate?: string; description?: string; coordinatorId: number; role?: string; location?: string; status?: string; pointsForAttendance?: number; maxParticipants?: number; audience?: string; facultyOnly?: boolean; requireApproval?: boolean; scannerCoordinatorId?: number | null; scannerCoordinatorIds?: number[] }) => apiRequest(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number, data: { coordinatorId: number; role?: string }) => apiRequest(`/events/${id}`, { method: 'DELETE', body: JSON.stringify(data) }),
    addParticipant: (eventId: number, data: { fullName: string; groupNumber: string; attended?: boolean; role?: string }) => apiRequest(`/events/${eventId}/participants`, { method: 'POST', body: JSON.stringify(data) }),
    updateParticipant: (eventId: number, participantId: number, data: { fullName?: string; groupNumber?: string; attended?: boolean; role?: string }) => apiRequest(`/events/${eventId}/participants/${participantId}`, { method: 'PUT', body: JSON.stringify(data) }),
    removeParticipant: (eventId: number, participantId: number) => apiRequest(`/events/${eventId}/participants/${participantId}`, { method: 'DELETE' }),
    generateExemption: (eventId: number, data: { coordinatorId: number; exemptionDate: string; reason?: string }) => apiRequest(`/events/${eventId}/generate-exemption`, { method: 'POST', body: JSON.stringify(data) }),
    finalizeAttendance: (eventId: number, data: { coordinatorId: number; role?: string }) => apiRequest(`/events/${eventId}/finalize-attendance`, { method: 'POST', body: JSON.stringify(data) }),
    coordinators: () => apiRequest('/events/coordinators'),
  },
  council: {
    students: {
      list: () => apiRequest('/council/students'),
      create: (data: { creatorId: number; fullName: string; groupNumber: string; studentCardNumber: string; budgetStatus?: string; sectors?: string[] }) => apiRequest('/council/students', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: number, data: { creatorId: number; fullName: string; groupNumber: string; studentCardNumber: string; budgetStatus?: string; sectors?: string[] }) => apiRequest(`/council/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      remove: (id: number, creatorId: number) => apiRequest(`/council/students/${id}`, { method: 'DELETE', body: JSON.stringify({ creatorId }) }),
    },
    coordinators: {
      list: () => apiRequest('/council/coordinators'),
      create: (data: { creatorId: number; fullName: string; telegramUsername: string; role: string; sector?: string }) => apiRequest('/council/coordinators', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: number, data: { creatorId: number; fullName: string; telegramUsername: string; role: string; sector?: string }) => apiRequest(`/council/coordinators/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      remove: (id: number, creatorId: number) => apiRequest(`/council/coordinators/${id}`, { method: 'DELETE', body: JSON.stringify({ creatorId }) }),
    },
    sectorOverview: () => apiRequest('/council/sector-overview'),
    assignSector: (studentId: number, creatorId: number, sector: string) => apiRequest(`/council/students/${studentId}/sector`, { method: 'POST', body: JSON.stringify({ creatorId, sector }) }),
    removeSector: (studentId: number, creatorId: number, sector: string) => apiRequest(`/council/students/${studentId}/sector`, { method: 'DELETE', body: JSON.stringify({ creatorId, sector }) }),
  },
  petitions: {
    list: (params: { studentId?: number; role?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest(`/petitions?${q}`);
    },
    create: (data: { studentId: number; type: string }) =>
      apiRequest('/petitions', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: number, role: string, coordinatorId?: number) =>
      apiRequest(`/petitions/${id}/approve`, { method: 'POST', body: JSON.stringify({ role, coordinatorId }) }),
    reject: (id: number, role: string, reviewComment?: string, coordinatorId?: number) =>
      apiRequest(`/petitions/${id}/reject`, { method: 'POST', body: JSON.stringify({ role, reviewComment, coordinatorId }) }),
    downloadUrl: (id: number) => `/api/petitions/${id}/download`,
  },
  applications: {
    list: (params: { eventId?: number; studentId?: number; status?: string; coordinatorId?: number; role?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest(`/applications?${q}`);
    },
    create: (data: { eventId: number; studentId: number; participationType?: string; studentComment?: string }) =>
      apiRequest('/applications', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: number, coordinatorId?: number) =>
      apiRequest(`/applications/${id}/approve`, { method: 'PUT', body: JSON.stringify({ coordinatorId }) }),
    reject: (id: number, coordinatorComment?: string) =>
      apiRequest(`/applications/${id}/reject`, { method: 'PUT', body: JSON.stringify({ coordinatorComment }) }),
    cancel: (id: number) =>
      apiRequest(`/applications/${id}/cancel`, { method: 'PUT' }),
    bulkApprove: (ids: number[], coordinatorId?: number) =>
      apiRequest('/applications/bulk-approve', { method: 'PUT', body: JSON.stringify({ ids, coordinatorId }) }),
    bulkReject: (ids: number[], coordinatorComment?: string) =>
      apiRequest('/applications/bulk-reject', { method: 'PUT', body: JSON.stringify({ ids, coordinatorComment }) }),
  },
  points: {
    list: (params: { studentId?: number; eventId?: number; type?: string; status?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest(`/points?${q}`);
    },
    balance: (studentId: number) => apiRequest(`/points/balance/${studentId}`),
    create: (data: { studentId: number; points: number; type: string; eventId?: number; reason: string; authorId?: number }) =>
      apiRequest('/points', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: number, reason?: string) =>
      apiRequest(`/points/${id}/cancel`, { method: 'PUT', body: JSON.stringify({ reason }) }),
    eventParticipants: (eventId: number) => apiRequest(`/points/event/${eventId}`),
    bulk: (data: { eventId: number; authorId: number; awards: { studentId: number; points: number; type: string; reason: string }[] }) =>
      apiRequest('/points/bulk', { method: 'POST', body: JSON.stringify(data) }),
  },
  admin: {
    stats: (coordinatorId?: number) => apiRequest(`/admin/stats${coordinatorId ? `?coordinatorId=${coordinatorId}` : ''}`),
    topStudents: (limit?: number, coordinatorId?: number) => apiRequest(`/admin/top-students?${new URLSearchParams({ ...(limit ? { limit: String(limit) } : {}), ...(coordinatorId ? { coordinatorId: String(coordinatorId) } : {}) }).toString()}`),
    eventStats: () => apiRequest('/admin/event-stats'),
    recentActivity: (limit?: number, coordinatorId?: number) => apiRequest(`/admin/recent-activity?${new URLSearchParams({ ...(limit ? { limit: String(limit) } : {}), ...(coordinatorId ? { coordinatorId: String(coordinatorId) } : {}) }).toString()}`),
  },
  attendance: {
    getQr: (applicationId: number) => apiRequest(`/attendance/qr/${applicationId}`),
    scan: (data: { qrToken: string; coordinatorId: number; type?: string }) =>
      apiRequest('/attendance/scan', { method: 'POST', body: JSON.stringify(data) }),
    eventAttendees: (eventId: number) => apiRequest(`/attendance/event/${eventId}/attendees`),
    manualCheck: (data: { applicationId: number; coordinatorId: number; type: string }) =>
      apiRequest('/attendance/manual-check', { method: 'POST', body: JSON.stringify(data) }),
  },
};
