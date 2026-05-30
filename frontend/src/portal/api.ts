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

async function download(path: string): Promise<{ blob: Blob; filename: string }> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Download failed: ${res.status}`);
  }

  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  return {
    blob: await res.blob(),
    filename: match?.[1] || 'rg_infra_backup.xls',
  };
}

// ─── Auth ──────────────────────────────────────
export type LoginResponse = { token: string; user: User };
export type User = { id: number; userId: string; name: string; email: string; role: string };

export const api = {
  // Auth
  login: (userId: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ userId, password }) }),
  forgotPassword: (userIdOrEmail: string) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ userIdOrEmail }) }),
  getMe: () => request<User>('/auth/me'),
  updateProfile: (data: { name: string; email: string }) =>
    request<User>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),

  // Clients
  getClients: () => request<Client[]>('/clients'),
  getClientHistory: () => request<ClientHistoryItem[]>('/clients/history'),
  getClient: (id: number) => request<ClientDetail>(`/clients/${id}`),
  createClient: (data: Partial<Client>) => request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: number, data: Partial<Client>) => request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id: number) => request<{ message: string }>(`/clients/${id}`, { method: 'DELETE' }),

  // Properties
  getProperties: () => request<Property[]>('/properties'),
  createProperty: (data: Partial<Property>) => request<Property>('/properties', { method: 'POST', body: JSON.stringify(data) }),
  updateProperty: (id: number, data: Partial<Property>) => request<Property>(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProperty: (id: number) => request<{ message: string }>(`/properties/${id}`, { method: 'DELETE' }),

  // Projects (Legacy)
  getProjects: () => request<Project[]>('/projects'),
  getProject: (id: number) => request<ProjectDetail>(`/projects/${id}`),
  createProject: (data: Partial<Project>) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: number, data: Partial<Project>) => request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: number) => request<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),

  // Payments
  getPayments: () => request<Payment[]>('/payments'),
  createPayment: (data: Partial<Payment>) => request<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  updatePayment: (id: number, data: Partial<Payment>) => request<Payment>(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePayment: (id: number) => request<{ message: string }>(`/payments/${id}`, { method: 'DELETE' }),
  sendReceipt: (id: number) => request<{ message: string }>(`/payments/${id}/send-receipt`, { method: 'POST' }),
  generateInvoice: (paymentId: number) =>
    request<PaymentInvoice>(`/payments/${paymentId}/invoices`, { method: 'POST' }),
  getPaymentInvoices: (paymentId: number) =>
    request<PaymentInvoice[]>(`/payments/${paymentId}/invoices`),
  sendDueReminder: (clientId: number, data: { percentage_paid: number; next_percentage: number }) =>
    request<{ message: string }>('/demand-letters/send-due-reminder', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, ...data }),
    }),
  sendEnhancedReminder: (clientId: number, attachDemandLetter: boolean) =>
    request<{ message: string; attach_demand_letter: boolean; demand_letter_id: number | null }>('/demand-letters/send-enhanced-reminder', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, attach_demand_letter: attachDemandLetter }),
    }),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),
  getDueAlerts: () => request<DueAlert[]>('/dashboard/due-alerts'),
  getRecentPayments: () => request<Payment[]>('/dashboard/recent-payments'),

  // Analytics
  getCollectionTrend: () => request<CollectionTrendItem[]>('/dashboard/analytics/collection-trend'),
  getApartmentSales: () => request<ApartmentSalesItem[]>('/dashboard/analytics/apartment-sales'),
  getDueVsPaid: (apartmentId?: number) => request<DueVsPaidItem[]>(`/dashboard/analytics/due-vs-paid${apartmentId ? `?apartment_id=${apartmentId}` : ''}`),
  getPaymentHistory: (filters?: { client_id?: number; apartment_id?: number; from_date?: string; to_date?: string }) => {
    const params = new URLSearchParams();
    if (filters?.client_id) params.set('client_id', String(filters.client_id));
    if (filters?.apartment_id) params.set('apartment_id', String(filters.apartment_id));
    if (filters?.from_date) params.set('from_date', filters.from_date);
    if (filters?.to_date) params.set('to_date', filters.to_date);
    const qs = params.toString();
    return request<AnalyticsPayment[]>(`/dashboard/analytics/payment-history${qs ? `?${qs}` : ''}`);
  },
  getDueList: (apartmentId?: number) => request<DueListItem[]>(`/dashboard/analytics/due-list${apartmentId ? `?apartment_id=${apartmentId}` : ''}`),
  getStageProgress: () => request<StageProgressItem[]>('/dashboard/analytics/stage-progress'),

  // Contact
  submitContact: (data: { name: string; phone: string; email: string; project_type: string; message: string }) =>
    request<{ id: number; message: string }>('/contact', { method: 'POST', body: JSON.stringify(data) }),
  getContactSubmissions: () => request<ContactSubmission[]>('/contact'),
  markContactRead: (id: number) => request<{ message: string }>(`/contact/${id}/read`, { method: 'PUT' }),

  // Apartments
  getApartments: () => request<Apartment[]>('/apartments'),
  createApartment: (data: Partial<Apartment> & { name: string }) => request<Apartment>('/apartments', { method: 'POST', body: JSON.stringify(data) }),
  updateApartment: (id: number, data: Partial<Apartment> & { name?: string }) => request<Apartment>(`/apartments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteApartment: (id: number) => request<{ message: string }>(`/apartments/${id}`, { method: 'DELETE' }),

  // Flats
  getFlats: () => request<Flat[]>('/flats'),
  createFlat: (data: Partial<Flat>) => request<Flat>('/flats', { method: 'POST', body: JSON.stringify(data) }),
  updateFlat: (id: number, data: Partial<Flat>) => request<Flat>(`/flats/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFlat: (id: number) => request<{ message: string }>(`/flats/${id}`, { method: 'DELETE' }),

  // Bulk Upload — Flats
  parseHeaders: async (file: File): Promise<ParseHeadersResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/flats/parse-headers`, { method: 'POST', headers, body: formData });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as { error?: string }).error || 'Parse failed'); }
    return res.json();
  },
  bulkUploadFlatDetails: async (propertyId: number, file: File, parkingSlots?: string, columnMappings?: Record<string, Record<string, string>>): Promise<BulkUploadResult> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('property_id', propertyId.toString())
    if (parkingSlots) formData.append('parking_slots', parkingSlots)
    if (columnMappings) formData.append('column_mappings', JSON.stringify(columnMappings));
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/flats/bulk-upload/flat-details`, { method: 'POST', headers, body: formData });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as { error?: string }).error || 'Upload failed'); }
    return res.json();
  },
  bulkUploadBookingStatus: async (propertyId: number, file: File, columnMappings?: Record<string, Record<string, string>>): Promise<BulkUploadBookingResult> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('property_id', propertyId.toString())
    if (columnMappings) formData.append('column_mappings', JSON.stringify(columnMappings))
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/flats/bulk-upload/booking-status`, { method: 'POST', headers, body: formData });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as { error?: string }).error || 'Upload failed'); }
    return res.json();
  },
  downloadFlatTemplate: async (apartmentId: number): Promise<{ blob: Blob; filename: string }> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/flats/download-template/${apartmentId}`, { headers });
    if (!res.ok) throw new Error('Download failed');
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    return { blob: await res.blob(), filename: match?.[1] || 'flat_template.xlsx' };
  },

  // Demand Letters
  generateDemandLetter: (data: { client_id: number; paid_amount: number; bank_details?: Record<string, string>; send_email?: boolean; send_whatsapp?: boolean }) =>
    request<DemandLetterResponse>('/demand-letters/generate', { method: 'POST', body: JSON.stringify(data) }),
  getDemandLetters: () => request<DemandLetter[]>('/demand-letters'),
  getClientDemandLetters: (clientId: number) => request<DemandLetter[]>(`/demand-letters/client/${clientId}`),
  deleteDemandLetter: (id: number) => request<{ message: string }>(`/demand-letters/${id}`, { method: 'DELETE' }),

  // WhatsApp
  whatsappPaymentDone: (data: { client_id: number; amount_paid: number }) =>
    request<{ message: string; whatsapp_url: string }>('/demand-letters/whatsapp-payment-done', { method: 'POST', body: JSON.stringify(data) }),

  // Communication History
  getCommunications: () => request<CommunicationLog[]>('/communications'),
  getClientCommunications: (clientId: number) => request<CommunicationLog[]>(`/communications/client/${clientId}`),
  getCommunicationStats: () => request<CommunicationStats>('/communications/stats'),
  deleteCommunication: (id: number) => request<{ message: string }>(`/communications/${id}`, { method: 'DELETE' }),

  // Payment Stages (admin)
  getPaymentStages: () => request<PaymentStage[]>('/payment-stages'),
  createPaymentStage: (data: { stage_name: string; percentage: number; stage_order?: number }) =>
    request<PaymentStage>('/payment-stages', { method: 'POST', body: JSON.stringify(data) }),
  updatePaymentStage: (id: number, data: { stage_name: string; percentage: number; stage_order: number }) =>
    request<PaymentStage>(`/payment-stages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePaymentStage: (id: number) => request<{ message: string }>(`/payment-stages/${id}`, { method: 'DELETE' }),
  bulkSetStages: (stages: { stage_name: string; percentage: number; stage_order: number }[]) =>
    request<{ message: string; stages: PaymentStage[] }>('/payment-stages/bulk', { method: 'POST', body: JSON.stringify({ stages }) }),

  // Payment Schedules
  generateSchedule: (clientId: number) =>
    request<{ message: string; schedules: PaymentSchedule[]; dues: DueInfo }>(`/payment-schedules/generate/${clientId}`, { method: 'POST' }),
  getClientSchedule: (clientId: number) => request<PaymentSchedule[]>(`/payment-schedules/client/${clientId}`),
  addClientScheduleStage: (clientId: number, data: { percentage: number; due_date?: string; stage_name?: string }) => 
    request<{ message: string }>(`/payment-schedules/client/${clientId}`, { method: 'POST', body: JSON.stringify(data) }),
  setScheduleDueDate: (id: number, due_date: string) =>
    request<PaymentSchedule>(`/payment-schedules/${id}/due-date`, { method: 'PUT', body: JSON.stringify({ due_date }) }),
  setSchedulePercentage: (id: number, percentage: number) =>
    request<{ message: string }>(`/payment-schedules/${id}/percentage`, { method: 'PUT', body: JSON.stringify({ percentage }) }),
  deleteSchedule: (id: number) =>
    request<{ message: string }>(`/payment-schedules/${id}`, { method: 'DELETE' }),

  // Client Payments (percentage-based)
  addClientPayment: (data: { client_id: number; amount?: number; amount_includes_gst?: boolean; payment_percentage?: number; payment_date?: string; payment_mode?: string; reference_no?: string; notes?: string }) =>
    request<{ message: string; payment_id: number; dues: DueInfo; schedules: PaymentSchedule[] }>('/payment-schedules/pay', { method: 'POST', body: JSON.stringify(data) }),
  getClientPaymentHistory: (clientId: number) => request<ClientPayment[]>(`/payment-schedules/payments/${clientId}`),
  deleteClientPayment: (id: number) => request<{ message: string }>(`/payment-schedules/payment/${id}`, { method: 'DELETE' }),

  // Dues
  getClientDues: (clientId: number) => request<DueInfo & { schedules: PaymentSchedule[] }>(`/payment-schedules/dues/${clientId}`),
  getPendingDues: () => request<PendingDue[]>('/payment-schedules/pending'),

  // Reminders
  getReminderLogs: () => request<ReminderLog[]>('/reminders'),
  getDueReminders: (filters?: { date?: string; status?: string; client?: string; min_due?: string; max_due?: string }) => {
    const params = new URLSearchParams();
    if (filters?.date) params.set('date', filters.date);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.client) params.set('client', filters.client);
    if (filters?.min_due) params.set('min_due', filters.min_due);
    if (filters?.max_due) params.set('max_due', filters.max_due);
    const qs = params.toString();
    return request<DueReminder[]>(`/reminders/due${qs ? `?${qs}` : ''}`);
  },
  sendBulkDueEmails: (data: { due_date?: string; reminder_ids?: number[]; subject?: string; html_template?: string }) =>
    request<{ message: string; sent: number; failed: number; skipped: number; total: number }>('/reminders/bulk-email', { method: 'POST', body: JSON.stringify(data) }),
  previewDueReminderEmail: (id: number) => request<{ subject: string; html: string }>(`/reminders/email-preview/${id}`),
  exportDueReminderReport: (format: 'xlsx' | 'pdf' = 'xlsx') => download(`/reminders/export?format=${format}`),
  getClientReminderLogs: (clientId: number) => request<ReminderLog[]>(`/reminders/client/${clientId}`),
  getReminderStats: () => request<ReminderStats>('/reminders/stats'),
  triggerReminders: () => request<{ message: string; processed: number; sent: number; skipped: number; failed: number }>('/reminders/trigger', { method: 'POST' }),
  deleteReminderLog: (id: number) => request<{ message: string }>(`/reminders/${id}`, { method: 'DELETE' }),

  // Backups
  getBackupSummary: () => request<BackupSummary>('/backups/summary'),
  downloadBackup: (filters: BackupExportFilters) => {
    const params = new URLSearchParams();
    params.set('format', filters.format);
    params.set('dataset', filters.dataset);
    if (filters.from_date) params.set('from_date', filters.from_date);
    if (filters.to_date) params.set('to_date', filters.to_date);
    return download(`/backups/export?${params.toString()}`);
  },

  // Work Projection
  getWorkProjectionClients: () => request<WorkProjectionClient[]>('/work-projection/all'),
  getWorkProjectionMilestones: () => request<MilestoneDef[]>('/work-projection/milestones'),
  getWorkProjection: (clientId: number) => request<WorkProjection[]>(`/work-projection/${clientId}`),
  getWorkProjectionSummary: (clientId: number) => request<WorkProjectionSummary>(`/work-projection/summary/${clientId}`),
  createWorkProjection: async (data: { client_id: number; milestone_name: string; completion_date?: string; due_date?: string; notes?: string; proof_image?: File }): Promise<{ message: string; projection: WorkProjection }> => {
    const formData = new FormData();
    formData.append('client_id', String(data.client_id));
    formData.append('milestone_name', data.milestone_name);
    if (data.completion_date) formData.append('completion_date', data.completion_date);
    if (data.due_date) formData.append('due_date', data.due_date);
    if (data.notes) formData.append('notes', data.notes);
    if (data.proof_image) formData.append('proof_image', data.proof_image);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/work-projection`, { method: 'POST', headers, body: formData });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as { error?: string }).error || 'Failed to save'); }
    return res.json();
  },
  updateWorkProjection: async (id: number, data: { completion_date?: string; notes?: string; proof_image?: File }): Promise<{ message: string; projection: WorkProjection }> => {
    const formData = new FormData();
    if (data.completion_date) formData.append('completion_date', data.completion_date);
    if (data.notes !== undefined) formData.append('notes', data.notes || '');
    if (data.proof_image) formData.append('proof_image', data.proof_image);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/work-projection/${id}`, { method: 'PUT', headers, body: formData });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as { error?: string }).error || 'Failed to update'); }
    return res.json();
  },
  deleteWorkProjection: (id: number) => request<{ message: string }>(`/work-projection/${id}`, { method: 'DELETE' }),
  bulkDeleteWorkProjection: (data: { client_ids: number[], milestone_name: string }) => request<{ message: string, deletedCount: number }>('/work-projection/bulk-delete', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Types ─────────────────────────────────────
export type Client = {
  id: number; unique_client_id: string; name: string; phone: string; email: string;
  address: string; pan_aadhaar?: string; pan_number?: string; aadhaar_number?: string; purchase_date: string; flat_id: number;
  // Joined fields from flats + apartments + infrastructure
  flat_number?: string; floor?: string; block?: string; sbu_area?: number; carpet_area?: number; balcony_area?: number; terrace_area?: number; built_up_area?: number; undivided_share?: number;
  total_amount?: number; gst_percent?: number; gst_amount?: number; total_amount_with_gst?: number; flat_status?: 'available' | 'reserved' | 'booked';
  property_name?: string; apartment_name?: string; apartment_id?: number;
  booking_id?: string; booking_status?: string; booking_amount?: number; booking_percentage?: number;
  parking_allotment?: boolean; parking_slot_no?: string;
  extra_parking_allotment?: boolean; extra_parking_slot_no?: string; extra_parking_charge?: number;
  transformer_apartment?: string; transformer_flat?: string;
  corpus_fund?: number; electricity_board_source?: string; water_connection_details?: string;
  // Legacy compat (old projects-based)
  company_name?: string; contact_person?: string; city?: string; state?: string; gstin?: string; notes?: string;
  total_projects?: number; total_project_amount?: number; total_paid?: number; total_paid_with_gst?: number; total_due?: number; total_due_with_gst?: number;
  created_at?: string; updated_at?: string;
};

export type ClientDetail = Client & {
  projects: (Project & { due_amount: number })[]; payments: Payment[];
};

export type ClientHistoryItem = {
  id: number; unique_client_id: string; name: string; phone: string; email: string; purchase_date: string;
  flat_number?: string; apartment_name?: string; property_name?: string;
  total_amount: number; total_paid: number; total_due: number;
  current_stage_name?: string; current_stage_due?: number; current_due_date?: string;
  next_stage_name?: string; next_stage_amount?: number; next_due_date?: string;
  combined_due?: number;
  latest_demand_letter_id?: number;
  latest_demand_letter_file?: string;
  latest_demand_letter_url?: string;
  latest_demand_letter_date?: string;
  latest_demand_letter_status?: string;
  latest_invoice_id?: number;
  latest_invoice_no?: string;
  latest_invoice_file?: string;
  latest_invoice_url?: string;
  latest_invoice_date?: string;
  latest_invoice_amount?: number;
  latest_invoice_total?: number;
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
  gst_amount?: number; grand_total?: number;
  payment_date: string; payment_mode: string; reference_no: string; notes: string;
  email_sent: number; project_name?: string; client_name?: string; client_email?: string;
  apartment_name?: string; flat_number?: string; client_phone?: string;
  created_at?: string;
};

export type DashboardStats = {
  totalClients: number; totalProjects: number; activeProjects: number; completedProjects: number;
  totalProjectAmount: number; totalPaid: number; totalDue: number; unreadContacts: number;
  totalFlatSales: number; totalFlatPaid: number; totalFlatDue: number;
  totalApartments?: number; totalFlats?: number; bookedFlats?: number;
};

export type DueAlert = {
  id: number; name?: string; unique_client_id?: string; company_name?: string; contact_person?: string;
  email: string; phone: string; flat_number?: string; apartment_name?: string;
  total_amount?: number; total_project_amount?: number; total_paid: number; due_amount: number;
};

export type ContactSubmission = {
  id: number; name: string; phone: string; email: string; project_type: string;
  message: string; is_read: number; created_at: string;
};

export type Property = {
  id: number; name: string; address?: string;
  electricity_details?: string; transformer_details?: string; water_connection_details?: string;
  land_north?: string; land_south?: string; land_east?: string; land_west?: string;
  created_at?: string; updated_at?: string;
};

export type Apartment = {
  id: number; property_id?: number; property_name?: string;
  name: string; total_flats?: number; numbering_pattern?: string;
  parking_slots?: number; electricity_details?: string; transformer_details?: string; water_connection_details?: string;
  floor_north?: string; floor_south?: string; floor_east?: string; floor_west?: string;
  created_at?: string; updated_at?: string;
};

export type Flat = {
  id: number; apartment_id: number; flat_number: string; flat_type?: string; floor: string; block: string;
  tower_id?: number; sbu_area: number; carpet_area?: number; balcony_area?: number; terrace_area?: number;
  built_up_area?: number; undivided_share?: number;
  total_amount: number; is_available: boolean; status?: 'available' | 'reserved' | 'booked';
  gst_percent?: number; gst_amount?: number; total_amount_with_gst?: number;
  apartment_name?: string; created_at?: string; updated_at?: string;
};

// Bulk Upload Types
export type SheetInfo = {
  sheetName: string; sheetType: 'flat_details' | 'booking_status' | 'unknown';
  blockName: string; headers: string[]; headerRowIndex: number;
  totalRows: number; sampleRows: Record<string, unknown>[];
  autoMappings: Record<string, { systemField: string; confidence: string }>;
};

export type ParseHeadersResult = {
  fileName: string; filePath: string; totalSheets: number;
  sheets: SheetInfo[];
};

export type BulkUploadResult = {
  success: boolean; totalInserted: number; totalUpdated: number;
  totalSkipped: number; totalProcessed: number;
  sheets: { sheetName: string; blockName: string; status: string; totalRows: number; inserted: number; updated: number }[];
  errors: { sheet: string; row: number; error: string }[];
};

export type BulkUploadBookingResult = {
  success: boolean; totalBooked: number; totalAvailable: number;
  totalSkipped: number; totalNotFound: number; totalProcessed: number;
  sheets: { sheetName: string; blockName: string; status: string; totalRows: number; booked: number; available: number }[];
  errors: { sheet: string; row: number; error: string }[];
};

export type DemandLetter = {
  id: number; client_id: number; file_name: string; file_url: string;
  generated_date: string; total_amount: number; paid_amount: number;
  due_amount: number; gst_amount: number; grand_total: number;
  email_sent: boolean; whatsapp_sent: boolean;
  client_name?: string; unique_client_id?: string;
  apartment_name?: string; flat_number?: string;
  created_at?: string;
};

export type DemandLetterResponse = {
  message: string; id: number; file_name: string; file_url: string;
  total_amount: number; paid_amount: number; due_amount: number;
  gst_amount: number; grand_total: number;
  email_sent: boolean; whatsapp_url: string | null;
};

export type CommunicationLog = {
  id: number; client_id: number; flat_id: number;
  type: 'demand_letter' | 'email' | 'whatsapp' | 'payment_receipt' | 'invoice';
  channel: 'email' | 'whatsapp';
  subject: string; message: string;
  recipient_email: string; recipient_phone: string;
  demand_letter_id: number; invoice_id?: number; file_url: string;
  status: 'sent' | 'failed' | 'initiated' | 'pending';
  error_message: string;
  client_name?: string; unique_client_id?: string;
  apartment_name?: string; flat_number?: string;
  demand_letter_file?: string; demand_letter_url?: string;
  invoice_file?: string; invoice_url?: string; invoice_no?: string;
  sent_on: string; created_at: string;
};

export type CommunicationStats = {
  total_communications: number; total_demand_letters: number;
  total_emails: number; total_whatsapp: number;
  total_payment_receipts: number; total_invoices?: number; total_sent: number;
  total_failed: number; total_initiated: number;
};

export type PaymentInvoice = {
  id: number; payment_id: number; client_id: number;
  invoice_no: string; file_name: string; file_url: string;
  amount: number; gst_amount: number; grand_total: number;
  generated_date: string;
};

export type PaymentStage = {
  id: number; stage_name: string; percentage: number; stage_order: number;
  created_at?: string; updated_at?: string;
};

export type PaymentSchedule = {
  id: number; client_id: number; flat_id: number; stage_id: number;
  stage_name: string; percentage: number; amount: number;
  paid_amount: number; due_amount: number; due_date: string;
  status: 'pending' | 'partial' | 'paid'; stage_order: number;
  created_at?: string; updated_at?: string;
};

export type ClientPayment = {
  id: number; client_id: number; flat_id: number; amount: number;
  gst_amount?: number;
  payment_percentage?: number;
  payment_date: string; payment_mode: string; reference_no: string;
  notes: string; created_at?: string;
};

export type DueInfo = {
  total_flat_amount: number; total_paid: number; total_due: number;
  current_stage: string | null; current_stage_due: number; current_due?: number;
  current_due_date?: string;
  next_stage: string | null; next_stage_amount: number; next_installment_amount?: number;
  next_due_date?: string;
  gst_percent?: number; gst_amount?: number; total_payable?: number;
  combined_due: number;
};

export type PendingDue = {
  id: number; client_id: number; flat_id: number;
  total_flat_amount: number; total_paid: number; total_due: number;
  current_stage_name: string; current_stage_due: number;
  current_due?: number;
  next_stage_name: string; next_stage_amount: number; next_installment_amount?: number;
  combined_due: number;
  gst_percent?: number; gst_amount?: number; total_payable?: number;
  current_schedule_id?: number; current_due_date?: string; current_stage_percentage?: number;
  next_due_date?: string; next_stage_percentage?: number;
  client_name: string; unique_client_id: string;
  phone: string; email: string;
  flat_number: string; apartment_name: string;
};

export type DueReminder = {
  id: number; client_id: number; flat_id: number | null; schedule_id: number | null; work_projection_id: number | null;
  client_name: string; phone: string; email: string; flat_unit: string; apartment_name: string;
  projection_stage: string; payment_percentage: number; total_amount: number; due_amount: number;
  total_paid?: number; gst_percent?: number; gst_amount?: number; total_payable?: number;
  due_date: string | null; status: 'upcoming' | 'overdue' | 'paid';
  email_status: 'not_sent' | 'sent' | 'failed' | 'skipped';
  last_sent_at: string | null; reminder_count: number; created_at?: string; updated_at?: string;
};

export type ReminderLog = {
  id: number; client_id: number; flat_id: number;
  schedule_id: number; stage_name: string;
  due_date: string; combined_due: number;
  current_stage_due: number; next_stage_amount: number;
  email_sent: boolean; email_status: 'sent' | 'failed' | 'skipped';
  whatsapp_initiated: boolean;
  demand_letter_id: number;
  trigger_type: 'cron' | 'manual';
  next_due_date: string;
  error_message: string;
  sent_on: string; created_at: string;
  client_name?: string; unique_client_id?: string;
  client_email?: string; client_phone?: string;
  flat_number?: string; apartment_name?: string;
  demand_letter_file?: string; demand_letter_url?: string;
};

export type ReminderStats = {
  total_reminders: number;
  emails_sent: number; emails_failed: number; emails_skipped: number;
  whatsapp_initiated: number;
  cron_triggered: number; manually_triggered: number;
  sent_today: number;
};

export type BackupDataset = 'all' | 'clients' | 'payments' | 'dues' | 'schedules' | 'monthly';
export type BackupFormat = 'xls' | 'csv';

export type BackupSummary = {
  clients: number;
  payments: number;
  paid: number;
  due: number;
  datasets: Record<BackupDataset, string>;
};

export type BackupExportFilters = {
  dataset: BackupDataset;
  format: BackupFormat;
  from_date?: string;
  to_date?: string;
};

// Analytics types
export type CollectionTrendItem = {
  month: string; label: string; total_collected: number; payment_count: number;
};

export type ApartmentSalesItem = {
  apartment_id: number; apartment_name: string; total_clients: number;
  total_flats_sold: number; total_sales: number; total_collected: number; total_due: number;
};

export type DueVsPaidItem = {
  client_id: number; client_name: string; unique_client_id: string;
  phone: string; email: string; flat_number: string; apartment_name: string;
  total_amount: number; paid_amount: number; due_amount: number;
};

export type AnalyticsPayment = {
  id: number; client_id: number; flat_id: number; amount: number;
  payment_date: string; payment_mode: string; reference_no: string; notes: string;
  client_name: string; unique_client_id: string; flat_number: string; apartment_name: string;
};

export type DueListItem = {
  client_id: number; client_name: string; unique_client_id: string;
  phone: string; email: string; flat_number: string; apartment_name: string;
  total_amount: number; paid_amount: number; due_amount: number;
  current_stage_name: string; combined_due: number; next_stage_name: string;
};

export type StageProgressItem = {
  stage_name: string; stage_order: number; total_clients: number;
  paid_count: number; partial_count: number; pending_count: number;
  total_stage_amount: number; total_stage_paid: number; total_stage_due: number;
};

// Work Projection types
export type WorkProjection = {
  id: number | null; client_id: number; flat_id: number | null;
  milestone_name: string; milestone_percentage: number; milestone_order: number;
  completion_date: string | null; notes: string | null; proof_image: string | null;
  status: 'pending' | 'completed';
  created_by: number | null; created_at: string | null; updated_at: string | null;
};

export type WorkProjectionSummary = {
  client: {
    id: number; name: string; unique_client_id: string; phone: string; email: string;
    apartment_name: string; property_name: string; flat_number: string;
    floor: string; block: string;
  };
  total_property_amount: number; gst_percent?: number; gst_amount?: number; grand_total_amount?: number; total_paid: number;
  total_completed_percentage: number; total_due_generated: number;
  total_due_generated_gst?: number; total_due_generated_with_gst?: number;
  remaining_collectable: number; total_pending_percentage: number;
  remaining_collectable_gst?: number; remaining_collectable_with_gst?: number;
  total_paid_with_gst?: number;
  advance_payment?: number;
  milestones: WorkProjection[];
  last_updated: string | null;
  schedule_current_stage?: string | null;
  schedule_next_stage?: string | null;
  schedule_current_due?: number | null;
  schedule_next_stage_amount?: number | null;
  schedule_next_installment_amount?: number | null;
  schedule_carry_over?: number | null;
  schedule_combined_due?: number | null;
};

export type WorkProjectionClient = {
  id: number; unique_client_id: string; name: string; phone: string; email: string;
  flat_number: string; total_amount: number; apartment_name: string; property_name: string;
  completed_percentage: number; completed_milestones: number;
  last_updated: string | null;
};

export type MilestoneDef = {
  name: string; percentage: number; order: number;
};
