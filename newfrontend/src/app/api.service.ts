import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  ApiResponse, LoginRequest, LoginResponse,
  BackendEmployee, BackendDoctorProfile, BackendPatient,
  BackendAppointment, BackendBed, BackendPrescription,
  BackendClinicalEncounter, BackendVitalSign, BackendDiagnosis,
  BackendLabRequest, BackendInvoice, BackendPayment,
  BackendReceipt, BackendRolePermission, BackendPermission,
  BackendDepartment, BackendInsuranceCompany, BackendEmailOutbox,
  BackendEnterpriseRecord, BackendServiceStatus, BackendQueueSummary,
} from './core/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5200';
  private readonly platformId = inject(PLATFORM_ID);

  readonly session = signal<LoginResponse | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('hms_session');
      if (saved) {
        try {
          const session = JSON.parse(saved) as LoginResponse;
          this.session.set(session);
          localStorage.setItem('hms_access_token', session.accessToken);
        } catch {
          this.clearSession();
        }
      }
    }
  }

  storeSession(session: LoginResponse) {
    this.session.set(session);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('hms_session', JSON.stringify(session));
      localStorage.setItem('hms_access_token', session.accessToken);
    }
  }

  clearSession() {
    this.session.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('hms_session');
      localStorage.removeItem('hms_access_token');
    }
  }

  login(emailAddress: string, password: string): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/api/auth/login`, { emailAddress, password } as LoginRequest);
  }

  // ── Employees ──
  getEmployees(): Observable<ApiResponse<BackendEmployee[]>> {
    return this.http.get<ApiResponse<BackendEmployee[]>>(`${this.baseUrl}/api/employees`);
  }

  createEmployee(payload: {
    firstName: string; lastName: string; emailAddress: string;
    phone?: string; role: string; department?: string; specialization?: string;
  }): Observable<ApiResponse<{ employee: BackendEmployee; setupUrl: string }>> {
    return this.http.post<ApiResponse<{ employee: BackendEmployee; setupUrl: string }>>(`${this.baseUrl}/api/employees`, payload);
  }

  getEmployee(id: string): Observable<ApiResponse<BackendEmployee>> {
    return this.http.get<ApiResponse<BackendEmployee>>(`${this.baseUrl}/api/employees/${id}`);
  }

  updateEmployee(id: string, payload: {
    firstName: string; lastName: string; emailAddress: string;
    phone?: string; role: string; department?: string; specialization?: string;
  }): Observable<ApiResponse<BackendEmployee>> {
    return this.http.put<ApiResponse<BackendEmployee>>(`${this.baseUrl}/api/employees/${id}`, payload);
  }

  updateEmployeeStatus(id: string, isActive: boolean): Observable<ApiResponse<BackendEmployee>> {
    return this.http.put<ApiResponse<BackendEmployee>>(`${this.baseUrl}/api/employees/${id}/status`, { isActive });
  }

  resendEmployeeInvite(id: string): Observable<ApiResponse<{ employee: BackendEmployee; setupUrl: string }>> {
    return this.http.post<ApiResponse<{ employee: BackendEmployee; setupUrl: string }>>(`${this.baseUrl}/api/employees/${id}/invite`, {});
  }

  // ── Auth ──
  setupPassword(token: string, password: string): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/api/auth/setup-password`, { token, password });
  }

  forgotPassword(emailAddress: string): Observable<ApiResponse<{ accepted: boolean; setupUrl?: string }>> {
    return this.http.post<ApiResponse<{ accepted: boolean; setupUrl?: string }>>(`${this.baseUrl}/api/auth/forgot-password`, { emailAddress });
  }

  getEmailOutbox(recipient?: string): Observable<ApiResponse<BackendEmailOutbox[]>> {
    const query = recipient ? `?recipient=${encodeURIComponent(recipient)}` : '';
    return this.http.get<ApiResponse<BackendEmailOutbox[]>>(`${this.baseUrl}/api/auth/email-outbox${query}`);
  }

  getLatestEmailLink(recipient: string): Observable<ApiResponse<{ setupUrl: string }>> {
    return this.http.get<ApiResponse<{ setupUrl: string }>>(`${this.baseUrl}/api/auth/email-outbox/latest-link?recipient=${encodeURIComponent(recipient)}`);
  }

  // ── Roles ──
  getRoles(): Observable<ApiResponse<BackendRolePermission[]>> {
    return this.http.get<ApiResponse<BackendRolePermission[]>>(`${this.baseUrl}/api/roles`);
  }

  createRole(payload: { role: string; description: string; permissions: string[] }): Observable<ApiResponse<BackendRolePermission>> {
    return this.http.post<ApiResponse<BackendRolePermission>>(`${this.baseUrl}/api/roles`, payload);
  }

  updateRole(role: string, payload: { description: string; permissions: string[] }): Observable<ApiResponse<BackendRolePermission>> {
    return this.http.put<ApiResponse<BackendRolePermission>>(`${this.baseUrl}/api/roles/${role}`, payload);
  }

  // ── Permissions ──
  getPermissions(): Observable<ApiResponse<BackendPermission[]>> {
    return this.http.get<ApiResponse<BackendPermission[]>>(`${this.baseUrl}/api/permissions`);
  }

  createPermission(payload: { key: string; description: string; module: string }): Observable<ApiResponse<BackendPermission>> {
    return this.http.post<ApiResponse<BackendPermission>>(`${this.baseUrl}/api/permissions`, payload);
  }

  // ── Departments ──
  getDepartments(): Observable<ApiResponse<BackendDepartment[]>> {
    return this.http.get<ApiResponse<BackendDepartment[]>>(`${this.baseUrl}/api/departments`);
  }

  createDepartment(payload: { code: string; name: string; type: string; location: string }): Observable<ApiResponse<BackendDepartment>> {
    return this.http.post<ApiResponse<BackendDepartment>>(`${this.baseUrl}/api/departments`, payload);
  }

  // ── Doctors ──
  getDoctors(): Observable<ApiResponse<BackendDoctorProfile[]>> {
    return this.http.get<ApiResponse<BackendDoctorProfile[]>>(`${this.baseUrl}/api/doctors`);
  }

  // ── Patients ──
  getPatients(): Observable<ApiResponse<BackendPatient[]>> {
    return this.http.get<ApiResponse<BackendPatient[]>>(`${this.baseUrl}/api/patients`);
  }

  createPatient(payload: Record<string, unknown>): Observable<ApiResponse<BackendPatient>> {
    return this.http.post<ApiResponse<BackendPatient>>(`${this.baseUrl}/api/patients`, payload);
  }

  // ── Insurance Companies ──
  getInsuranceCompanies(): Observable<ApiResponse<BackendInsuranceCompany[]>> {
    return this.http.get<ApiResponse<BackendInsuranceCompany[]>>(`${this.baseUrl}/api/insurance-companies`);
  }

  createInsuranceCompany(payload: {
    name: string; payerCode: string; contactPerson: string;
    phone: string; email: string; address: string;
    coverageType: string; coveragePercent: number;
  }): Observable<ApiResponse<BackendInsuranceCompany>> {
    return this.http.post<ApiResponse<BackendInsuranceCompany>>(`${this.baseUrl}/api/insurance-companies`, payload);
  }

  // ── Appointments ──
  getAppointments(): Observable<ApiResponse<BackendAppointment[]>> {
    return this.http.get<ApiResponse<BackendAppointment[]>>(`${this.baseUrl}/api/appointments`);
  }

  createAppointment(payload: {
    patientId: string; doctorId: string; startsAtUtc: string;
    reason: string; department: string; appointmentType: string;
    priority: string; notes?: string;
  }): Observable<ApiResponse<BackendAppointment>> {
    return this.http.post<ApiResponse<BackendAppointment>>(`${this.baseUrl}/api/appointments`, payload);
  }

  updateAppointmentStatus(id: string, status: string): Observable<ApiResponse<BackendAppointment>> {
    return this.http.put<ApiResponse<BackendAppointment>>(`${this.baseUrl}/api/appointments/${id}/status`, { status });
  }

  getQueueSummary(): Observable<ApiResponse<BackendQueueSummary[]>> {
    return this.http.get<ApiResponse<BackendQueueSummary[]>>(`${this.baseUrl}/api/appointments/queue`);
  }

  // ── Beds ──
  getBeds(): Observable<ApiResponse<BackendBed[]>> {
    return this.http.get<ApiResponse<BackendBed[]>>(`${this.baseUrl}/api/beds`);
  }

  // ── Clinical ──
  getEncounters(): Observable<ApiResponse<BackendClinicalEncounter[]>> {
    return this.http.get<ApiResponse<BackendClinicalEncounter[]>>(`${this.baseUrl}/api/clinical/encounters`);
  }

  createEncounter(payload: {
    patientId: string; doctorId: string; visitType: string;
    chiefComplaint: string; assessment: string; plan: string;
  }): Observable<ApiResponse<BackendClinicalEncounter>> {
    return this.http.post<ApiResponse<BackendClinicalEncounter>>(`${this.baseUrl}/api/clinical/encounters`, payload);
  }

  getVitals(): Observable<ApiResponse<BackendVitalSign[]>> {
    return this.http.get<ApiResponse<BackendVitalSign[]>>(`${this.baseUrl}/api/clinical/vitals`);
  }

  createVitals(payload: {
    patientId: string; temperatureC: number; pulse: number;
    respiratoryRate: number; bloodPressure: string; weightKg: number; heightCm: number;
  }): Observable<ApiResponse<BackendVitalSign>> {
    return this.http.post<ApiResponse<BackendVitalSign>>(`${this.baseUrl}/api/clinical/vitals`, payload);
  }

  getDiagnoses(): Observable<ApiResponse<BackendDiagnosis[]>> {
    return this.http.get<ApiResponse<BackendDiagnosis[]>>(`${this.baseUrl}/api/clinical/diagnoses`);
  }

  createDiagnosis(payload: {
    patientId: string; doctorId: string; code: string; description: string; severity: string;
  }): Observable<ApiResponse<BackendDiagnosis>> {
    return this.http.post<ApiResponse<BackendDiagnosis>>(`${this.baseUrl}/api/clinical/diagnoses`, payload);
  }

  getPrescriptions(): Observable<ApiResponse<BackendPrescription[]>> {
    return this.http.get<ApiResponse<BackendPrescription[]>>(`${this.baseUrl}/api/clinical/prescriptions`);
  }

  createPrescription(payload: {
    patientId: string; doctorId: string; medication: string; instructions: string;
  }): Observable<ApiResponse<BackendPrescription>> {
    return this.http.post<ApiResponse<BackendPrescription>>(`${this.baseUrl}/api/clinical/prescriptions`, payload);
  }

  getLabRequests(): Observable<ApiResponse<BackendLabRequest[]>> {
    return this.http.get<ApiResponse<BackendLabRequest[]>>(`${this.baseUrl}/api/clinical/lab-requests`);
  }

  createLabRequest(payload: { patientId: string; doctorId: string; testName: string; category?: string; priority?: string; specimenType?: string; clinicalNote?: string }): Observable<ApiResponse<BackendLabRequest>> {
    return this.http.post<ApiResponse<BackendLabRequest>>(`${this.baseUrl}/api/clinical/lab-requests`, payload);
  }

  updateLabResult(id: string, payload: {
    status: string; resultSummary?: string; resultValue?: string;
    referenceRange?: string; resultFlag?: string; resultNotes?: string;
    specimenType?: string; performedBy?: string; verifiedBy?: string;
    collectedAtUtc?: string; resultedAtUtc?: string;
  }): Observable<ApiResponse<BackendLabRequest>> {
    return this.http.put<ApiResponse<BackendLabRequest>>(`${this.baseUrl}/api/clinical/lab-requests/${id}/result`, payload);
  }

  // ── Enterprise Records ──
  getEnterpriseRecords(area?: string): Observable<ApiResponse<BackendEnterpriseRecord[]>> {
    const query = area ? `?area=${encodeURIComponent(area)}` : '';
    return this.http.get<ApiResponse<BackendEnterpriseRecord[]>>(`${this.baseUrl}/api/clinical/enterprise-records${query}`);
  }

  createEnterpriseRecord(payload: Record<string, unknown>): Observable<ApiResponse<BackendEnterpriseRecord>> {
    return this.http.post<ApiResponse<BackendEnterpriseRecord>>(`${this.baseUrl}/api/clinical/enterprise-records`, payload);
  }

  updateEnterpriseRecord(id: string, payload: Record<string, unknown>): Observable<ApiResponse<BackendEnterpriseRecord>> {
    return this.http.put<ApiResponse<BackendEnterpriseRecord>>(`${this.baseUrl}/api/clinical/enterprise-records/${id}`, payload);
  }

  updateEnterpriseRecordStatus(id: string, status: string): Observable<ApiResponse<BackendEnterpriseRecord>> {
    return this.http.put<ApiResponse<BackendEnterpriseRecord>>(`${this.baseUrl}/api/clinical/enterprise-records/${id}/status`, { status });
  }

  // ── Billing ──
  getInvoices(): Observable<ApiResponse<BackendInvoice[]>> {
    return this.http.get<ApiResponse<BackendInvoice[]>>(`${this.baseUrl}/api/billing/invoices`);
  }

  getInvoice(id: string): Observable<ApiResponse<BackendInvoice>> {
    return this.http.get<ApiResponse<BackendInvoice>>(`${this.baseUrl}/api/billing/invoices/${id}`);
  }

  updateInvoiceStatus(id: string, status: string): Observable<ApiResponse<BackendInvoice>> {
    return this.http.put<ApiResponse<BackendInvoice>>(`${this.baseUrl}/api/billing/invoices/${id}/status`, { status });
  }

  createInvoice(payload: {
    patientId: string; description: string; amount: number;
    discount: number; tax: number; paymentType: string;
    insuranceProvider?: string; items?: Array<{
      serviceCode: string; description: string; quantity: number; unitPrice: number; discount: number;
    }>;
  }): Observable<ApiResponse<BackendInvoice>> {
    return this.http.post<ApiResponse<BackendInvoice>>(`${this.baseUrl}/api/billing/invoices`, payload);
  }

  getPayments(): Observable<ApiResponse<BackendPayment[]>> {
    return this.http.get<ApiResponse<BackendPayment[]>>(`${this.baseUrl}/api/billing/payments`);
  }

  getReceipts(): Observable<ApiResponse<BackendReceipt[]>> {
    return this.http.get<ApiResponse<BackendReceipt[]>>(`${this.baseUrl}/api/billing/receipts`);
  }

  getReceipt(id: string): Observable<ApiResponse<BackendReceipt>> {
    return this.http.get<ApiResponse<BackendReceipt>>(`${this.baseUrl}/api/billing/receipts/${id}`);
  }

  recordPayment(payload: {
    invoiceId: string; amount: number; method: string; reference?: string; receivedBy?: string;
  }): Observable<ApiResponse<BackendReceipt>> {
    return this.http.post<ApiResponse<BackendReceipt>>(`${this.baseUrl}/api/billing/payments`, payload);
  }

  // ── Operations / Services ──
  getServiceStatuses(): Observable<BackendServiceStatus[]> {
    return this.http.get<BackendServiceStatus[]>(`${this.baseUrl}/api/operations/services`);
  }

  startService(id: string): Observable<{ message: string; url: string }> {
    return this.http.post<{ message: string; url: string }>(`${this.baseUrl}/api/operations/services/${id}/start`, {});
  }
}
