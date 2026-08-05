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

export type Section = 'dashboard' | 'operations' | 'admin' | 'enterprise' | 'employees' | 'patients' | 'insurance' | 'appointments' | 'clinical' | 'billing';
export type Modal = 'role' | 'newRole' | 'permission' | 'department' | 'insurance' | 'employee' | 'patient' | 'appointment' | 'encounter' | 'vitals' | 'diagnosis' | 'prescription' | 'lab' | 'invoice' | 'payment' | 'enterpriseRecord' | null;
export type AdminTab = 'users' | 'roles' | 'permissions' | 'departments' | 'emails';
export type ClinicalTab = 'encounters' | 'vitals' | 'diagnoses' | 'prescriptions' | 'labs';
export type BillingTab = 'invoices' | 'payments' | 'receipts';
export type EnterpriseTab = 'pharmacy' | 'laboratory' | 'radiology' | 'inpatient' | 'emergency' | 'theatre' | 'inventory' | 'procurement' | 'assets' | 'biomedical' | 'claims' | 'security' | 'notifications' | 'documents' | 'reporting' | 'integration';
export type ToastKind = 'success' | 'error' | 'info';

export interface NavItem {
  id: Section;
  label: string;
  path: string;
  roles: string[];
}

export interface EnterpriseModule {
  id: EnterpriseTab;
  label: string;
  area: string;
  department: string;
  owner: string;
  action: string;
  description: string;
  workflow: string[];
}

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
