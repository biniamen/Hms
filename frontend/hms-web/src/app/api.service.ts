import { HttpClient, HttpHandlerFn, HttpInterceptorFn, HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface LoginResponse {
  accessToken: string;
  employeeId: string;
  emailAddress: string;
  role: string;
  permission: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  role: string;
  permission: string;
}

export interface RolePermission {
  role: string;
  description: string;
  permissions: string[];
  userCount: number;
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  address?: string;
  bloodType?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  photoDataUrl?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  startsAtUtc: string;
  status: string;
  reason: string;
}

export interface Bed {
  id: string;
  ward: string;
  room: string;
  bedNumber: string;
  isAvailable: boolean;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  medication: string;
  instructions: string;
  orderedAtUtc: string;
}

export interface ClinicalEncounter {
  id: string;
  patientId: string;
  doctorId: string;
  visitType: string;
  chiefComplaint: string;
  assessment: string;
  plan: string;
  encounterAtUtc: string;
}

export interface VitalSign {
  id: string;
  patientId: string;
  temperatureC: number;
  pulse: number;
  respiratoryRate: number;
  bloodPressure: string;
  weightKg: number;
  heightCm: number;
  recordedAtUtc: string;
}

export interface Diagnosis {
  id: string;
  patientId: string;
  doctorId: string;
  code: string;
  description: string;
  severity: string;
  diagnosedAtUtc: string;
}

export interface LabRequest {
  id: string;
  patientId: string;
  doctorId: string;
  testName: string;
  status: string;
  orderedAtUtc: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  description: string;
  amount: number;
  status: string;
  createdAtUtc: string;
}

// ── HTTP Interceptor for JWT Bearer tokens ──
export const jwtInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const token = sessionStorage.getItem('hms_token');
  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    return next(cloned);
  }
  return next(req);
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:5000';
  readonly session = signal<LoginResponse | null>(this.loadSession());

  constructor(private http: HttpClient) {}

  login(emailAddress: string, password: string) {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/api/auth/login`, {
      emailAddress,
      password,
    });
  }

  /** Persist session to sessionStorage after login */
  setSession(response: LoginResponse | null) {
    this.session.set(response);
    if (response?.accessToken) {
      sessionStorage.setItem('hms_token', response.accessToken);
      sessionStorage.setItem('hms_session', JSON.stringify(response));
    } else {
      sessionStorage.removeItem('hms_token');
      sessionStorage.removeItem('hms_session');
    }
  }

  private loadSession(): LoginResponse | null {
    const raw = sessionStorage.getItem('hms_session');
    return raw ? JSON.parse(raw) : null;
  }

  getEmployees() {
    return this.http.get<ApiResponse<Employee[]>>(`${this.baseUrl}/api/employees`);
  }

  createEmployee(payload: { firstName: string; lastName: string; emailAddress: string; role: string }) {
    return this.http.post<ApiResponse<Employee>>(`${this.baseUrl}/api/employees`, payload);
  }

  getRoles() {
    return this.http.get<ApiResponse<RolePermission[]>>(`${this.baseUrl}/api/roles`);
  }

  updateRole(role: string, payload: { description: string; permissions: string[] }) {
    return this.http.put<ApiResponse<RolePermission>>(`${this.baseUrl}/api/roles/${role}`, payload);
  }

  getPatients() {
    return this.http.get<ApiResponse<Patient[]>>(`${this.baseUrl}/api/patients`);
  }

  createPatient(payload: Omit<Patient, 'id' | 'mrn'>) {
    return this.http.post<ApiResponse<Patient>>(`${this.baseUrl}/api/patients`, payload);
  }

  getAppointments() {
    return this.http.get<ApiResponse<Appointment[]>>(`${this.baseUrl}/api/appointments`);
  }

  createAppointment(payload: { patientId: string; doctorId: string; startsAtUtc: string; reason: string }) {
    return this.http.post<ApiResponse<Appointment>>(`${this.baseUrl}/api/appointments`, payload);
  }

  getBeds() {
    return this.http.get<ApiResponse<Bed[]>>(`${this.baseUrl}/api/beds`);
  }

  getPrescriptions() {
    return this.http.get<ApiResponse<Prescription[]>>(`${this.baseUrl}/api/clinical/prescriptions`);
  }

  getEncounters() {
    return this.http.get<ApiResponse<ClinicalEncounter[]>>(`${this.baseUrl}/api/clinical/encounters`);
  }

  createEncounter(payload: { patientId: string; doctorId: string; visitType: string; chiefComplaint: string; assessment: string; plan: string }) {
    return this.http.post<ApiResponse<ClinicalEncounter>>(`${this.baseUrl}/api/clinical/encounters`, payload);
  }

  getVitals() {
    return this.http.get<ApiResponse<VitalSign[]>>(`${this.baseUrl}/api/clinical/vitals`);
  }

  createVitals(payload: { patientId: string; temperatureC: number; pulse: number; respiratoryRate: number; bloodPressure: string; weightKg: number; heightCm: number }) {
    return this.http.post<ApiResponse<VitalSign>>(`${this.baseUrl}/api/clinical/vitals`, payload);
  }

  getDiagnoses() {
    return this.http.get<ApiResponse<Diagnosis[]>>(`${this.baseUrl}/api/clinical/diagnoses`);
  }

  createDiagnosis(payload: { patientId: string; doctorId: string; code: string; description: string; severity: string }) {
    return this.http.post<ApiResponse<Diagnosis>>(`${this.baseUrl}/api/clinical/diagnoses`, payload);
  }

  createPrescription(payload: { patientId: string; doctorId: string; medication: string; instructions: string }) {
    return this.http.post<ApiResponse<Prescription>>(`${this.baseUrl}/api/clinical/prescriptions`, payload);
  }

  getLabRequests() {
    return this.http.get<ApiResponse<LabRequest[]>>(`${this.baseUrl}/api/clinical/lab-requests`);
  }

  createLabRequest(payload: { patientId: string; doctorId: string; testName: string }) {
    return this.http.post<ApiResponse<LabRequest>>(`${this.baseUrl}/api/clinical/lab-requests`, payload);
  }

  getInvoices() {
    return this.http.get<ApiResponse<Invoice[]>>(`${this.baseUrl}/api/billing/invoices`);
  }

  createInvoice(payload: { patientId: string; description: string; amount: number }) {
    return this.http.post<ApiResponse<Invoice>>(`${this.baseUrl}/api/billing/invoices`, payload);
  }

  recordPayment(payload: { invoiceId: string; amount: number; method: string }) {
    return this.http.post<ApiResponse<Invoice>>(`${this.baseUrl}/api/billing/payments`, payload);
  }
}
