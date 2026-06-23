import { Patient, Doctor, QueueSettings, AnalyticsSummary, User } from '../types';

class ApiService {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('qc_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `/api${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || `HTTP request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // --- Auth ---
  async login(email: string, passwordPlain: string): Promise<{ token: string; user: User }> {
    return this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: passwordPlain }),
    });
  }

  async register(name: string, email: string, passwordPlain: string, role?: string): Promise<{ token: string; user: User }> {
    return this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password: passwordPlain, role }),
    });
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/profile');
  }

  // --- Patients ---
  async getPatients(): Promise<Patient[]> {
    return this.request<Patient[]>('/patients');
  }

  async createPatient(patientData: {
    name: string;
    age: number;
    gender: string;
    phone: string;
    doctorId: string;
    reason: string;
    priority: string;
  }): Promise<Patient> {
    return this.request<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    return this.request<Patient>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async cancelToken(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/patients/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Doctors ---
  async getDoctors(): Promise<Doctor[]> {
    return this.request<Doctor[]>('/doctors');
  }

  async createDoctor(docData: {
    name: string;
    specialty: string;
    room: string;
    avgConsultationMinutes?: number;
  }): Promise<Doctor> {
    return this.request<Doctor>('/doctors', {
      method: 'POST',
      body: JSON.stringify(docData),
    });
  }

  async updateDoctorAvailability(id: string, availability: 'active' | 'on-break' | 'inactive'): Promise<Doctor> {
    return this.request<Doctor>(`/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ availability }),
    });
  }

  // --- Queue Command Ops ---
  async callNext(doctorId: string): Promise<{ patient: Patient; doctor: Doctor }> {
    return this.request<{ patient: Patient; doctor: Doctor }>('/queue/call-next', {
      method: 'POST',
      body: JSON.stringify({ doctorId }),
    });
  }

  async skipPatient(patientId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/queue/skip', {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    });
  }

  async completeConsultation(patientId: string, durationMinutes?: number): Promise<{ message: string }> {
    return this.request<{ message: string }>('/queue/complete', {
      method: 'POST',
      body: JSON.stringify({ patientId, consultationTimeMinutes: durationMinutes }),
    });
  }

  async resetQueue(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/queue/reset', {
      method: 'POST',
    });
  }

  // --- Settings ---
  async getSettings(): Promise<QueueSettings> {
    return this.request<QueueSettings>('/settings');
  }

  async updateSettings(updates: Partial<QueueSettings>): Promise<QueueSettings> {
    return this.request<QueueSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // --- Analytics ---
  async getAnalytics(): Promise<AnalyticsSummary> {
    return this.request<AnalyticsSummary>('/analytics');
  }

  // --- DB Status ---
  async getDbStatus(): Promise<{ connected: boolean; error: string | null }> {
    return this.request<{ connected: boolean; error: string | null }>('/db-status');
  }
}

export const api = new ApiService();
