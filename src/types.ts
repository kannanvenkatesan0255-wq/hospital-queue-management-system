/**
 * Queue Cure - Type Declarations
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'receptionist' | 'doctor' | 'admin';
}

export type Priority = 'normal' | 'urgent' | 'emergency';

export type PatientStatus =
  | 'waiting'
  | 'called'
  | 'in-consultation'
  | 'completed'
  | 'skipped'
  | 'cancelled';

export interface Patient {
  id: string;
  tokenNumber: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  doctorId: string;
  doctorName: string;
  reason: string;
  priority: Priority;
  status: PatientStatus;
  createdAt: string;
  calledAt: string | null;
  completedAt: string | null;
  consultationMinutes: number | null;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  room: string;
  availability: 'active' | 'on-break' | 'inactive';
  currentPatientToken: string | null;
  avgConsultationMinutes: number;
}

export interface QueueSettings {
  id: string;
  clinicName: string;
  avgConsultationTime: number; // default fallback minutes (e.g. 8)
  resetTime: string;
}

export interface AnalyticsSummary {
  patientsWaiting: number;
  currentServingToken: string | null;
  patientsServedToday: number;
  averageWaitTimeMinutes: number;
  efficiencyPercent: number;
  activeDoctorsCount: number;
  patientsPerHour: Array<{ hour: string; count: number }>;
  patientsPerDay: Array<{ day: string; count: number }>;
  doctorEfficiencyList: Array<{ name: string; avgTime: number; served: number }>;
}

export interface SocketEvents {
  'queue:updated': (data: { patients: Patient[]; doctors: Doctor[] }) => void;
  'patient:called': (data: { patient: Patient }) => void;
  'toast:notify': (data: { message: string; type: 'success' | 'info' | 'warning' | 'error' }) => void;
}
