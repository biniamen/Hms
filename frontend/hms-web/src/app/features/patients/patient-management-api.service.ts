import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_BASE_URL } from '../../core/api/api.config';
import { ApiResponse } from '../../core/api/api-response.model';
import { Appointment, Bed, InsuranceCompany, Patient, QueueSummary } from './patient-management.models';

export interface AppointmentPayload {
  patientId: string;
  doctorId: string;
  startsAtUtc: string;
  reason: string;
  department: string;
  appointmentType: string;
  priority: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class PatientManagementApiService {
  constructor(private http: HttpClient) {}

  getPatients() {
    return this.http.get<ApiResponse<Patient[]>>(`${API_BASE_URL}/api/patients`);
  }

  createPatient(payload: Omit<Patient, 'id' | 'mrn'>) {
    return this.http.post<ApiResponse<Patient>>(`${API_BASE_URL}/api/patients`, payload);
  }

  updatePatient(id: string, payload: Omit<Patient, 'id' | 'mrn'>) {
    return this.http.put<ApiResponse<Patient>>(`${API_BASE_URL}/api/patients/${id}`, payload);
  }

  getInsuranceCompanies() {
    return this.http.get<ApiResponse<InsuranceCompany[]>>(`${API_BASE_URL}/api/insurance-companies`);
  }

  createInsuranceCompany(payload: {
    name: string;
    payerCode: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    coverageType: string;
    coveragePercent: number;
  }) {
    return this.http.post<ApiResponse<InsuranceCompany>>(`${API_BASE_URL}/api/insurance-companies`, payload);
  }

  getAppointments() {
    return this.http.get<ApiResponse<Appointment[]>>(`${API_BASE_URL}/api/appointments`);
  }

  createAppointment(payload: AppointmentPayload) {
    return this.http.post<ApiResponse<Appointment>>(`${API_BASE_URL}/api/appointments`, payload);
  }

  getQueueSummary() {
    return this.http.get<ApiResponse<QueueSummary[]>>(`${API_BASE_URL}/api/appointments/queue`);
  }

  updateAppointmentStatus(id: string, status: string) {
    return this.http.put<ApiResponse<Appointment>>(`${API_BASE_URL}/api/appointments/${id}/status`, { status });
  }

  getBeds() {
    return this.http.get<ApiResponse<Bed[]>>(`${API_BASE_URL}/api/beds`);
  }
}
