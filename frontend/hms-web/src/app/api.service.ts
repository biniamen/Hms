import { HttpClient } from '@angular/common/http';
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
  employeeNo: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phone?: string;
  role: string;
  permission: string;
  department?: string;
  specialization?: string;
  isActive: boolean;
  passwordSetupCompleted: boolean;
  invitationSentAtUtc?: string;
  passwordSetupExpiresAtUtc?: string;
}

export interface EmployeeInviteResponse {
  employee: Employee;
  setupUrl: string;
}

export interface PasswordResetResponse {
  accepted: boolean;
  setupUrl?: string;
}

export interface EmailOutboxMessage {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  createdAtUtc: string;
  sentAtUtc?: string;
  error?: string;
  setupUrl?: string;
}

export interface RolePermission {
  role: string;
  description: string;
  permissions: string[];
  userCount: number;
}

export interface Permission {
  key: string;
  description: string;
  module: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
}

export interface DoctorProfile {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  department?: string;
  specialization?: string;
  queueToday: number;
  isActive: boolean;
}

export interface InsuranceCompany {
  id: string;
  name: string;
  payerCode: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  coverageType: string;
  coveragePercent: number;
  isActive: boolean;
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  nationalId?: string;
  maritalStatus?: string;
  occupation?: string;
  address?: string;
  bloodType?: string;
  insuranceCompanyId?: string;
  insuranceCompanyName?: string;
  employerName?: string;
  insurancePlan?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
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
  department: string;
  appointmentType: string;
  priority: string;
  notes?: string;
  queueNumber: number;
  waitingAhead: number;
  queueStatus: string;
}

export interface QueueSummary {
  doctorId: string;
  doctorName: string;
  department: string;
  scheduled: number;
  waiting: number;
  inService: number;
  completed: number;
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
  invoiceNumber: string;
  patientId: string;
  description: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  status: string;
  dueAtUtc: string;
  createdAtUtc: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  serviceCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  receiptNumber: string;
  amount: number;
  method: string;
  reference?: string;
  receivedBy: string;
  paidAtUtc: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  invoiceNumber: string;
  invoiceId: string;
  patientId: string;
  amount: number;
  method: string;
  reference?: string;
  receivedBy: string;
  paidAtUtc: string;
  balanceAfterPayment: number;
}

export interface EnterpriseRecord {
  id: string;
  area: string;
  recordNumber: string;
  patientId?: string;
  title: string;
  department: string;
  owner: string;
  priority: string;
  status: string;
  amount: number;
  dueAtUtc: string;
  details: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface ServiceStatus {
  id: string;
  name: string;
  url: string;
  description: string;
  projectPath: string;
  status: string;
  canStart: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:5200';
  readonly session = signal<LoginResponse | null>(null);

  constructor(private http: HttpClient) {
    const savedSession = localStorage.getItem('hms_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession) as LoginResponse;
        this.session.set(session);
        localStorage.setItem('hms_access_token', session.accessToken);
      } catch {
        this.clearSession();
      }
    }
  }

  storeSession(session: LoginResponse) {
    this.session.set(session);
    localStorage.setItem('hms_session', JSON.stringify(session));
    localStorage.setItem('hms_access_token', session.accessToken);
  }

  clearSession() {
    this.session.set(null);
    localStorage.removeItem('hms_session');
    localStorage.removeItem('hms_access_token');
  }

  login(emailAddress: string, password: string) {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/api/auth/login`, {
      emailAddress,
      password,
    });
  }

  getEmployees() {
    return this.http.get<ApiResponse<Employee[]>>(`${this.baseUrl}/api/employees`);
  }

  createEmployee(payload: { firstName: string; lastName: string; emailAddress: string; phone?: string; role: string; department?: string; specialization?: string }) {
    return this.http.post<ApiResponse<EmployeeInviteResponse>>(`${this.baseUrl}/api/employees`, payload);
  }

  updateEmployee(id: string, payload: { firstName: string; lastName: string; emailAddress: string; phone?: string; role: string; department?: string; specialization?: string }) {
    return this.http.put<ApiResponse<Employee>>(`${this.baseUrl}/api/employees/${id}`, payload);
  }

  updateEmployeeStatus(id: string, isActive: boolean) {
    return this.http.put<ApiResponse<Employee>>(`${this.baseUrl}/api/employees/${id}/status`, { isActive });
  }

  resendEmployeeInvite(id: string) {
    return this.http.post<ApiResponse<EmployeeInviteResponse>>(`${this.baseUrl}/api/employees/${id}/invite`, {});
  }

  setupPassword(payload: { token: string; password: string }) {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/api/auth/setup-password`, payload);
  }

  forgotPassword(emailAddress: string) {
    return this.http.post<ApiResponse<PasswordResetResponse>>(`${this.baseUrl}/api/auth/forgot-password`, { emailAddress });
  }

  getEmailOutbox(recipient?: string) {
    const query = recipient ? `?recipient=${encodeURIComponent(recipient)}` : '';
    return this.http.get<ApiResponse<EmailOutboxMessage[]>>(`${this.baseUrl}/api/auth/email-outbox${query}`);
  }

  getLatestEmailLink(recipient: string) {
    return this.http.get<ApiResponse<{ setupUrl: string }>>(`${this.baseUrl}/api/auth/email-outbox/latest-link?recipient=${encodeURIComponent(recipient)}`);
  }

  getRoles() {
    return this.http.get<ApiResponse<RolePermission[]>>(`${this.baseUrl}/api/roles`);
  }

  createRole(payload: { role: string; description: string; permissions: string[] }) {
    return this.http.post<ApiResponse<RolePermission>>(`${this.baseUrl}/api/roles`, payload);
  }

  updateRole(role: string, payload: { description: string; permissions: string[] }) {
    return this.http.put<ApiResponse<RolePermission>>(`${this.baseUrl}/api/roles/${role}`, payload);
  }

  getPermissions() {
    return this.http.get<ApiResponse<Permission[]>>(`${this.baseUrl}/api/permissions`);
  }

  createPermission(payload: { key: string; description: string; module: string }) {
    return this.http.post<ApiResponse<Permission>>(`${this.baseUrl}/api/permissions`, payload);
  }

  getDepartments() {
    return this.http.get<ApiResponse<Department[]>>(`${this.baseUrl}/api/departments`);
  }

  createDepartment(payload: { code: string; name: string; type: string; location: string }) {
    return this.http.post<ApiResponse<Department>>(`${this.baseUrl}/api/departments`, payload);
  }

  getDoctors() {
    return this.http.get<ApiResponse<DoctorProfile[]>>(`${this.baseUrl}/api/doctors`);
  }

  getPatients() {
    return this.http.get<ApiResponse<Patient[]>>(`${this.baseUrl}/api/patients`);
  }

  createPatient(payload: Omit<Patient, 'id' | 'mrn'>) {
    return this.http.post<ApiResponse<Patient>>(`${this.baseUrl}/api/patients`, payload);
  }

  updatePatient(id: string, payload: Omit<Patient, 'id' | 'mrn'>) {
    return this.http.put<ApiResponse<Patient>>(`${this.baseUrl}/api/patients/${id}`, payload);
  }

  getInsuranceCompanies() {
    return this.http.get<ApiResponse<InsuranceCompany[]>>(`${this.baseUrl}/api/insurance-companies`);
  }

  createInsuranceCompany(payload: { name: string; payerCode: string; contactPerson: string; phone: string; email: string; address: string; coverageType: string; coveragePercent: number }) {
    return this.http.post<ApiResponse<InsuranceCompany>>(`${this.baseUrl}/api/insurance-companies`, payload);
  }

  getAppointments() {
    return this.http.get<ApiResponse<Appointment[]>>(`${this.baseUrl}/api/appointments`);
  }

  createAppointment(payload: { patientId: string; doctorId: string; startsAtUtc: string; reason: string; department: string; appointmentType: string; priority: string; notes?: string }) {
    return this.http.post<ApiResponse<Appointment>>(`${this.baseUrl}/api/appointments`, payload);
  }

  getQueueSummary() {
    return this.http.get<ApiResponse<QueueSummary[]>>(`${this.baseUrl}/api/appointments/queue`);
  }

  updateAppointmentStatus(id: string, status: string) {
    return this.http.put<ApiResponse<Appointment>>(`${this.baseUrl}/api/appointments/${id}/status`, { status });
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

  createInvoice(payload: { patientId: string; description: string; amount: number; discount: number; tax: number; paymentType: string; insuranceProvider?: string; items?: Array<{ serviceCode: string; description: string; quantity: number; unitPrice: number; discount: number }> }) {
    return this.http.post<ApiResponse<Invoice>>(`${this.baseUrl}/api/billing/invoices`, payload);
  }

  getPayments() {
    return this.http.get<ApiResponse<Payment[]>>(`${this.baseUrl}/api/billing/payments`);
  }

  getReceipts() {
    return this.http.get<ApiResponse<Receipt[]>>(`${this.baseUrl}/api/billing/receipts`);
  }

  recordPayment(payload: { invoiceId: string; amount: number; method: string; reference?: string; receivedBy?: string }) {
    return this.http.post<ApiResponse<Receipt>>(`${this.baseUrl}/api/billing/payments`, payload);
  }

  getEnterpriseRecords() {
    return this.http.get<ApiResponse<EnterpriseRecord[]>>(`${this.baseUrl}/api/clinical/enterprise-records`);
  }

  createEnterpriseRecord(payload: Partial<EnterpriseRecord>) {
    return this.http.post<ApiResponse<EnterpriseRecord>>(`${this.baseUrl}/api/clinical/enterprise-records`, payload);
  }

  updateEnterpriseRecord(id: string, payload: Partial<EnterpriseRecord>) {
    return this.http.put<ApiResponse<EnterpriseRecord>>(`${this.baseUrl}/api/clinical/enterprise-records/${id}`, payload);
  }

  updateEnterpriseRecordStatus(id: string, status: string) {
    return this.http.put<ApiResponse<EnterpriseRecord>>(`${this.baseUrl}/api/clinical/enterprise-records/${id}/status`, { status });
  }

  getServiceStatuses() {
    return this.http.get<ServiceStatus[]>(`${this.baseUrl}/api/operations/services`);
  }

  startService(id: string) {
    return this.http.post<{ message: string; url: string }>(`${this.baseUrl}/api/operations/services/${id}/start`, {});
  }
}
