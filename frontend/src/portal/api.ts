const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('abc_token');
}

export function setToken(token: string) {
  localStorage.setItem('abc_token', token);
}

export function clearToken() {
  localStorage.removeItem('abc_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ──────────────────────────────────────
export type LoginResponse = { token: string; user: User };
export type User = { id: number; userId: string; name: string; email: string; role: string };

export const api = {
  // Auth
  login: (userId: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ userId, password }) }),
  getMe: () => request<User>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),

  // Clients
  getClients: () => request<Client[]>('/clients'),
  getClient: (id: number) => request<ClientDetail>(`/clients/${id}`),
  createClient: (data: Partial<Client>) => request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: number, data: Partial<Client>) => request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id: number) => request<{ message: string }>(`/clients/${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: () => request<Project[]>('/projects'),
  getProject: (id: number) => request<ProjectDetail>(`/projects/${id}`),
  createProject: (data: Partial<Project>) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: number, data: Partial<Project>) => request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: number) => request<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),

  // Payments
  getPayments: () => request<Payment[]>('/payments'),
  createPayment: (data: Partial<Payment>) => request<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  updatePayment: (id: number, data: Partial<Payment>) => request<Payment>(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  sendReceipt: (id: number) => request<{ message: string }>(`/payments/${id}/send-receipt`, { method: 'POST' }),
  sendDueReminder: (clientId: number) => request<{ message: string }>(`/payments/send-due-reminder/${clientId}`, { method: 'POST' }),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),
  getDueAlerts: () => request<DueAlert[]>('/dashboard/due-alerts'),
  getRecentPayments: () => request<Payment[]>('/dashboard/recent-payments'),

  // Contact
  submitContact: (data: { name: string; phone: string; email: string; project_type: string; message: string }) =>
    request<{ id: number; message: string }>('/contact', { method: 'POST', body: JSON.stringify(data) }),
  getContactSubmissions: () => request<ContactSubmission[]>('/contact'),
  markContactRead: (id: number) => request<{ message: string }>(`/contact/${id}/read`, { method: 'PUT' }),
};

// ─── Types ─────────────────────────────────────
export type Client = {
  id: number; company_name: string; contact_person: string; phone: string; email: string;
  address: string; city: string; state: string; gstin: string; notes: string;
  total_projects?: number; total_project_amount?: number; total_paid?: number; total_due?: number;
  created_at?: string; updated_at?: string;
};

export type ClientDetail = Client & {
  projects: (Project & { due_amount: number })[]; payments: Payment[];
};

export type Project = {
  id: number; name: string; client_id: number; location: string; description: string;
  total_amount: number; status: 'Planning' | 'Ongoing' | 'Delayed' | 'Completed';
  progress: number; start_date: string; deadline: string;
  client_name?: string; client_email?: string; total_paid?: number; due_amount?: number;
  created_at?: string; updated_at?: string;
};

export type ProjectDetail = Project & { payments: Payment[]; client_contact?: string };

export type Payment = {
  id: number; project_id: number; client_id: number; amount: number;
  payment_date: string; payment_mode: string; reference_no: string; notes: string;
  email_sent: number; project_name?: string; client_name?: string; client_email?: string;
  created_at?: string;
};

export type DashboardStats = {
  totalClients: number; totalProjects: number; activeProjects: number; completedProjects: number;
  totalProjectAmount: number; totalPaid: number; totalDue: number; unreadContacts: number;
};

export type DueAlert = {
  id: number; company_name: string; contact_person: string; email: string; phone: string;
  total_project_amount: number; total_paid: number; due_amount: number;
};

export type ContactSubmission = {
  id: number; name: string; phone: string; email: string; project_type: string;
  message: string; is_read: number; created_at: string;
};
