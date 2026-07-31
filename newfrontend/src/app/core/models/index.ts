// ──────────────────────────────────────────────
// Backend API Response Types (from HMS Backend)
// ──────────────────────────────────────────────

export interface LoginRequest {
  emailAddress: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  employeeId: string;
  emailAddress: string;
  role: string;
  permission: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ──────────────────────────────────────────────
// Backend DTO Types (matching C# contracts)
// ──────────────────────────────────────────────

export interface BackendEmployee {
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

export interface BackendDoctorProfile {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  department?: string;
  specialization?: string;
  queueToday: number;
  isActive: boolean;
}

export interface BackendPatient {
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

export interface BackendAppointment {
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

export interface BackendBed {
  id: string;
  ward: string;
  room: string;
  bedNumber: string;
  isAvailable: boolean;
}

export interface BackendDiagnosticTest {
  id: string;
  groupName: string;
  subGroup: string;
  testName: string;
  specimenType: string;
  unit: string;
  referenceRange: string;
  sortOrder: number;
  isActive: boolean;
}

export interface BackendPrescription {
  id: string;
  patientId: string;
  doctorId: string;
  medication: string;
  instructions: string;
  orderedAtUtc: string;
}

export interface BackendClinicalEncounter {
  id: string;
  patientId: string;
  doctorId: string;
  visitType: string;
  chiefComplaint: string;
  assessment: string;
  plan: string;
  encounterAtUtc: string;
}

export interface BackendVitalSign {
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

export interface BackendDiagnosis {
  id: string;
  patientId: string;
  doctorId: string;
  code: string;
  description: string;
  severity: string;
  diagnosedAtUtc: string;
}

export interface BackendLabRequest {
  id: string;
  patientId: string;
  doctorId: string;
  testName: string;
  testCatalogIds?: string[];
  status: string;
  orderedAtUtc: string;
  category?: string;
  priority?: string;
  specimenType?: string;
  clinicalNote?: string;
  resultSummary?: string;
  resultValue?: string;
  referenceRange?: string;
  resultFlag?: string;
  resultNotes?: string;
  performedBy?: string;
  verifiedBy?: string;
  resultItemsJson?: string;
  resultedAtUtc?: string;
}

export interface BackendInvoiceItem {
  id: string;
  serviceCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface BackendInvoice {
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
  items: BackendInvoiceItem[];
}

export interface BackendPayment {
  id: string;
  invoiceId: string;
  receiptNumber: string;
  amount: number;
  method: string;
  reference?: string;
  receivedBy: string;
  paidAtUtc: string;
}

export interface BackendReceipt {
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

export interface BackendRolePermission {
  role: string;
  description: string;
  permissions: string[];
  userCount: number;
}

export interface BackendPermission {
  key: string;
  description: string;
  module: string;
}

export interface BackendDepartment {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
}

export interface BackendInsuranceCompany {
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

export interface BackendEmailOutbox {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  createdAtUtc: string;
  sentAtUtc?: string;
  error?: string;
  setupUrl?: string;
}

export interface BackendEnterpriseRecord {
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

export interface BackendServiceStatus {
  id: string;
  name: string;
  url: string;
  description: string;
  projectPath: string;
  status: string;
  canStart: boolean;
}

export interface BackendQueueSummary {
  doctorId: string;
  doctorName: string;
  department: string;
  scheduled: number;
  waiting: number;
  inService: number;
  completed: number;
}

// ──────────────────────────────────────────────
// Frontend Display Models (rich UI types)
// ──────────────────────────────────────────────

export type UserRole =
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'PHARMACIST'
  | 'LAB_TECHNICIAN'
  | 'ACCOUNTANT'
  | 'CASHIER'
  | 'HR_MANAGER'
  | 'PATIENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  phone: string;
  avatarUrl: string;
  specialization?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  licenseNumber?: string;
}

export interface VitalSigns {
  bp: string;
  hr: number;
  temp: number;
  spo2: number;
  respiratoryRate: number;
  updatedAt: string;
}

export type PatientStatus = 'ADMITTED' | 'OUTPATIENT' | 'DISCHARGED' | 'IN_TRIAGE';

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  bloodType: string;
  phone: string;
  email: string;
  address: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceCompanyName?: string;
  insuranceCompanyId?: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  status: PatientStatus;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedBedNumber?: string;
  assignedWard?: string;
  primaryCondition: string;
  vitals: VitalSigns;
  allergyList: string[];
  registeredDate: string;
  photoDataUrl?: string;
  employerName?: string;
  occupation?: string;
}

export type AppointmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type AppointmentType = 'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY' | 'LAB_TEST' | 'SURGERY';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  department: string;
  dateTime: string;
  timeSlot: string;
  status: AppointmentStatus;
  type: AppointmentType;
  reason: string;
  notes?: string;
  queueNumber: number;
  waitingAhead: number;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  date: string;
  medications: Medication[];
  status: 'PENDING' | 'DISPENSED' | 'CANCELLED';
  pharmacyNotes?: string;
}

export type LabOrderStatus = 'ORDERED' | 'SAMPLE_COLLECTED' | 'IN_ANALYSIS' | 'COMPLETED';

export interface LabOrder {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  testName: string;
  testCatalogIds?: string[];
  category: string;
  priority?: string;
  specimenType?: string;
  clinicalNote?: string;
  status: LabOrderStatus;
  result?: string;
  normalRange?: string;
  unit?: string;
  resultFlag?: string;
  resultNotes?: string;
  performedBy?: string;
  verifiedBy?: string;
  resultItems?: LabResultItem[];
  isAbnormal?: boolean;
  orderedDate: string;
  completedDate?: string;
  labTechName?: string;
}

export interface DiagnosticTest {
  id: string;
  groupName: string;
  subGroup: string;
  testName: string;
  specimenType: string;
  unit: string;
  referenceRange: string;
  sortOrder: number;
  isActive: boolean;
}

export interface LabResultItem {
  catalogId?: string;
  groupName: string;
  subGroup: string;
  testName: string;
  result: string;
  unit: string;
  referenceRange: string;
  flag: 'Normal' | 'Low' | 'High' | 'Abnormal' | 'Critical';
}

export interface ClinicalVitalEntry {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  temperatureC: number;
  pulse: number;
  respiratoryRate: number;
  bloodPressure: string;
  weightKg: number;
  heightCm: number;
  recordedAtUtc: string;
}

export interface ClinicalDiagnosis {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  code: string;
  description: string;
  severity: string;
  diagnosedAtUtc: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  category: 'Consultation' | 'Pharmacy' | 'Laboratory' | 'Room Charge' | 'Procedure' | 'Surgery';
  amount: number;
}

export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'INSURANCE_PENDING';

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  totalAmount: number;
  insuranceCoveredAmount: number;
  patientPaidAmount: number;
  status: InvoiceStatus;
  paymentMethod?: 'Credit Card' | 'Cash' | 'Insurance Direct' | 'Wire Transfer';
}

export interface Department {
  id: string;
  name: string;
  code: string;
  type: string;
  location: string;
  headDoctorName: string;
  totalBeds: number;
  occupiedBeds: number;
  activeStaffCount: number;
  icon: string;
}

export interface Bed {
  id: string;
  roomNumber: string;
  wardName: string;
  bedNumber: string;
  type: string;
  isOccupied: boolean;
  patientId?: string;
  patientName?: string;
  patientMrn?: string;
  admittedDate?: string;
}

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  invoiceId: string;
  patientName: string;
  patientMrn: string;
  provider: string;
  policyNumber: string;
  claimAmount: number;
  approvedAmount?: number;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  submittedDate: string;
  notes?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  diagnosis: string;
  icdCode?: string;
  symptoms: string[];
  clinicalNotes: string;
  prescriptionId?: string;
  labOrderIds?: string[];
  vitalSigns: VitalSigns;
}

// ──────────────────────────────────────────────
// Enterprise Module Types
// ──────────────────────────────────────────────

export interface EnterpriseModule {
  id: string;
  label: string;
  area: string;
  department: string;
  owner: string;
  action: string;
  description: string;
  workflow: string[];
}

export type AdminTab = 'users' | 'roles' | 'permissions' | 'departments' | 'diagnostics' | 'emails';

// ──────────────────────────────────────────────
// Default avatar URLs for staff
// ──────────────────────────────────────────────

export const AVATARS: Record<string, string> = {
  admin: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  doctor: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
  nurse: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80',
  receptionist: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  pharmacist: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  lab: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  billing: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};
