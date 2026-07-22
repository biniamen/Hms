import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import {
  ApiService,
  Appointment,
  Bed,
  ClinicalEncounter,
  Diagnosis,
  Department,
  EmailOutboxMessage,
  DoctorProfile,
  Employee,
  EnterpriseRecord,
  InsuranceCompany,
  Invoice,
  LabRequest,
  LoginResponse,
  Patient,
  Payment,
  Permission,
  Prescription,
  QueueSummary,
  Receipt,
  RolePermission,
  ServiceStatus,
  VitalSign,
} from './api.service';

type Section = 'dashboard' | 'operations' | 'admin' | 'enterprise' | 'employees' | 'patients' | 'insurance' | 'appointments' | 'clinical' | 'billing';
type Modal = 'role' | 'newRole' | 'permission' | 'department' | 'insurance' | 'employee' | 'employeeEdit' | 'patient' | 'patientView' | 'patientEdit' | 'patientHistory' | 'appointment' | 'encounter' | 'vitals' | 'diagnosis' | 'prescription' | 'lab' | 'labResult' | 'invoice' | 'payment' | 'enterpriseRecord' | 'enterpriseRecordEdit' | null;
type AdminTab = 'users' | 'roles' | 'permissions' | 'departments' | 'emails';
type ClinicalTab = 'encounters' | 'vitals' | 'diagnoses' | 'prescriptions' | 'labs';
type BillingTab = 'invoices' | 'payments' | 'receipts';
type EnterpriseTab = 'pharmacy' | 'laboratory' | 'radiology' | 'inpatient' | 'emergency' | 'theatre' | 'inventory' | 'procurement' | 'assets' | 'biomedical' | 'claims' | 'security' | 'notifications' | 'documents' | 'reporting' | 'integration';
type ToastKind = 'success' | 'error' | 'info';

interface EnterpriseModule {
  id: EnterpriseTab;
  label: string;
  area: string;
  department: string;
  owner: string;
  action: string;
  description: string;
  workflow: string[];
}

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface EncounterForm {
  patientId: string;
  doctorId: string;
  visitType: string;
  chiefComplaint: string;
  assessment: string;
  plan: string;
}

interface VitalsForm {
  patientId: string;
  temperatureC: number | null;
  pulse: number | null;
  respiratoryRate: number | null;
  bloodPressure: string;
  weightKg: number | null;
  heightCm: number | null;
}

interface DiagnosisForm {
  patientId: string;
  doctorId: string;
  code: string;
  description: string;
  severity: string;
}

interface PrescriptionForm {
  patientId: string;
  doctorId: string;
  selectedMedications: string[];
  customMedication: string;
  medication: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
}

interface LabForm {
  patientId: string;
  doctorId: string;
  selectedTests: string[];
  testName: string;
  category: string;
  priority: string;
  specimenType: string;
  clinicalNote: string;
}

interface LabResultForm {
  id: string;
  status: string;
  specimenType: string;
  resultSummary: string;
  resultValue: string;
  referenceRange: string;
  resultFlag: string;
  resultNotes: string;
  performedBy: string;
  verifiedBy: string;
  collectedAtUtc: string;
  resultedAtUtc: string;
}

interface OptionGroup {
  category: string;
  items: string[];
}

interface PatientIntakeForm {
  createAppointment: boolean;
  department: string;
  doctorId: string;
  startsAtUtc: string;
  reason: string;
  appointmentType: string;
  priority: string;
  notes: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  @ViewChild('cameraPreview') cameraPreview?: ElementRef<HTMLVideoElement>;
  @ViewChild('cameraCanvas') cameraCanvas?: ElementRef<HTMLCanvasElement>;

  emailAddress = 'admin@hms.local';
  password = '';
  active = signal<Section>('dashboard');
  modal = signal<Modal>(null);
  adminTab = signal<AdminTab>('users');
  clinicalTab = signal<ClinicalTab>('encounters');
  billingTab = signal<BillingTab>('invoices');
  enterpriseTab = signal<EnterpriseTab>('pharmacy');
  loading = signal(false);
  saving = signal(false);
  search = signal('');
  cameraOn = signal(false);
  showLoginPassword = signal(false);
  toasts = signal<Toast[]>([]);
  setupMode = signal(false);
  forgotMode = signal(false);
  setupToken = '';
  setupPasswordForm = { password: '', confirmPassword: '' };
  forgotPasswordForm = { emailAddress: '' };

  employees = signal<Employee[]>([]);
  roles = signal<RolePermission[]>([]);
  permissions = signal<Permission[]>([]);
  departments = signal<Department[]>([]);
  doctorProfiles = signal<DoctorProfile[]>([]);
  patients = signal<Patient[]>([]);
  insuranceCompanies = signal<InsuranceCompany[]>([]);
  appointments = signal<Appointment[]>([]);
  queueSummary = signal<QueueSummary[]>([]);
  beds = signal<Bed[]>([]);
  encounters = signal<ClinicalEncounter[]>([]);
  vitals = signal<VitalSign[]>([]);
  diagnoses = signal<Diagnosis[]>([]);
  prescriptions = signal<Prescription[]>([]);
  labRequests = signal<LabRequest[]>([]);
  invoices = signal<Invoice[]>([]);
  payments = signal<Payment[]>([]);
  receipts = signal<Receipt[]>([]);
  services = signal<ServiceStatus[]>([]);
  emailOutbox = signal<EmailOutboxMessage[]>([]);
  enterpriseRecords = signal<EnterpriseRecord[]>([]);
  lastReceipt = signal<Receipt | null>(null);
  selectedPatient = signal<Patient | null>(null);
  editingEmployeeId = '';
  editingPatientId = '';
  editingEnterpriseRecordId = '';
  readonly visitTypes = ['Outpatient', 'Follow-up', 'Emergency', 'Inpatient Review', 'Procedure Review', 'Teleconsultation'];
  readonly staffSpecializationsByRole: Record<string, string[]> = {
    ADMIN: ['System Administration', 'Platform Operations', 'Information Security'],
    HR_MANAGER: ['Human Resources', 'Staff Onboarding', 'Training Coordination'],
    RECEPTIONIST: ['Front Desk', 'Patient Intake', 'Appointment Coordination'],
    NURSE: ['General Nursing', 'Emergency Nursing', 'Ward Nursing', 'Theatre Nursing', 'Maternal and Child Health'],
    DOCTOR: ['General Practitioner', 'Internal Medicine', 'Pediatrics', 'Obstetrics and Gynecology', 'Surgery', 'Emergency Medicine', 'Orthopedics', 'Dermatology', 'Ophthalmology', 'ENT', 'Radiology', 'Anesthesiology'],
    LAB_TECHNICIAN: ['Clinical Laboratory', 'Hematology', 'Clinical Chemistry', 'Microbiology', 'Serology', 'Blood Bank'],
    PHARMACIST: ['Clinical Pharmacy', 'Dispensing Pharmacy', 'Inventory Pharmacy', 'Medication Safety'],
    ACCOUNTANT: ['Patient Billing', 'Insurance Claims', 'Revenue Reporting', 'Accounts Receivable'],
    CASHIER: ['Cash Collection', 'Receipt Control', 'Payment Reconciliation'],
  };
  readonly medicationCatalog: OptionGroup[] = [
    { category: 'Analgesics and Antipyretics', items: ['Paracetamol', 'Ibuprofen', 'Diclofenac', 'Tramadol'] },
    { category: 'Antibiotics', items: ['Amoxicillin', 'Azithromycin', 'Ceftriaxone', 'Metronidazole', 'Ciprofloxacin', 'Doxycycline'] },
    { category: 'Gastrointestinal', items: ['Omeprazole', 'ORS', 'Metoclopramide', 'Hyoscine', 'Loperamide'] },
    { category: 'Respiratory and Allergy', items: ['Salbutamol', 'Prednisolone', 'Cetirizine', 'Chlorpheniramine'] },
    { category: 'Chronic Care', items: ['Amlodipine', 'Enalapril', 'Hydrochlorothiazide', 'Metformin', 'Insulin'] },
    { category: 'Vitamins and Supplements', items: ['Ferrous Sulfate', 'Folic Acid', 'Multivitamin', 'Vitamin D'] },
  ];
  readonly diagnosticOrderCatalog: OptionGroup[] = [
    { category: 'Hematology', items: ['Complete Blood Count', 'Hemoglobin', 'ESR', 'Blood Group and Rh', 'Coagulation Profile', 'Peripheral Blood Morphology'] },
    { category: 'Clinical Chemistry', items: ['Random Blood Sugar', 'Fasting Blood Sugar', 'Urea', 'Creatinine', 'Electrolytes', 'Liver Function Test', 'Lipid Profile', 'HbA1c'] },
    { category: 'Microbiology', items: ['Urine Culture', 'Blood Culture', 'Wound Swab Culture', 'Gram Stain', 'AFB Smear'] },
    { category: 'Serology and Infectious Disease', items: ['Malaria RDT', 'Widal Test', 'H. pylori Test', 'HIV Screening', 'HBsAg', 'HCV Antibody'] },
    { category: 'Urine and Stool', items: ['Urinalysis', 'Stool Examination', 'Pregnancy Test', 'Occult Blood'] },
    { category: 'Imaging and Cardio Diagnostics', items: ['Chest X-ray', 'Abdominal Ultrasound', 'Obstetric Ultrasound', 'ECG', 'Echocardiography', 'CT Head', 'MRI Spine'] },
    { category: 'Procedures and Pathology', items: ['Pap Smear', 'Biopsy Request', 'Fine Needle Aspiration', 'Endoscopy Request'] },
  ];
  readonly prescriptionRoutes = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhalation', 'Eye', 'Ear'];
  readonly prescriptionFrequencies = ['Once daily', 'Twice daily', 'Three times daily', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'As needed', 'Stat'];
  readonly labPriorityOptions = ['Routine', 'Urgent', 'STAT', 'Pre-operative', 'Follow-up'];
  readonly specimenOptions = ['Whole blood', 'Serum', 'Plasma', 'Urine', 'Stool', 'Sputum', 'Swab', 'Tissue', 'Imaging study', 'Not applicable'];
  readonly labStatusOptions = ['Requested', 'Specimen Collected', 'In Progress', 'Result Entered', 'Verified', 'Completed', 'Cancelled'];
  readonly resultFlagOptions = ['Normal', 'Abnormal', 'Critical', 'High', 'Low', 'Reactive', 'Non-reactive'];

  employeeForm = this.defaultEmployeeForm();
  newRoleForm = { role: '', description: '', permissionsText: '' };
  roleForm = { role: '', description: '', permissionsText: '' };
  permissionForm = { key: '', description: '', module: 'Administration' };
  departmentForm = { code: '', name: '', type: 'Clinical', location: 'Main Campus' };
  insuranceForm = { name: '', payerCode: '', contactPerson: '', phone: '', email: '', address: '', coverageType: 'Corporate', coveragePercent: 80 };
  patientForm: Omit<Patient, 'id' | 'mrn'> = this.emptyPatient();
  patientIntakeForm: PatientIntakeForm = this.emptyPatientIntakeForm();
  appointmentForm = {
    patientId: '',
    doctorId: '',
    startsAtUtc: this.localDateTimeValue(1),
    reason: '',
    department: '',
    appointmentType: 'Consultation',
    priority: 'Normal',
    notes: '',
  };
  encounterForm: EncounterForm = this.emptyEncounterForm();
  vitalsForm: VitalsForm = this.emptyVitalsForm();
  diagnosisForm: DiagnosisForm = this.emptyDiagnosisForm();
  prescriptionForm: PrescriptionForm = this.emptyPrescriptionForm();
  labForm: LabForm = this.emptyLabForm();
  labResultForm: LabResultForm = this.emptyLabResultForm();
  invoiceForm = { patientId: '', description: 'Outpatient service invoice', serviceCode: 'CONS', serviceDescription: 'General consultation', quantity: 1, unitPrice: 350, lineDiscount: 0, discount: 0, tax: 0, paymentType: 'Cash', insuranceProvider: '' };
  paymentForm = { invoiceId: '', amount: 0, method: '', reference: '', receivedBy: 'Cashier' };
  enterpriseRecordForm = { area: 'Pharmacy', patientId: '', title: '', department: 'Pharmacy', owner: '', priority: 'Normal', status: 'Open', amount: 0, dueAtUtc: this.localDateTimeValue(1), details: '' };

  readonly session = computed(() => this.api.session());
  readonly doctors = computed<Employee[]>(() => {
    const profiles = this.uniqueBy(this.doctorProfiles(), (doctor) => this.doctorDisplayKey(doctor));
    if (profiles.length) {
      return profiles.map((doctor) => ({
        id: doctor.id,
        employeeNo: '',
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        emailAddress: doctor.emailAddress,
        role: 'DOCTOR',
        permission: '',
        department: doctor.department,
        specialization: doctor.specialization,
        isActive: doctor.isActive,
        passwordSetupCompleted: true,
      }));
    }

    return this.uniqueBy(this.employees().filter((employee) => employee.role === 'DOCTOR'), (doctor) => this.doctorDisplayKey(doctor));
  });
  readonly assignedDoctorPatientIds = computed(() => {
    const doctorId = this.loggedDoctorId();
    if (!doctorId) {
      return new Set<string>();
    }

    return new Set(this.appointments()
      .filter((appointment) => appointment.doctorId === doctorId)
      .map((appointment) => appointment.patientId));
  });
  readonly visiblePatients = computed(() => {
    if (!this.hasRole('DOCTOR')) {
      return this.patients();
    }

    const assignedPatientIds = this.assignedDoctorPatientIds();
    return this.patients().filter((patient) => assignedPatientIds.has(patient.id));
  });
  readonly visibleAppointments = computed(() => {
    if (!this.hasRole('DOCTOR')) {
      return this.appointments();
    }

    const doctorId = this.loggedDoctorId();
    return this.appointments().filter((appointment) => appointment.doctorId === doctorId);
  });
  readonly clinicalKpis = computed(() => {
    const patients = this.visiblePatients();
    const appointments = this.visibleAppointments();
    const activeQueue = appointments.filter((appointment) => ['Scheduled', 'Waiting', 'In Service'].includes(appointment.queueStatus));
    const patientIds = new Set(patients.map((patient) => patient.id));

    return [
      { label: this.hasRole('DOCTOR') ? 'My Patients' : 'Patients', value: patients.length, hint: this.hasRole('DOCTOR') ? 'Patients assigned through appointment queue' : 'Patients available in the clinical workspace', tone: 'bg-blue-50 text-blue-700' },
      { label: 'Active Queue', value: activeQueue.length, hint: 'Scheduled, waiting, or in-service patients', tone: 'bg-cyan-50 text-cyan-700' },
      { label: 'Patient History', value: this.encounters().filter((item) => patientIds.has(item.patientId)).length + this.vitals().filter((item) => patientIds.has(item.patientId)).length + this.diagnoses().filter((item) => patientIds.has(item.patientId)).length, hint: 'Clinical records available for assigned patients', tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Open Orders', value: this.labRequests().filter((item) => patientIds.has(item.patientId) && item.status !== 'Completed').length + this.prescriptions().filter((item) => patientIds.has(item.patientId)).length, hint: 'Lab and prescription workload', tone: 'bg-violet-50 text-violet-700' },
    ];
  });
  readonly doctorClinicalChart = computed(() => this.chartRows([
    ['Encounters', this.visibleClinicalRows(this.encounters()).length],
    ['Vitals', this.visibleClinicalRows(this.vitals()).length],
    ['Diagnoses', this.visibleClinicalRows(this.diagnoses()).length],
    ['Rx', this.visibleClinicalRows(this.prescriptions()).length],
    ['Labs', this.visibleClinicalRows(this.labRequests()).length],
  ]));
  readonly activeTitle = computed(() => this.nav.find((item) => item.id === this.active())?.label ?? this.title(this.active()));
  readonly stats = computed(() => {
    const role = this.session()?.role ?? '';
    const today = new Date().toISOString().slice(0, 10);
    const activeQueue = this.appointments().filter((appointment) => ['Scheduled', 'Waiting', 'In Service'].includes(appointment.queueStatus));
    const openBalance = this.invoices().filter((invoice) => invoice.status !== 'Paid').reduce((sum, invoice) => sum + invoice.balance, 0);
    const currentDoctorId = this.session()?.employeeId;

    if (role === 'RECEPTIONIST') {
      return [
        { label: 'Registered Patients', value: this.patients().length, tone: 'bg-emerald-50 text-emerald-700' },
        { label: 'Today Queue', value: activeQueue.length, tone: 'bg-cyan-50 text-cyan-700' },
        { label: 'Appointments Today', value: this.appointments().filter((item) => item.startsAtUtc.slice(0, 10) === today).length, tone: 'bg-blue-50 text-blue-700' },
        { label: 'Insurance Companies', value: this.insuranceCompanies().length, tone: 'bg-violet-50 text-violet-700' },
        { label: 'Available Beds', value: this.beds().filter((bed) => bed.isAvailable).length, tone: 'bg-amber-50 text-amber-700' },
      ];
    }

    if (role === 'DOCTOR') {
      const assigned = this.appointments().filter((item) => item.doctorId === currentDoctorId);
      return [
        { label: 'Assigned Today', value: assigned.filter((item) => item.startsAtUtc.slice(0, 10) === today).length, tone: 'bg-blue-50 text-blue-700' },
        { label: 'Waiting', value: assigned.filter((item) => ['Scheduled', 'Waiting'].includes(item.queueStatus)).length, tone: 'bg-cyan-50 text-cyan-700' },
        { label: 'Encounters', value: this.encounters().filter((item) => item.doctorId === currentDoctorId).length, tone: 'bg-emerald-50 text-emerald-700' },
        { label: 'Prescriptions', value: this.prescriptions().filter((item) => item.doctorId === currentDoctorId).length, tone: 'bg-violet-50 text-violet-700' },
        { label: 'Lab Requests', value: this.labRequests().filter((item) => item.doctorId === currentDoctorId).length, tone: 'bg-amber-50 text-amber-700' },
      ];
    }

    if (['ACCOUNTANT', 'CASHIER'].includes(role)) {
      return [
        { label: 'Invoices', value: this.invoices().length, tone: 'bg-blue-50 text-blue-700' },
        { label: 'Collected', value: this.money(this.totalCollected()), tone: 'bg-emerald-50 text-emerald-700' },
        { label: 'Open Balance', value: this.money(openBalance), tone: 'bg-amber-50 text-amber-700' },
        { label: 'Receipts', value: this.receipts().length, tone: 'bg-cyan-50 text-cyan-700' },
        { label: 'Paid Invoices', value: this.invoices().filter((invoice) => invoice.status === 'Paid').length, tone: 'bg-violet-50 text-violet-700' },
      ];
    }

    if (['NURSE', 'LAB_TECHNICIAN', 'PHARMACIST'].includes(role)) {
      return [
        { label: 'Patients', value: this.patients().length, tone: 'bg-emerald-50 text-emerald-700' },
        { label: 'Vitals', value: this.vitals().length, tone: 'bg-blue-50 text-blue-700' },
        { label: 'Prescriptions', value: this.prescriptions().length, tone: 'bg-violet-50 text-violet-700' },
        { label: 'Lab Requests', value: this.labRequests().length, tone: 'bg-cyan-50 text-cyan-700' },
        { label: 'Open Work', value: this.enterpriseRecords().filter((record) => !['Completed', 'Closed'].includes(record.status)).length, tone: 'bg-amber-50 text-amber-700' },
      ];
    }

    return [
      { label: 'Employees', value: this.employees().length, tone: 'bg-blue-50 text-blue-700' },
      { label: 'Patients', value: this.patients().length, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Queued Today', value: activeQueue.length, tone: 'bg-cyan-50 text-cyan-700' },
      { label: 'Clinical Orders', value: this.prescriptions().length + this.labRequests().length, tone: 'bg-violet-50 text-violet-700' },
      { label: 'Open Balance', value: this.money(openBalance), tone: 'bg-amber-50 text-amber-700' },
    ];
  });
  readonly queueChart = computed(() => this.chartRows([
    ['Waiting', this.appointments().filter((item) => item.queueStatus === 'Waiting').length],
    ['In Service', this.appointments().filter((item) => item.queueStatus === 'In Service').length],
    ['Completed', this.appointments().filter((item) => item.queueStatus === 'Completed').length],
    ['No Show', this.appointments().filter((item) => item.queueStatus === 'No Show').length],
  ]));
  readonly revenueChart = computed(() => this.chartRows([
    ['Billed', this.totalBilled()],
    ['Collected', this.totalCollected()],
    ['Open', this.totalOpenBalance()],
  ]));
  readonly clinicalChart = computed(() => this.chartRows([
    ['Encounters', this.encounters().length],
    ['Vitals', this.vitals().length],
    ['Diagnoses', this.diagnoses().length],
    ['Rx', this.prescriptions().length],
    ['Labs', this.labRequests().length],
  ]));
  readonly dashboardProfile = computed(() => {
    const role = this.session()?.role ?? '';
    const profiles: Record<string, { eyebrow: string; title: string; summary: string }> = {
      ADMIN: { eyebrow: 'System Control', title: 'Security, users, and platform readiness', summary: 'Review accounts, service health, departments, and operational exceptions.' },
      HR_MANAGER: { eyebrow: 'HR Desk', title: 'Employee onboarding and staff readiness', summary: 'Maintain employee records, account invitations, department assignment, and staff status.' },
      RECEPTIONIST: { eyebrow: 'Front Desk', title: 'Patient intake, assignment, and queue flow', summary: 'Register patients, select insurance, book doctors, and manage waiting patients.' },
      DOCTOR: { eyebrow: 'Doctor Workspace', title: 'Assigned patients and clinical decisions', summary: 'Open assigned patients, review history, record encounters, diagnoses, prescriptions, and lab requests.' },
      NURSE: { eyebrow: 'Nursing Desk', title: 'Patient preparation and vitals capture', summary: 'Prepare patients for consultation and keep vital signs current for the care team.' },
      LAB_TECHNICIAN: { eyebrow: 'Laboratory Desk', title: 'Lab request review and result workflow', summary: 'Track requested tests and move laboratory work through the operations queue.' },
      PHARMACIST: { eyebrow: 'Pharmacy Desk', title: 'Prescription review and dispensing control', summary: 'Review prescriptions, prepare dispensing tasks, and coordinate medication charges.' },
      ACCOUNTANT: { eyebrow: 'Finance Desk', title: 'Invoice review, balances, and revenue visibility', summary: 'Create invoices, monitor balances, insurance claims, and finance reporting.' },
      CASHIER: { eyebrow: 'Cashier Desk', title: 'Payment collection and receipt printing', summary: 'Collect payments, print receipts, and keep invoice balances accurate.' },
    };

    return profiles[role] ?? { eyebrow: 'Hospital Command', title: 'Hospital operations snapshot', summary: 'Follow patient flow, clinical activity, service readiness, and revenue status.' };
  });
  readonly dashboardWorkItems = computed(() => {
    const role = this.session()?.role ?? '';
    const today = new Date().toISOString().slice(0, 10);
    const assignedAppointments = this.visibleAppointments().filter((item) => item.startsAtUtc.slice(0, 10) === today);
    const unpaidInvoices = this.invoices().filter((invoice) => invoice.balance > 0 && !['Cancelled', 'Voided'].includes(invoice.status));
    const openOperations = this.enterpriseRecords().filter((record) => !['Completed', 'Closed'].includes(record.status));

    if (role === 'RECEPTIONIST') {
      return [
        ['Register patient', `${this.patients().length} patients in registry`],
        ['Book appointment', `${this.appointments().filter((item) => item.startsAtUtc.slice(0, 10) === today).length} appointment(s) today`],
        ['Queue handoff', `${this.appointments().filter((item) => item.queueStatus === 'Waiting').length} waiting`],
      ];
    }

    if (role === 'DOCTOR') {
      return [
        ['Assigned queue', `${assignedAppointments.length} appointment(s) today`],
        ['Clinical history', `${this.visiblePatients().length} assigned patient record(s)`],
        ['Open orders', `${this.visibleClinicalRows(this.labRequests()).filter((item) => item.status !== 'Completed').length} lab request(s)`],
      ];
    }

    if (role === 'NURSE') {
      return [
        ['Vitals capture', `${this.vitals().length} vital record(s)`],
        ['Patient preparation', `${this.appointments().filter((item) => ['Scheduled', 'Waiting'].includes(item.queueStatus)).length} patient(s) waiting`],
        ['Care handoff', `${this.encounters().length} clinical encounter(s)`],
      ];
    }

    if (['ACCOUNTANT', 'CASHIER'].includes(role)) {
      return [
        ['Open balances', this.money(unpaidInvoices.reduce((sum, invoice) => sum + invoice.balance, 0))],
        ['Payments today', `${this.payments().filter((payment) => payment.paidAtUtc.slice(0, 10) === today).length} payment(s)`],
        ['Receipts', `${this.receipts().length} receipt(s)`],
      ];
    }

    return [
      ['Service readiness', `${this.services().filter((service) => service.status === 'Running').length}/${this.services().length || 5} running`],
      ['Open operations', `${openOperations.length} work item(s)`],
      ['Hospital queue', `${this.appointments().filter((item) => ['Scheduled', 'Waiting', 'In Service'].includes(item.queueStatus)).length} active`],
    ];
  });
  readonly communicationWorkflow = computed(() => [
    { role: 'Reception', action: 'Registers patient, verifies insurance, assigns department and doctor', status: `${this.appointments().filter((item) => item.queueStatus === 'Scheduled' || item.queueStatus === 'Waiting').length} waiting` },
    { role: 'Nursing', action: 'Captures vitals and prepares the patient for consultation', status: `${this.vitals().length} vitals` },
    { role: 'Doctor', action: 'Reviews history, records encounter, diagnosis, prescription, and lab orders', status: `${this.encounters().length} visits` },
    { role: 'Laboratory / Pharmacy', action: 'Processes orders and updates operational worklists', status: `${this.labRequests().length + this.prescriptions().length} orders` },
    { role: 'Billing / Cashier', action: 'Creates invoice, collects payment, and prints receipt', status: `${this.invoices().filter((invoice) => invoice.balance > 0).length} open` },
  ]);
  readonly activeEnterpriseModule = computed(() => this.enterpriseModules.find((module) => module.id === this.enterpriseTab()) ?? this.enterpriseModules[0]);
  readonly enterpriseRows = computed(() => this.enterpriseRecords().filter((record) => record.area === this.activeEnterpriseModule().area));
  readonly enterpriseWorkflow = computed(() => this.activeEnterpriseModule().workflow);
  readonly enterpriseKpis = computed(() => {
    const records = this.enterpriseRecords();
    const open = records.filter((record) => !['Completed', 'Closed'].includes(record.status));
    const highPriority = records.filter((record) => record.priority === 'High' && !['Completed', 'Closed'].includes(record.status));
    return [
      { label: 'Service Areas', value: this.enterpriseModules.length, hint: 'Departments available in the enterprise workspace', tone: 'bg-brand-50 text-brand-700' },
      { label: 'Open Work', value: open.length, hint: 'Active records that still need attention', tone: 'bg-blue-50 text-blue-700' },
      { label: 'High Priority', value: highPriority.length, hint: 'Urgent clinical, operational, or finance items', tone: 'bg-amber-50 text-amber-700' },
      { label: 'Completed', value: records.filter((record) => record.status === 'Completed').length, hint: 'Closed operational records', tone: 'bg-emerald-50 text-emerald-700' },
    ];
  });
  readonly enterpriseOperationalMetrics = computed(() => [
    { label: 'Average Waiting Time', value: `${this.averageWaitMinutes()} min`, hint: 'Current outpatient queue pressure' },
    { label: 'Doctor Utilization', value: `${this.doctorUtilization()}%`, hint: 'Doctors with active queue work' },
    { label: 'Bed Occupancy', value: `${this.bedOccupancyRate()}%`, hint: 'Occupied beds from the bed board' },
    { label: 'No-show Rate', value: `${this.noShowRate()}%`, hint: 'Appointments marked as no-show' },
    { label: 'Insurance Outstanding', value: this.money(this.insuranceOutstanding()), hint: 'Open insured patient balance' },
    { label: 'Operations Value', value: this.money(this.enterpriseRecords().reduce((sum, record) => sum + record.amount, 0)), hint: 'Value tracked across enterprise records' },
  ]);

  readonly enterpriseModules: EnterpriseModule[] = [
    { id: 'pharmacy', label: 'Pharmacy', area: 'Pharmacy', department: 'Pharmacy', owner: 'Pharmacist', action: 'Dispense Medication', description: 'Prescription review, dispensing, stock posting, counselling, controlled-drug handling, and pharmacy billing.', workflow: ['Review prescription', 'Check stock and safety', 'Dispense medication', 'Post stock movement', 'Send charge to billing', 'Counsel patient'] },
    { id: 'laboratory', label: 'Laboratory', area: 'Laboratory', department: 'Laboratory', owner: 'Lab Technician', action: 'Process Result', description: 'Specimen collection, test processing, result verification, abnormal flagging, and release to the clinician.', workflow: ['Receive request', 'Collect specimen', 'Run test', 'Verify result', 'Release report', 'Notify clinician'] },
    { id: 'radiology', label: 'Radiology', area: 'Radiology', department: 'Radiology', owner: 'Radiology Officer', action: 'Schedule Imaging', description: 'Imaging orders, modality schedule, reporting, image references, and doctor notification.', workflow: ['Receive imaging order', 'Schedule modality', 'Capture image', 'Prepare report', 'Attach reference', 'Release to doctor'] },
    { id: 'inpatient', label: 'Inpatient', area: 'Inpatient', department: 'Medical Ward', owner: 'Charge Nurse', action: 'Manage Admission', description: 'Admissions, transfers, bed occupancy, nursing notes, care plan, medication administration, and discharge preparation.', workflow: ['Admit patient', 'Assign bed', 'Create care plan', 'Record nursing notes', 'Prepare discharge', 'Close admission'] },
    { id: 'emergency', label: 'Emergency', area: 'Emergency', department: 'Emergency', owner: 'ER Nurse', action: 'Triage Case', description: 'Triage, priority queue, emergency visit handling, stabilization, and ward handoff.', workflow: ['Register emergency case', 'Assign triage level', 'Stabilize patient', 'Call clinician', 'Order investigations', 'Admit or discharge'] },
    { id: 'theatre', label: 'Operating Theatre', area: 'Operating Theatre', department: 'Operating Theatre', owner: 'Theatre Coordinator', action: 'Schedule Surgery', description: 'Surgery schedule, theatre availability, checklist, anesthesia readiness, recovery, and utilization review.', workflow: ['Book theatre', 'Confirm team', 'Complete checklist', 'Prepare anesthesia', 'Record recovery', 'Update theatre utilization'] },
    { id: 'inventory', label: 'Inventory', area: 'Inventory', department: 'Main Store', owner: 'Store Keeper', action: 'Post Stock Movement', description: 'Stock ledger, reorder level, expiry alerts, department issue, receiving, and stock adjustment.', workflow: ['Review stock level', 'Create movement', 'Approve issue', 'Update ledger', 'Check expiry', 'Notify department'] },
    { id: 'procurement', label: 'Procurement', area: 'Procurement', department: 'Procurement', owner: 'Procurement Officer', action: 'Raise Purchase Request', description: 'Purchase requests, approval, supplier quotation, purchase order, goods receiving, and supplier tracking.', workflow: ['Raise request', 'Review budget', 'Collect quotation', 'Approve order', 'Receive goods', 'Close purchase'] },
    { id: 'assets', label: 'Assets', area: 'Asset Management', department: 'Administration', owner: 'Asset Officer', action: 'Register Asset', description: 'Asset register, custodian assignment, warranty, depreciation, transfer, and disposal control.', workflow: ['Register asset', 'Assign custodian', 'Record location', 'Schedule inspection', 'Track warranty', 'Retire asset'] },
    { id: 'biomedical', label: 'Biomedical', area: 'Biomedical Maintenance', department: 'Biomedical', owner: 'Biomedical Engineer', action: 'Create Work Order', description: 'Equipment maintenance, calibration, spare parts, downtime tracking, and vendor service history.', workflow: ['Log fault', 'Assign engineer', 'Diagnose issue', 'Record parts', 'Calibrate equipment', 'Release to service'] },
    { id: 'claims', label: 'Insurance Claims', area: 'Insurance Claims', department: 'Billing', owner: 'Claims Officer', action: 'Prepare Claim', description: 'Eligibility, claim preparation, submission, rejection handling, remittance, and outstanding follow-up.', workflow: ['Check eligibility', 'Attach invoice', 'Prepare claim', 'Submit payer file', 'Post remittance', 'Follow outstanding'] },
    { id: 'security', label: 'Security Audit', area: 'Security Audit', department: 'Administration', owner: 'System Admin', action: 'Log Audit Review', description: 'Access review, role audit, password setup review, session checks, consent monitoring, and security exceptions.', workflow: ['Select review area', 'Check user access', 'Record exception', 'Assign correction', 'Approve closure', 'Archive evidence'] },
    { id: 'notifications', label: 'Notifications', area: 'Notifications', department: 'IT', owner: 'System Admin', action: 'Send Notification Task', description: 'Email, SMS, appointment reminders, queue alerts, payment alerts, retry tracking, and delivery follow-up.', workflow: ['Choose channel', 'Prepare message', 'Send or queue', 'Track delivery', 'Retry failed item', 'Close notification'] },
    { id: 'documents', label: 'Documents', area: 'Documents', department: 'Records', owner: 'Records Officer', action: 'Index Document', description: 'Patient documents, consent forms, scanned attachments, image references, storage metadata, and access audit.', workflow: ['Receive document', 'Select patient', 'Index metadata', 'Store reference', 'Confirm access', 'Audit retrieval'] },
    { id: 'reporting', label: 'Reporting', area: 'Reporting', department: 'Finance', owner: 'Reporting Officer', action: 'Prepare Report', description: 'Daily performance pack, revenue, queue, bed occupancy, department workload, A/R, and inventory alerts.', workflow: ['Collect data', 'Validate figures', 'Prepare report', 'Review exceptions', 'Share dashboard', 'Archive snapshot'] },
    { id: 'integration', label: 'Integration', area: 'Integration', department: 'IT', owner: 'Integration Officer', action: 'Register Integration', description: 'Payment gateway, SMS gateway, payer integration, lab equipment, external API contract, and reconciliation readiness.', workflow: ['Register endpoint', 'Store credentials', 'Test request', 'Map response', 'Monitor failures', 'Reconcile transactions'] },
  ];

  readonly nav: Array<{ id: Section; label: string; roles: string[] }> = [
    { id: 'dashboard', label: 'Dashboard', roles: ['ALL'] },
    { id: 'operations', label: 'System Health', roles: ['ADMIN'] },
    { id: 'admin', label: 'Access Control', roles: ['ADMIN'] },
    { id: 'enterprise', label: 'Operations Workbench', roles: ['ADMIN'] },
    { id: 'employees', label: 'Staff Directory', roles: ['ADMIN', 'HR_MANAGER'] },
    { id: 'patients', label: 'Patients', roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'] },
    { id: 'insurance', label: 'Insurance', roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'] },
    { id: 'appointments', label: 'Appointments', roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR'] },
    { id: 'clinical', label: 'Clinical', roles: ['ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'PHARMACIST'] },
    { id: 'billing', label: 'Billing', roles: ['ADMIN', 'ACCOUNTANT', 'CASHIER'] },
  ];

  constructor(private api: ApiService) {
    const url = new URL(window.location.href);
    this.setupToken = url.searchParams.get('token') ?? '';
    this.setupMode.set(url.pathname.includes('setup-password') && !!this.setupToken);
    this.forgotMode.set(url.pathname.includes('forgot-password'));
  }

  login() {
    this.loading.set(true);
    this.api.login(this.emailAddress, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.api.storeSession(res.data);
        this.toast('success', `Welcome ${res.data.role}`);
        this.loadAll();
      },
      error: () => {
        this.loading.set(false);
        this.toast('error', 'Login failed. Check your credentials or complete password setup first.');
      },
    });
  }

  setupPassword() {
    if (this.setupPasswordForm.password !== this.setupPasswordForm.confirmPassword) {
      this.toast('error', 'Passwords do not match.');
      return;
    }

    this.loading.set(true);
    this.api.setupPassword({ token: this.setupToken, password: this.setupPasswordForm.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.setupMode.set(false);
        this.setupPasswordForm = { password: '', confirmPassword: '' };
        window.history.replaceState({}, document.title, '/');
        this.toast('success', 'Password created. Please sign in.');
      },
      error: () => {
        this.loading.set(false);
        this.toast('error', 'Password setup failed. The link may be expired or the password may be too weak.');
      },
    });
  }

  showForgotPassword() {
    this.forgotPasswordForm.emailAddress = this.emailAddress;
    this.forgotMode.set(true);
    window.history.replaceState({}, document.title, '/forgot-password');
  }

  backToLogin() {
    this.forgotMode.set(false);
    this.setupMode.set(false);
    window.history.replaceState({}, document.title, '/');
  }

  requestPasswordReset() {
    this.loading.set(true);
    this.api.forgotPassword(this.forgotPasswordForm.emailAddress).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.data?.setupUrl) {
          this.copySetupUrl(res.data.setupUrl);
        }
        this.toast('success', 'Password reset request processed.');
      },
      error: () => {
        this.loading.set(false);
        this.toast('error', 'Password reset request failed.');
      },
    });
  }

  logout() {
    this.stopCamera();
    this.api.clearSession();
    this.active.set('dashboard');
  }

  canSee(item: { roles: string[] }, session: LoginResponse | null) {
    return !!session && (item.roles.includes('ALL') || item.roles.includes(session.role));
  }

  canAccess(section: Section) {
    const item = this.nav.find((navItem) => navItem.id === section);
    return item ? this.canSee(item, this.session()) : false;
  }

  hasRole(...roles: string[]) {
    const role = this.session()?.role;
    return !!role && roles.includes(role);
  }

  loggedDoctorId() {
    const session = this.session();
    return session?.role === 'DOCTOR' ? session.employeeId : '';
  }

  load(section: Section) {
    if (!this.canAccess(section)) {
      this.toast('error', 'This role is not allowed to open that workspace.');
      return;
    }

    this.active.set(section);
    this.search.set('');
    this.loadAll();
  }

  loadAll() {
    const session = this.session();
    if (!session) {
      return;
    }

    this.loading.set(true);
    let pending = 0;
    let failed = false;
    const done = () => {
      pending -= 1;
      if (pending === 0) {
        this.loading.set(false);
        this.syncDefaultSelections();
      }
    };
    const fail = () => {
      if (!failed) {
        failed = true;
        this.toast('error', 'Some data could not load. Check backend services.');
      }
      done();
    };
    const load = <T>(request: Observable<T>, next: (res: T) => void) => {
      pending += 1;
      request.subscribe({ next: (res) => { next(res); done(); }, error: fail });
    };

    const needsPatients = this.canAccess('patients') || this.canAccess('appointments') || this.canAccess('clinical') || this.canAccess('billing') || this.canAccess('enterprise');
    const needsAppointments = this.canAccess('appointments') || this.canAccess('patients') || this.canAccess('clinical');
    const needsClinical = this.canAccess('clinical') || this.canAccess('enterprise');
    const needsBilling = this.canAccess('billing') || this.canAccess('enterprise');
    const needsInsurance = this.canAccess('insurance') || this.canAccess('patients') || this.canAccess('billing');
    const needsEmployees = this.canAccess('employees') || this.canAccess('admin') || this.canAccess('appointments') || this.canAccess('clinical') || this.hasRole('ADMIN', 'HR_MANAGER');

    load(this.api.getDepartments(), (res) => this.departments.set(res.data ?? []));
    load(this.api.getDoctors(), (res) => this.doctorProfiles.set(res.data ?? []));

    if (needsEmployees) {
      load(this.api.getEmployees(), (res) => this.employees.set(res.data ?? []));
    }

    if (this.hasRole('ADMIN', 'HR_MANAGER')) {
      load(this.api.getRoles(), (res) => this.roles.set(res.data ?? []));
      load(this.api.getEmailOutbox(), (res) => this.emailOutbox.set(res.data ?? []));
    }

    if (this.hasRole('ADMIN')) {
      load(this.api.getPermissions(), (res) => this.permissions.set(res.data ?? []));
      load(this.api.getServiceStatuses(), (res) => this.services.set(res ?? []));
    }

    if (needsPatients) {
      load(this.api.getPatients(), (res) => this.patients.set(res.data ?? []));
    }

    if (needsInsurance) {
      load(this.api.getInsuranceCompanies(), (res) => this.insuranceCompanies.set(res.data ?? []));
    }

    if (needsAppointments) {
      load(this.api.getAppointments(), (res) => this.appointments.set(res.data ?? []));
      load(this.api.getQueueSummary(), (res) => this.queueSummary.set(res.data ?? []));
      load(this.api.getBeds(), (res) => this.beds.set(res.data ?? []));
    }

    if (needsClinical) {
      load(this.api.getEncounters(), (res) => this.encounters.set(res.data ?? []));
      load(this.api.getVitals(), (res) => this.vitals.set(res.data ?? []));
      load(this.api.getDiagnoses(), (res) => this.diagnoses.set(res.data ?? []));
      load(this.api.getPrescriptions(), (res) => this.prescriptions.set(res.data ?? []));
      load(this.api.getLabRequests(), (res) => this.labRequests.set(res.data ?? []));
      load(this.api.getEnterpriseRecords(), (res) => this.enterpriseRecords.set(res.data ?? []));
    }

    if (needsBilling) {
      load(this.api.getInvoices(), (res) => this.invoices.set(res.data ?? []));
      load(this.api.getPayments(), (res) => this.payments.set(res.data ?? []));
      load(this.api.getReceipts(), (res) => this.receipts.set(res.data ?? []));
    }

    if (pending === 0) {
      this.loading.set(false);
    }
  }

  openCreateEmployee() {
    this.editingEmployeeId = '';
    this.employeeForm = this.defaultEmployeeForm();
    this.modal.set('employee');
  }

  createEmployee() {
    if (!this.validateEmployeeForm()) {
      return;
    }

    this.saving.set(true);
    this.api.createEmployee(this.employeeForm).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.modal.set(null);
        this.employeeForm = this.defaultEmployeeForm();
        this.copySetupUrl(res.data.setupUrl);
        this.toast('success', 'User created and password setup invitation prepared.');
        this.loadAll();
      },
      error: () => {
        this.saving.set(false);
        this.toast('error', 'User creation failed. Check required fields and duplicate email.');
      },
    });
  }

  openEmployeeEditor(employee: Employee) {
    this.editingEmployeeId = employee.id;
    this.employeeForm = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      emailAddress: employee.emailAddress,
      phone: employee.phone ?? '',
      role: employee.role,
      department: employee.department ?? '',
      specialization: employee.specialization ?? '',
    };
    this.modal.set('employeeEdit');
  }

  updateEmployee() {
    if (!this.editingEmployeeId) {
      this.toast('error', 'No employee selected for editing.');
      return;
    }

    if (!this.validateEmployeeForm()) {
      return;
    }

    this.save(this.api.updateEmployee(this.editingEmployeeId, this.employeeForm), 'Employee updated.', () => {
      this.editingEmployeeId = '';
      this.employeeForm = this.defaultEmployeeForm();
    });
  }

  toggleEmployeeStatus(employee: Employee) {
    const nextState = !employee.isActive;
    this.saving.set(true);
    this.api.updateEmployeeStatus(employee.id, nextState).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast('success', nextState ? 'Employee enabled.' : 'Employee disabled.');
        this.loadAll();
      },
      error: () => {
        this.saving.set(false);
        this.toast('error', 'Employee status could not be updated.');
      },
    });
  }

  resendInvite(employee: Employee) {
    this.saving.set(true);
    this.api.resendEmployeeInvite(employee.id).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.copySetupUrl(res.data.setupUrl);
        this.toast('success', 'Password setup invitation prepared again.');
        this.loadAll();
      },
      error: () => {
        this.saving.set(false);
        this.toast('error', 'Invitation could not be prepared.');
      },
    });
  }

  copyLatestEmailLink(employee: Employee) {
    this.api.getLatestEmailLink(employee.emailAddress).subscribe({
      next: (res) => this.copySetupUrl(res.data.setupUrl),
      error: () => this.toast('error', 'No email setup link found for this user.'),
    });
  }

  openEnterpriseRecord() {
    const module = this.activeEnterpriseModule();
    this.editingEnterpriseRecordId = '';
    this.enterpriseRecordForm = {
      area: module.area,
      patientId: '',
      title: '',
      department: module.department,
      owner: module.owner,
      priority: 'Normal',
      status: 'Open',
      amount: 0,
      dueAtUtc: this.localDateTimeValue(1),
      details: '',
    };
    this.modal.set('enterpriseRecord');
  }

  createEnterpriseRecord() {
    if (!this.enterpriseRecordForm.title.trim()) {
      this.toast('error', 'Record title is required.');
      return;
    }

    const payload = {
      ...this.enterpriseRecordForm,
      patientId: this.enterpriseRecordForm.patientId || undefined,
      amount: Number(this.enterpriseRecordForm.amount) || 0,
      dueAtUtc: new Date(this.enterpriseRecordForm.dueAtUtc).toISOString(),
    };

    this.save(this.api.createEnterpriseRecord(payload), 'Operational record saved.', () => {
      const module = this.activeEnterpriseModule();
      this.enterpriseRecordForm = { area: module.area, patientId: '', title: '', department: module.department, owner: module.owner, priority: 'Normal', status: 'Open', amount: 0, dueAtUtc: this.localDateTimeValue(1), details: '' };
    });
  }

  openEnterpriseRecordEditor(record: EnterpriseRecord) {
    this.editingEnterpriseRecordId = record.id;
    this.enterpriseRecordForm = {
      area: record.area,
      patientId: record.patientId ?? '',
      title: record.title,
      department: record.department,
      owner: record.owner,
      priority: record.priority,
      status: record.status,
      amount: record.amount,
      dueAtUtc: this.toLocalDateTimeInput(record.dueAtUtc),
      details: record.details,
    };
    this.modal.set('enterpriseRecordEdit');
  }

  updateEnterpriseRecord() {
    if (!this.editingEnterpriseRecordId) {
      this.toast('error', 'No operational record selected for editing.');
      return;
    }

    if (!this.enterpriseRecordForm.title.trim()) {
      this.toast('error', 'Record title is required.');
      return;
    }

    const payload = {
      ...this.enterpriseRecordForm,
      patientId: this.enterpriseRecordForm.patientId || undefined,
      amount: Number(this.enterpriseRecordForm.amount) || 0,
      dueAtUtc: new Date(this.enterpriseRecordForm.dueAtUtc).toISOString(),
    };

    this.save(this.api.updateEnterpriseRecord(this.editingEnterpriseRecordId, payload), 'Operational record updated.', () => {
      this.editingEnterpriseRecordId = '';
      const module = this.activeEnterpriseModule();
      this.enterpriseRecordForm = { area: module.area, patientId: '', title: '', department: module.department, owner: module.owner, priority: 'Normal', status: 'Open', amount: 0, dueAtUtc: this.localDateTimeValue(1), details: '' };
    });
  }

  setEnterpriseRecordStatus(record: EnterpriseRecord, status: string) {
    this.saving.set(true);
    this.api.updateEnterpriseRecordStatus(record.id, status).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast('success', 'Status updated.');
        this.loadAll();
      },
      error: () => {
        this.saving.set(false);
        this.toast('error', 'Status update failed.');
      },
    });
  }

  createRole() {
    if (!this.newRoleForm.role.trim() || !this.newRoleForm.description.trim()) {
      this.toast('error', 'Role code and description are required.');
      return;
    }

    const permissions = this.newRoleForm.permissionsText
      .split(',')
      .map((permission) => permission.trim())
      .filter(Boolean);

    this.save(this.api.createRole({
      role: this.newRoleForm.role,
      description: this.newRoleForm.description,
      permissions,
    }), 'Role created.', () => {
      this.newRoleForm = { role: '', description: '', permissionsText: '' };
    });
  }

  openRoleEditor(role: RolePermission) {
    this.roleForm = {
      role: role.role,
      description: role.description,
      permissionsText: role.permissions.join(', '),
    };
    this.modal.set('role');
  }

  updateRole() {
    const permissions = this.roleForm.permissionsText
      .split(',')
      .map((permission) => permission.trim())
      .filter(Boolean);

    this.save(
      this.api.updateRole(this.roleForm.role, {
        description: this.roleForm.description,
        permissions,
      }),
      'Role permissions updated.',
      () => {}
    );
  }

  createPermission() {
    if (!this.permissionForm.key.trim() || !this.permissionForm.description.trim() || !this.permissionForm.module.trim()) {
      this.toast('error', 'Permission key, description, and module are required.');
      return;
    }

    this.save(this.api.createPermission(this.permissionForm), 'Permission saved.', () => {
      this.permissionForm = { key: '', description: '', module: 'Administration' };
    });
  }

  createDepartment() {
    if (!this.departmentForm.code.trim() || !this.departmentForm.name.trim() || !this.departmentForm.type.trim() || !this.departmentForm.location.trim()) {
      this.toast('error', 'Department code, name, type, and location are required.');
      return;
    }

    this.save(this.api.createDepartment(this.departmentForm), 'Department saved.', () => {
      this.departmentForm = { code: '', name: '', type: 'Clinical', location: 'Main Campus' };
    });
  }

  createInsuranceCompany() {
    if (!this.insuranceForm.name.trim() || !this.insuranceForm.payerCode.trim() || !this.insuranceForm.phone.trim()) {
      this.toast('error', 'Insurance company name, payer code, and phone are required.');
      return;
    }

    if (this.insuranceForm.email && !this.isValidEmail(this.insuranceForm.email)) {
      this.toast('error', 'Enter a valid insurance company email address or leave it empty.');
      return;
    }

    if (!Number.isFinite(Number(this.insuranceForm.coveragePercent)) || this.insuranceForm.coveragePercent < 0 || this.insuranceForm.coveragePercent > 100) {
      this.toast('error', 'Coverage percent must be between 0 and 100.');
      return;
    }

    this.save(this.api.createInsuranceCompany(this.insuranceForm), 'Insurance company registered.', () => {
      this.insuranceForm = { name: '', payerCode: '', contactPerson: '', phone: '', email: '', address: '', coverageType: 'Corporate', coveragePercent: 80 };
    });
  }

  openCreatePatient() {
    this.editingPatientId = '';
    this.selectedPatient.set(null);
    this.patientForm = this.emptyPatient();
    this.patientIntakeForm = this.emptyPatientIntakeForm();
    this.modal.set('patient');
  }

  createPatient() {
    if (!this.validatePatientForm()) {
      return;
    }

    if (!this.validatePatientIntakeForm()) {
      return;
    }

    const payload = {
      ...this.patientForm,
      insuranceCompanyId: this.patientForm.insuranceCompanyId || undefined,
    };

    this.saving.set(true);
    this.api.createPatient(payload).subscribe({
      next: (res) => {
        const patient = res.data;
        if (!this.patientIntakeForm.createAppointment) {
          this.saving.set(false);
          this.modal.set(null);
          this.patientForm = this.emptyPatient();
          this.patientIntakeForm = this.emptyPatientIntakeForm();
          this.toast('success', 'Patient registered and RabbitMQ event published.');
          this.loadAll();
          return;
        }

        this.api.createAppointment({
          patientId: patient.id,
          doctorId: this.patientIntakeForm.doctorId,
          startsAtUtc: new Date(this.patientIntakeForm.startsAtUtc).toISOString(),
          reason: this.patientIntakeForm.reason,
          department: this.patientIntakeForm.department,
          appointmentType: this.patientIntakeForm.appointmentType,
          priority: this.patientIntakeForm.priority,
          notes: this.patientIntakeForm.notes,
        }).subscribe({
          next: () => {
            this.saving.set(false);
            this.modal.set(null);
            this.patientForm = this.emptyPatient();
            this.patientIntakeForm = this.emptyPatientIntakeForm();
            this.toast('success', 'Patient registered, doctor assigned, and queue created.');
            this.loadAll();
          },
          error: () => {
            this.saving.set(false);
            this.toast('error', 'Patient was registered, but the appointment assignment failed. Book the appointment from Appointments.');
            this.loadAll();
          },
        });
      },
      error: () => {
        this.saving.set(false);
        this.toast('error', 'Patient registration failed. Check required fields and service logs.');
      },
    });
  }

  openPatientDetails(patient: Patient) {
    this.selectedPatient.set(patient);
    this.modal.set('patientView');
  }

  openPatientEditor(patient: Patient) {
    this.editingPatientId = patient.id;
    this.selectedPatient.set(patient);
    this.patientForm = this.patientToForm(patient);
    this.modal.set('patientEdit');
  }

  updatePatient() {
    if (!this.editingPatientId) {
      this.toast('error', 'No patient selected for editing.');
      return;
    }

    if (!this.validatePatientForm()) {
      return;
    }

    const payload = {
      ...this.patientForm,
      insuranceCompanyId: this.patientForm.insuranceCompanyId || undefined,
    };

    this.save(this.api.updatePatient(this.editingPatientId, payload), 'Patient information updated.', () => {
      this.editingPatientId = '';
      this.selectedPatient.set(null);
      this.patientForm = this.emptyPatient();
    });
  }

  openAppointmentModal() {
    this.appointmentForm = {
      patientId: '',
      doctorId: '',
      startsAtUtc: this.localDateTimeValue(1),
      reason: '',
      department: '',
      appointmentType: 'Consultation',
      priority: 'Normal',
      notes: '',
    };
    this.modal.set('appointment');
  }

  createAppointment() {
    if (!this.appointmentForm.patientId || !this.appointmentForm.department || !this.appointmentForm.doctorId || !this.appointmentForm.reason.trim()) {
      this.toast('error', 'Select patient, department, doctor, and enter the visit reason.');
      return;
    }

    if (!this.appointmentDoctors().some((doctor) => doctor.id === this.appointmentForm.doctorId)) {
      this.toast('error', 'Selected doctor does not belong to the selected department.');
      return;
    }

    this.save(this.api.createAppointment({ ...this.appointmentForm, startsAtUtc: new Date(this.appointmentForm.startsAtUtc).toISOString() }), 'Appointment booked.', () => {
      this.appointmentForm = {
        patientId: '',
        doctorId: '',
        startsAtUtc: this.localDateTimeValue(1),
        reason: '',
        department: '',
        appointmentType: 'Consultation',
        priority: 'Normal',
        notes: '',
      };
    });
  }

  setAppointmentStatus(appointment: Appointment, status: string) {
    this.save(this.api.updateAppointmentStatus(appointment.id, status), `Queue moved to ${status}.`, () => {});
  }

  startService(service: ServiceStatus) {
    this.saving.set(true);
    this.api.startService(service.id).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toast('success', res.message);
        window.setTimeout(() => this.loadAll(), 1800);
      },
      error: () => {
        this.saving.set(false);
        this.toast('error', 'Service start is available only when the gateway runs locally in Development mode.');
      },
    });
  }

  openClinicalModal(kind: 'encounter' | 'vitals' | 'diagnosis' | 'prescription' | 'lab') {
    if (!this.clinicalPatientOptions().length) {
      this.toast('info', 'No assigned patients are available for clinical entry.');
      return;
    }

    if (kind === 'encounter') this.encounterForm = this.emptyEncounterForm();
    if (kind === 'vitals') this.vitalsForm = this.emptyVitalsForm();
    if (kind === 'diagnosis') this.diagnosisForm = this.emptyDiagnosisForm();
    if (kind === 'prescription') this.prescriptionForm = this.emptyPrescriptionForm();
    if (kind === 'lab') this.labForm = this.emptyLabForm();

    this.modal.set(kind);
  }

  toggleMedication(name: string, event: Event) {
    this.toggleStringSelection(this.prescriptionForm.selectedMedications, name, event);
  }

  toggleDiagnosticTest(name: string, event: Event) {
    this.toggleStringSelection(this.labForm.selectedTests, name, event);
    const categories = this.selectedDiagnosticCategories();
    this.labForm.category = categories.length ? categories.join(', ') : 'Laboratory';
    if (categories.length && categories.every((category) => category.includes('Imaging'))) {
      this.labForm.specimenType = 'Imaging study';
    }
  }

  isMedicationSelected(name: string) {
    return this.prescriptionForm.selectedMedications.includes(name);
  }

  isDiagnosticSelected(name: string) {
    return this.labForm.selectedTests.includes(name);
  }

  selectedPrescriptionMedications() {
    return this.uniqueTextValues([
      ...this.prescriptionForm.selectedMedications,
      this.prescriptionForm.customMedication,
    ]);
  }

  selectedDiagnosticTests() {
    return this.uniqueTextValues([
      ...this.labForm.selectedTests,
      this.labForm.testName,
    ]);
  }

  selectedDiagnosticCategories() {
    const selected = new Set(this.labForm.selectedTests);
    return this.diagnosticOrderCatalog
      .filter((group) => group.items.some((item) => selected.has(item)))
      .map((group) => group.category);
  }

  createEncounter() {
    const doctorId = this.resolveClinicalDoctorId(this.encounterForm.doctorId);
    if (!this.validateRequiredClinicalFields([
      [this.encounterForm.patientId, 'Select the patient.'],
      [doctorId, 'Select the doctor.'],
      [this.encounterForm.visitType, 'Select the visit type.'],
      [this.encounterForm.chiefComplaint, 'Chief complaint is required.'],
      [this.encounterForm.assessment, 'Assessment is required.'],
      [this.encounterForm.plan, 'Plan is required.'],
    ])) {
      return;
    }

    this.save(this.api.createEncounter({ ...this.encounterForm, doctorId }), 'Clinical encounter saved.', () => {
      this.encounterForm = this.emptyEncounterForm();
    });
  }

  createVitals() {
    if (!this.validateRequiredClinicalFields([
      [this.vitalsForm.patientId, 'Select the patient.'],
      [this.vitalsForm.bloodPressure, 'Blood pressure is required.'],
    ])) {
      return;
    }

    const temperatureC = Number(this.vitalsForm.temperatureC);
    const pulse = Number(this.vitalsForm.pulse);
    const respiratoryRate = Number(this.vitalsForm.respiratoryRate);
    const weightKg = Number(this.vitalsForm.weightKg);
    const heightCm = Number(this.vitalsForm.heightCm);

    if (!this.validRange(temperatureC, 30, 45, 'Temperature must be between 30 and 45 C.')) return;
    if (!this.validRange(pulse, 20, 240, 'Pulse must be between 20 and 240.')) return;
    if (!this.validRange(respiratoryRate, 5, 80, 'Respiratory rate must be between 5 and 80.')) return;
    if (!this.validRange(weightKg, 1, 350, 'Weight must be between 1 and 350 kg.')) return;
    if (!this.validRange(heightCm, 30, 250, 'Height must be between 30 and 250 cm.')) return;

    this.save(this.api.createVitals({
      patientId: this.vitalsForm.patientId,
      temperatureC,
      pulse,
      respiratoryRate,
      bloodPressure: this.vitalsForm.bloodPressure.trim(),
      weightKg,
      heightCm,
    }), 'Vitals recorded.', () => {
      this.vitalsForm = this.emptyVitalsForm();
    });
  }

  createDiagnosis() {
    const doctorId = this.resolveClinicalDoctorId(this.diagnosisForm.doctorId);
    if (!this.validateRequiredClinicalFields([
      [this.diagnosisForm.patientId, 'Select the patient.'],
      [doctorId, 'Select the doctor.'],
      [this.diagnosisForm.code, 'Diagnosis code is required.'],
      [this.diagnosisForm.description, 'Diagnosis description is required.'],
      [this.diagnosisForm.severity, 'Select the severity.'],
    ])) {
      return;
    }

    this.save(this.api.createDiagnosis({ ...this.diagnosisForm, doctorId }), 'Diagnosis added.', () => {
      this.diagnosisForm = this.emptyDiagnosisForm();
    });
  }

  createPrescription() {
    const doctorId = this.resolveClinicalDoctorId(this.prescriptionForm.doctorId);
    const medications = this.selectedPrescriptionMedications();
    const medicationText = medications.join('; ');
    const instructionParts = [
      this.prescriptionForm.dose.trim() ? `Dose: ${this.prescriptionForm.dose.trim()}` : '',
      this.prescriptionForm.route.trim() ? `Route: ${this.prescriptionForm.route.trim()}` : '',
      this.prescriptionForm.frequency.trim() ? `Frequency: ${this.prescriptionForm.frequency.trim()}` : '',
      this.prescriptionForm.duration.trim() ? `Duration: ${this.prescriptionForm.duration.trim()}` : '',
      this.prescriptionForm.quantity.trim() ? `Quantity: ${this.prescriptionForm.quantity.trim()}` : '',
      this.prescriptionForm.instructions.trim() ? `Notes: ${this.prescriptionForm.instructions.trim()}` : '',
    ].filter(Boolean).join(' | ');

    if (!this.validateRequiredClinicalFields([
      [this.prescriptionForm.patientId, 'Select the patient.'],
      [doctorId, 'Select the doctor.'],
      [medicationText, 'Select at least one medication or enter a custom medication.'],
      [this.prescriptionForm.dose, 'Dose is required.'],
      [this.prescriptionForm.frequency, 'Frequency is required.'],
      [this.prescriptionForm.duration, 'Duration is required.'],
      [instructionParts, 'Prescription instructions are required.'],
    ])) {
      return;
    }

    this.prescriptionForm.medication = medicationText;
    this.prescriptionForm.instructions = instructionParts;

    this.save(this.api.createPrescription({
      patientId: this.prescriptionForm.patientId,
      doctorId,
      medication: medicationText,
      instructions: instructionParts,
    }), 'Prescription issued.', () => {
      this.prescriptionForm = this.emptyPrescriptionForm();
    });
  }

  createLabRequest() {
    const doctorId = this.resolveClinicalDoctorId(this.labForm.doctorId);
    const selectedTests = this.selectedDiagnosticTests();
    const testName = selectedTests.join('; ');
    const category = this.selectedDiagnosticCategories().join(', ') || this.labForm.category;

    if (!this.validateRequiredClinicalFields([
      [this.labForm.patientId, 'Select the patient.'],
      [doctorId, 'Select the doctor.'],
      [testName, 'Select at least one laboratory, imaging, or diagnostic order.'],
      [this.labForm.priority, 'Select the order priority.'],
    ])) {
      return;
    }

    this.labForm.testName = testName;
    this.labForm.category = category;

    this.save(this.api.createLabRequest({
      patientId: this.labForm.patientId,
      doctorId,
      testName,
      category,
      priority: this.labForm.priority,
      specimenType: this.labForm.specimenType,
      clinicalNote: this.labForm.clinicalNote,
    }), 'Diagnostic request created.', () => {
      this.labForm = this.emptyLabForm();
    });
  }

  openLabResult(row: LabRequest) {
    this.labResultForm = {
      id: row.id,
      status: row.status === 'Requested' ? 'Specimen Collected' : row.status,
      specimenType: row.specimenType || 'Whole blood',
      resultSummary: row.resultSummary || '',
      resultValue: row.resultValue || '',
      referenceRange: row.referenceRange || '',
      resultFlag: row.resultFlag || 'Normal',
      resultNotes: row.resultNotes || '',
      performedBy: row.performedBy || this.session()?.emailAddress || '',
      verifiedBy: row.verifiedBy || '',
      collectedAtUtc: this.toLocalDateTimeInput(row.collectedAtUtc || new Date().toISOString()),
      resultedAtUtc: this.toLocalDateTimeInput(row.resultedAtUtc || new Date().toISOString()),
    };
    this.modal.set('labResult');
  }

  updateLabResult() {
    if (!this.labResultForm.id) {
      this.toast('error', 'No lab request selected.');
      return;
    }

    if (!this.labResultForm.status.trim()) {
      this.toast('error', 'Select the laboratory status.');
      return;
    }

    if (['Result Entered', 'Verified', 'Completed'].includes(this.labResultForm.status) && !this.labResultForm.resultSummary.trim() && !this.labResultForm.resultValue.trim()) {
      this.toast('error', 'Enter the result summary or value before releasing the result.');
      return;
    }

    if (['Verified', 'Completed'].includes(this.labResultForm.status) && !this.labResultForm.verifiedBy.trim()) {
      this.toast('error', 'Verified by is required before completing the result.');
      return;
    }

    this.save(this.api.updateLabResult(this.labResultForm.id, {
      status: this.labResultForm.status,
      specimenType: this.labResultForm.specimenType,
      resultSummary: this.labResultForm.resultSummary,
      resultValue: this.labResultForm.resultValue,
      referenceRange: this.labResultForm.referenceRange,
      resultFlag: this.labResultForm.resultFlag,
      resultNotes: this.labResultForm.resultNotes,
      performedBy: this.labResultForm.performedBy,
      verifiedBy: this.labResultForm.verifiedBy,
      collectedAtUtc: this.labResultForm.collectedAtUtc ? new Date(this.labResultForm.collectedAtUtc).toISOString() : null,
      resultedAtUtc: this.labResultForm.resultedAtUtc ? new Date(this.labResultForm.resultedAtUtc).toISOString() : null,
    }), 'Lab result updated.', () => {
      this.labResultForm = this.emptyLabResultForm();
    });
  }

  createInvoice() {
    if (!this.validateInvoiceForm()) {
      return;
    }

    const item = {
      serviceCode: this.invoiceForm.serviceCode,
      description: this.invoiceForm.serviceDescription,
      quantity: Number(this.invoiceForm.quantity),
      unitPrice: Number(this.invoiceForm.unitPrice),
      discount: Number(this.invoiceForm.lineDiscount),
    };
    const amount = Math.max(0, item.quantity * item.unitPrice - item.discount);
    this.save(this.api.createInvoice({
      patientId: this.invoiceForm.patientId,
      description: this.invoiceForm.description,
      amount,
      discount: Number(this.invoiceForm.discount),
      tax: Number(this.invoiceForm.tax),
      paymentType: this.invoiceForm.paymentType,
      insuranceProvider: this.invoiceForm.insuranceProvider,
      items: [item],
    }), 'Invoice created.', () => {
      this.invoiceForm.description = 'Outpatient service invoice';
      this.invoiceForm.serviceCode = 'CONS';
      this.invoiceForm.serviceDescription = 'General consultation';
      this.invoiceForm.quantity = 1;
      this.invoiceForm.unitPrice = 350;
      this.invoiceForm.lineDiscount = 0;
      this.invoiceForm.discount = 0;
      this.invoiceForm.tax = 0;
    });
  }

  openInvoiceModal() {
    this.invoiceForm = { patientId: '', description: 'Outpatient service invoice', serviceCode: 'CONS', serviceDescription: 'General consultation', quantity: 1, unitPrice: 350, lineDiscount: 0, discount: 0, tax: 0, paymentType: 'Cash', insuranceProvider: '' };
    this.modal.set('invoice');
  }

  openPaymentModal() {
    this.paymentForm = { invoiceId: '', amount: 0, method: '', reference: '', receivedBy: 'Cashier' };
    this.modal.set('payment');
  }

  collectInvoice(invoice: Invoice) {
    if (invoice.balance <= 0 || ['Cancelled', 'Voided'].includes(invoice.status)) {
      this.toast('info', 'This invoice has no collectable balance.');
      return;
    }

    this.paymentForm = { invoiceId: invoice.id, amount: invoice.balance, method: 'Cash', reference: '', receivedBy: this.session()?.emailAddress ?? 'Cashier' };
    this.modal.set('payment');
  }

  updateInvoiceStatus(invoice: Invoice, status: string) {
    this.saving.set(true);
    this.api.updateInvoiceStatus(invoice.id, status).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast('success', `Invoice marked ${status}.`);
        this.loadAll();
      },
      error: () => {
        this.saving.set(false);
        this.toast('error', 'Invoice status could not be changed. Paid invoices must be managed through payments.');
      },
    });
  }

  recordPayment() {
    const invoice = this.invoiceFor(this.paymentForm.invoiceId);
    const amount = Number(this.paymentForm.amount);

    if (!invoice) {
      this.toast('error', 'Select an unpaid invoice before recording payment.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      this.toast('error', 'Payment amount must be greater than zero.');
      return;
    }

    if (amount > invoice.balance) {
      this.toast('error', 'Payment amount cannot exceed the invoice balance.');
      return;
    }

    if (!this.paymentForm.method.trim()) {
      this.toast('error', 'Select the payment method.');
      return;
    }

    if (this.paymentForm.method !== 'Cash' && !this.paymentForm.reference.trim()) {
      this.toast('error', 'Reference is required for non-cash payments.');
      return;
    }

    if (!this.paymentForm.receivedBy.trim()) {
      this.toast('error', 'Received by is required.');
      return;
    }

    this.saving.set(true);
    this.api.recordPayment(this.paymentForm).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.modal.set(null);
        this.lastReceipt.set(res.data);
        this.paymentForm.amount = 0;
        this.paymentForm.reference = '';
        this.toast('success', 'Payment recorded and receipt prepared.');
        this.loadAll();
        window.setTimeout(() => this.printReceipt(res.data), 250);
      },
      error: () => {
        this.saving.set(false);
        this.toast('error', 'Payment failed. Check invoice balance and required fields.');
      },
    });
  }

  onPhotoFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.patientForm.photoDataUrl = String(reader.result ?? '');
    reader.readAsDataURL(file);
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (this.cameraPreview?.nativeElement) {
        this.cameraPreview.nativeElement.srcObject = stream;
        await this.cameraPreview.nativeElement.play();
        this.cameraOn.set(true);
      }
    } catch {
      this.toast('error', 'Camera could not start. Use photo upload instead.');
    }
  }

  capturePhoto() {
    const video = this.cameraPreview?.nativeElement;
    const canvas = this.cameraCanvas?.nativeElement;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.patientForm.photoDataUrl = canvas.toDataURL('image/jpeg', 0.86);
    this.toast('success', 'Patient photo captured.');
  }

  stopCamera() {
    const video = this.cameraPreview?.nativeElement;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (video) video.srcObject = null;
    this.cameraOn.set(false);
  }

  exportExcel(name: string, rows: object[]) {
    const data = this.filtered(rows);
    if (!data.length) {
      this.toast('info', 'No rows to export.');
      return;
    }
    const columns = Object.keys(data[0]).filter((key) => !key.toLowerCase().includes('photo'));
    const html = `<table><thead><tr>${columns.map((column) => `<th>${column}</th>`).join('')}</tr></thead><tbody>${data.map((row) => `<tr>${columns.map((column) => `<td>${this.cell((row as Record<string, unknown>)[column])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    this.download(`${name}.xls`, `application/vnd.ms-excel`, html);
    this.toast('success', 'Excel file is ready.');
  }

  exportPdf(name: string, rows: object[]) {
    this.openPrintable(name, rows, true);
    this.toast('info', 'Use the print dialog destination "Save as PDF".');
  }

  printTable(name: string, rows: object[]) {
    this.openPrintable(name, rows, false);
  }

  patientName(id: string) {
    const patient = this.patients().find((item) => item.id === id);
    return patient ? `${patient.firstName} ${patient.lastName}` : id;
  }

  doctorName(id: string) {
    const doctor = this.employees().find((item) => item.id === id);
    if (doctor) return `${doctor.firstName} ${doctor.lastName}`;

    const profile = this.doctorProfiles().find((item) => item.id === id);
    return profile ? `${profile.firstName} ${profile.lastName}` : id;
  }

  employeeById(id: string) {
    return this.employees().find((employee) => employee.id === id);
  }

  patientById(id: string) {
    return this.patients().find((patient) => patient.id === id);
  }

  labRequestById(id: string) {
    return this.labRequests().find((request) => request.id === id);
  }

  clinicalPatientOptions() {
    return this.visiblePatients();
  }

  appointmentDoctorCards() {
    if (!this.hasRole('DOCTOR')) {
      return this.doctors();
    }

    const doctorId = this.loggedDoctorId();
    return this.doctors().filter((doctor) => doctor.id === doctorId);
  }

  visibleClinicalRows<T extends { patientId: string }>(rows: T[]) {
    if (!this.hasRole('DOCTOR')) {
      return rows;
    }

    const assignedPatientIds = this.assignedDoctorPatientIds();
    return rows.filter((row) => assignedPatientIds.has(row.patientId));
  }

  currentClinicalRows() {
    if (this.clinicalTab() === 'encounters') return this.visibleClinicalRows(this.encounters());
    if (this.clinicalTab() === 'vitals') return this.visibleClinicalRows(this.vitals());
    if (this.clinicalTab() === 'diagnoses') return this.visibleClinicalRows(this.diagnoses());
    if (this.clinicalTab() === 'prescriptions') return this.visibleClinicalRows(this.prescriptions());
    return this.visibleClinicalRows(this.labRequests());
  }

  openPatientHistory(patientOrId: Patient | string) {
    const patient = typeof patientOrId === 'string' ? this.patientById(patientOrId) : patientOrId;
    if (!patient) {
      this.toast('error', 'Patient record could not be found.');
      return;
    }

    if (this.hasRole('DOCTOR') && !this.assignedDoctorPatientIds().has(patient.id)) {
      this.toast('error', 'This patient is not assigned to the logged-in doctor.');
      return;
    }

    this.selectedPatient.set(patient);
    this.modal.set('patientHistory');
  }

  patientAppointments(patientId: string) {
    return this.appointments()
      .filter((appointment) => appointment.patientId === patientId)
      .sort((a, b) => new Date(b.startsAtUtc).getTime() - new Date(a.startsAtUtc).getTime());
  }

  patientEncounters(patientId: string) {
    return this.encounters()
      .filter((encounter) => encounter.patientId === patientId)
      .sort((a, b) => new Date(b.encounterAtUtc).getTime() - new Date(a.encounterAtUtc).getTime());
  }

  patientVitals(patientId: string) {
    return this.vitals()
      .filter((vital) => vital.patientId === patientId)
      .sort((a, b) => new Date(b.recordedAtUtc).getTime() - new Date(a.recordedAtUtc).getTime());
  }

  patientDiagnoses(patientId: string) {
    return this.diagnoses()
      .filter((diagnosis) => diagnosis.patientId === patientId)
      .sort((a, b) => new Date(b.diagnosedAtUtc).getTime() - new Date(a.diagnosedAtUtc).getTime());
  }

  patientPrescriptions(patientId: string) {
    return this.prescriptions()
      .filter((prescription) => prescription.patientId === patientId)
      .sort((a, b) => new Date(b.orderedAtUtc).getTime() - new Date(a.orderedAtUtc).getTime());
  }

  patientLabRequests(patientId: string) {
    return this.labRequests()
      .filter((request) => request.patientId === patientId)
      .sort((a, b) => new Date(b.orderedAtUtc).getTime() - new Date(a.orderedAtUtc).getTime());
  }

  patientInvoices(patientId: string) {
    return this.invoices()
      .filter((invoice) => invoice.patientId === patientId)
      .sort((a, b) => new Date(b.dueAtUtc).getTime() - new Date(a.dueAtUtc).getTime());
  }

  patientHistoryChart(patientId: string) {
    return this.chartRows([
      ['Visits', this.patientEncounters(patientId).length],
      ['Vitals', this.patientVitals(patientId).length],
      ['Diagnoses', this.patientDiagnoses(patientId).length],
      ['Rx', this.patientPrescriptions(patientId).length],
      ['Labs', this.patientLabRequests(patientId).length],
    ]);
  }

  insuranceName(id?: string) {
    return this.insuranceCompanies().find((company) => company.id === id)?.name ?? '';
  }

  onInsuranceCompanyChange(companyId: string) {
    const company = this.insuranceCompanies().find((item) => item.id === companyId);
    this.patientForm.insuranceCompanyId = companyId || undefined;
    this.patientForm.insuranceProvider = company?.name ?? '';
    this.patientForm.insurancePlan = company?.coverageType ?? '';
    this.patientForm.insurancePolicyNumber = '';
  }

  appointmentDoctors() {
    return this.doctorsForDepartment(this.appointmentForm.department);
  }

  patientIntakeDoctors() {
    return this.doctorsForDepartment(this.patientIntakeForm.department);
  }

  specializationOptionsForRole(role = this.employeeForm.role) {
    return this.staffSpecializationsByRole[role] ?? ['General Administration', 'Operations Support'];
  }

  onEmployeeRoleChange() {
    const options = this.specializationOptionsForRole();
    if (!options.includes(this.employeeForm.specialization)) {
      this.employeeForm.specialization = options[0] ?? '';
    }

    if (this.employeeForm.role === 'LAB_TECHNICIAN') this.employeeForm.department = 'Laboratory';
    if (this.employeeForm.role === 'PHARMACIST') this.employeeForm.department = 'Pharmacy';
    if (this.employeeForm.role === 'ACCOUNTANT' || this.employeeForm.role === 'CASHIER') this.employeeForm.department = 'Finance';
    if (this.employeeForm.role === 'RECEPTIONIST') this.employeeForm.department = 'Front Desk';
  }

  doctorsForDepartment(department: string) {
    return this.doctors().filter((doctor) => {
      if (!doctor.isActive) return false;
      return !department || doctor.department === department;
    });
  }

  onAppointmentDepartmentChange() {
    if (!this.appointmentDoctors().some((doctor) => doctor.id === this.appointmentForm.doctorId)) {
      this.appointmentForm.doctorId = '';
    }
  }

  onPatientIntakeDepartmentChange() {
    if (!this.patientIntakeDoctors().some((doctor) => doctor.id === this.patientIntakeForm.doctorId)) {
      this.patientIntakeForm.doctorId = '';
    }
  }

  doctorQueueCount(doctorId: string) {
    const today = new Date().toISOString().slice(0, 10);
    return this.appointments().filter((appointment) =>
      appointment.doctorId === doctorId &&
      appointment.startsAtUtc.slice(0, 10) === today &&
      ['Scheduled', 'Waiting', 'In Service'].includes(appointment.queueStatus)
    ).length;
  }

  departmentStaffCount(departmentName: string) {
    return this.employees().filter((employee) => employee.department === departmentName).length;
  }

  availableBedCount() {
    return this.beds().filter((bed) => bed.isAvailable).length;
  }

  totalBilled() {
    return this.invoices().reduce((total, invoice) => total + invoice.total, 0);
  }

  totalCollected() {
    return this.invoices().reduce((total, invoice) => total + invoice.paid, 0);
  }

  totalOpenBalance() {
    return this.invoices().reduce((total, invoice) => total + invoice.balance, 0);
  }

  chartRows(rows: Array<[string, number]>) {
    const max = Math.max(...rows.map((row) => row[1]), 1);
    return rows.map(([label, value]) => ({ label, value, percent: Math.round((value / max) * 100) }));
  }

  private averageWaitMinutes() {
    const activeAppointments = this.appointments().filter((appointment) =>
      ['Scheduled', 'Waiting', 'In Service'].includes(appointment.queueStatus)
    );
    if (!activeAppointments.length) return 0;

    const now = Date.now();
    const waitMinutes = activeAppointments.map((appointment) => {
      const appointmentTime = new Date(appointment.startsAtUtc).getTime();
      if (!Number.isFinite(appointmentTime)) return 0;
      return Math.max(0, Math.round((now - appointmentTime) / 60000));
    });
    const average = waitMinutes.reduce((sum, minutes) => sum + minutes, 0) / activeAppointments.length;
    return Math.round(average || activeAppointments.length * 7);
  }

  private doctorUtilization() {
    const doctors = this.doctors();
    if (!doctors.length) return 0;
    const activeDoctorIds = new Set(
      this.appointments()
        .filter((appointment) => ['Waiting', 'In Service'].includes(appointment.queueStatus))
        .map((appointment) => appointment.doctorId)
    );
    return Math.round((activeDoctorIds.size / doctors.length) * 100);
  }

  private bedOccupancyRate() {
    const beds = this.beds();
    if (!beds.length) return 0;
    return Math.round((beds.filter((bed) => !bed.isAvailable).length / beds.length) * 100);
  }

  private noShowRate() {
    const appointments = this.appointments();
    if (!appointments.length) return 0;
    return Math.round((appointments.filter((appointment) => appointment.queueStatus === 'No Show').length / appointments.length) * 100);
  }

  private insuranceOutstanding() {
    return this.invoices()
      .filter((invoice) => {
        const patient = this.patientById(invoice.patientId);
        return invoice.balance > 0 && !!(patient?.insuranceCompanyId || patient?.insuranceCompanyName || patient?.insuranceProvider);
      })
      .reduce((sum, invoice) => sum + invoice.balance, 0);
  }

  invoiceFor(id: string) {
    return this.invoices().find((invoice) => invoice.id === id);
  }

  printLabResult(request: LabRequest) {
    const patient = this.patientById(request.patientId);
    const doctor = this.employeeById(request.doctorId);
    this.openDocument('Laboratory Result', `
      <div class="brand"><div class="brand-left"><span class="print-logo">H</span><div><strong>HMS Platform</strong><span>Diagnostic Result Report</span></div></div><b>LAB-${request.id.slice(0, 8).toUpperCase()}</b></div>
      ${this.patientPrintBlock(patient)}
      <table><tbody>
        <tr><th>Ordering Doctor</th><td>Dr. ${this.cell(doctor ? `${doctor.firstName} ${doctor.lastName}` : request.doctorId)}</td></tr>
        <tr><th>Order Category</th><td>${this.cell(request.category)}</td></tr>
        <tr><th>Requested Tests</th><td><strong>${this.cell(request.testName)}</strong></td></tr>
        <tr><th>Priority</th><td>${this.cell(request.priority)}</td></tr>
        <tr><th>Specimen / Study</th><td>${this.cell(request.specimenType || 'Not specified')}</td></tr>
        <tr><th>Status</th><td>${this.cell(request.status)}</td></tr>
        <tr><th>Result Value</th><td>${this.cell(request.resultValue || '-')}</td></tr>
        <tr><th>Reference Range</th><td>${this.cell(request.referenceRange || '-')}</td></tr>
        <tr><th>Flag</th><td>${this.cell(request.resultFlag || '-')}</td></tr>
        <tr><th>Summary</th><td>${this.cell(request.resultSummary || '-')}</td></tr>
        <tr><th>Notes</th><td>${this.cell(request.resultNotes || '-')}</td></tr>
        <tr><th>Collected At</th><td>${request.collectedAtUtc ? new Date(request.collectedAtUtc).toLocaleString() : '-'}</td></tr>
        <tr><th>Resulted At</th><td>${request.resultedAtUtc ? new Date(request.resultedAtUtc).toLocaleString() : '-'}</td></tr>
        <tr><th>Performed By</th><td>${this.cell(request.performedBy || '-')}</td></tr>
        <tr><th>Verified By</th><td>${this.cell(request.verifiedBy || '-')}</td></tr>
      </tbody></table>
      <div class="signatures"><span>Lab Technician</span><span>Verifier / Pathologist</span></div>
    `);
  }

  printPrescription(prescription: Prescription) {
    const patient = this.patientById(prescription.patientId);
    const doctor = this.employeeById(prescription.doctorId);
    this.openDocument('Prescription', `
      <div class="brand"><div class="brand-left"><span class="print-logo">H</span><div><strong>HMS Platform</strong><span>Prescription Order</span></div></div><b>RX-${prescription.id.slice(0, 8).toUpperCase()}</b></div>
      ${this.patientPrintBlock(patient)}
      <table><tbody>
        <tr><th>Doctor</th><td>Dr. ${this.cell(doctor ? `${doctor.firstName} ${doctor.lastName}` : prescription.doctorId)}</td></tr>
        <tr><th>Department</th><td>${this.cell(doctor?.department ?? '-')}</td></tr>
        <tr><th>Specialization</th><td>${this.cell(doctor?.specialization ?? '-')}</td></tr>
        <tr><th>Medication</th><td><strong>${this.cell(prescription.medication)}</strong></td></tr>
        <tr><th>Instructions</th><td>${this.cell(prescription.instructions)}</td></tr>
        <tr><th>Ordered At</th><td>${new Date(prescription.orderedAtUtc).toLocaleString()}</td></tr>
      </tbody></table>
      <div class="signatures"><span>Doctor Signature</span><span>Pharmacy Verification</span></div>
    `);
  }

  printInvoice(invoice: Invoice) {
    const patient = this.patientById(invoice.patientId);
    const items = invoice.items.map((item) => `
      <tr>
        <td>${this.cell(item.serviceCode)}</td>
        <td>${this.cell(item.description)}</td>
        <td>${item.quantity}</td>
        <td>${this.money(item.unitPrice)}</td>
        <td>${this.money(item.discount)}</td>
        <td>${this.money(item.lineTotal)}</td>
      </tr>`).join('');
    this.openDocument('Invoice', `
      <div class="brand"><div class="brand-left"><span class="print-logo">H</span><div><strong>HMS Platform</strong><span>Patient Invoice</span></div></div><b>${invoice.invoiceNumber}</b></div>
      ${this.patientPrintBlock(patient)}
      <table><thead><tr><th>Code</th><th>Description</th><th>Qty</th><th>Unit</th><th>Discount</th><th>Total</th></tr></thead><tbody>${items}</tbody></table>
      ${this.totalBlock([
        ['Subtotal', invoice.subtotal],
        ['Discount', invoice.discount],
        ['Tax', invoice.tax],
        ['Total', invoice.total],
        ['Paid', invoice.paid],
        ['Balance', invoice.balance],
      ])}
      <p class="hint">Status: ${this.cell(invoice.status)} | Due: ${new Date(invoice.dueAtUtc).toLocaleString()}</p>
    `);
  }

  printReceipt(receipt: Receipt) {
    const patient = this.patientById(receipt.patientId);
    this.openDocument('Receipt', `
      <div class="brand"><div class="brand-left"><span class="print-logo">H</span><div><strong>HMS Platform</strong><span>Official Payment Receipt</span></div></div><b>${receipt.receiptNumber}</b></div>
      ${this.patientPrintBlock(patient)}
      <table><tbody>
        <tr><th>Invoice</th><td>${this.cell(receipt.invoiceNumber)}</td></tr>
        <tr><th>Amount Paid</th><td>${this.money(receipt.amount)}</td></tr>
        <tr><th>Method</th><td>${this.cell(receipt.method)}</td></tr>
        <tr><th>Reference</th><td>${this.cell(receipt.reference ?? '-')}</td></tr>
        <tr><th>Received By</th><td>${this.cell(receipt.receivedBy)}</td></tr>
        <tr><th>Paid At</th><td>${new Date(receipt.paidAtUtc).toLocaleString()}</td></tr>
        <tr><th>Balance After Payment</th><td>${this.money(receipt.balanceAfterPayment)}</td></tr>
      </tbody></table>
      <div class="signatures"><span>Cashier Signature</span><span>Patient Signature</span></div>
    `);
  }

  filtered<T extends object>(items: T[]) {
    const term = this.search().trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => this.rowSearchText(item).includes(term));
  }

  dismissToast(id: number) {
    this.toasts.update((items) => items.filter((toast) => toast.id !== id));
  }

  private save<T>(request: Observable<T>, message: string, reset: () => void) {
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(null);
        reset();
        this.toast('success', message);
        this.loadAll();
      },
      error: () => {
        this.saving.set(false);
        this.toast('error', 'Save failed. Check required fields and service logs.');
      },
    });
  }

  copySetupUrl(setupUrl: string) {
    if (!setupUrl) return;
    navigator.clipboard?.writeText(setupUrl).then(
      () => this.toast('info', 'Setup link copied to clipboard for local testing.'),
      () => this.toast('info', 'Setup link is available in the Identity API email outbox.')
    );
  }

  private toast(kind: ToastKind, message: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    this.toasts.update((items) => [...items, { id, kind, message }]);
    window.setTimeout(() => this.dismissToast(id), 4800);
  }

  private rowSearchText(item: object) {
    const record = item as Record<string, unknown>;
    const extra: string[] = [];
    const patientId = typeof record['patientId'] === 'string' ? record['patientId'] : '';
    const doctorId = typeof record['doctorId'] === 'string' ? record['doctorId'] : '';
    const invoiceId = typeof record['invoiceId'] === 'string' ? record['invoiceId'] : '';

    if (patientId) extra.push(this.patientName(patientId), this.patientById(patientId)?.mrn ?? '', this.patientById(patientId)?.phone ?? '');
    if (doctorId) extra.push(this.doctorName(doctorId));
    if (invoiceId) extra.push(this.invoiceFor(invoiceId)?.invoiceNumber ?? '');

    return `${JSON.stringify(item)} ${extra.join(' ')}`.toLowerCase();
  }

  private uniqueBy<T>(items: T[], keySelector: (item: T) => string) {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const item of items) {
      const key = keySelector(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }

    return result;
  }

  private uniqueTextValues(values: string[]) {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  }

  private toggleStringSelection(values: string[], value: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(values);
    if (checked) {
      next.add(value);
    } else {
      next.delete(value);
    }
    values.splice(0, values.length, ...Array.from(next));
  }

  private doctorDisplayKey(doctor: Pick<Employee, 'firstName' | 'lastName' | 'emailAddress' | 'department' | 'specialization'>) {
    const nameKey = `${doctor.firstName}|${doctor.lastName}|${doctor.department ?? ''}|${doctor.specialization ?? ''}`.toLowerCase();
    return nameKey || doctor.emailAddress.toLowerCase();
  }

  private syncDefaultSelections() {
    const firstPatientId = this.patients()[0]?.id ?? '';
    this.invoiceForm.patientId ||= firstPatientId;
    this.invoiceForm.insuranceProvider ||= this.patients().find((patient) => patient.id === this.invoiceForm.patientId)?.insuranceProvider ?? '';
  }

  private validatePatientForm() {
    if (!this.patientForm.firstName.trim() || !this.patientForm.lastName.trim() || !this.patientForm.phone.trim() || !this.patientForm.gender.trim()) {
      this.toast('error', 'First name, last name, phone, and gender are required.');
      return false;
    }

    if (this.patientForm.email && !this.isValidEmail(this.patientForm.email)) {
      this.toast('error', 'Enter a valid patient email address or leave it empty.');
      return false;
    }

    return true;
  }

  private validateEmployeeForm() {
    if (!this.employeeForm.firstName.trim() || !this.employeeForm.lastName.trim() || !this.employeeForm.emailAddress.trim() || !this.employeeForm.role.trim()) {
      this.toast('error', 'First name, last name, email, and role are required.');
      return false;
    }

    if (!this.isValidEmail(this.employeeForm.emailAddress)) {
      this.toast('error', 'Enter a valid employee email address.');
      return false;
    }

    if (!this.employeeForm.department.trim()) {
      this.toast('error', 'Department is required for staff assignment.');
      return false;
    }

    if (!this.employeeForm.specialization.trim()) {
      this.toast('error', 'Select the employee specialization or work area.');
      return false;
    }

    return true;
  }

  private isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private validatePatientIntakeForm() {
    if (!this.patientIntakeForm.createAppointment) {
      return true;
    }

    if (!this.patientIntakeForm.department.trim()) {
      this.toast('error', 'Select the appointment department for patient intake.');
      return false;
    }

    if (!this.patientIntakeForm.doctorId.trim()) {
      this.toast('error', 'Select the assigned doctor for patient intake.');
      return false;
    }

    if (!this.patientIntakeDoctors().some((doctor) => doctor.id === this.patientIntakeForm.doctorId)) {
      this.toast('error', 'Selected doctor does not belong to the intake department.');
      return false;
    }

    if (!this.patientIntakeForm.startsAtUtc || !Number.isFinite(new Date(this.patientIntakeForm.startsAtUtc).getTime())) {
      this.toast('error', 'Select a valid appointment date and time.');
      return false;
    }

    if (!this.patientIntakeForm.reason.trim()) {
      this.toast('error', 'Appointment reason is required.');
      return false;
    }

    return true;
  }

  private validateInvoiceForm() {
    const quantity = Number(this.invoiceForm.quantity);
    const unitPrice = Number(this.invoiceForm.unitPrice);
    const lineDiscount = Number(this.invoiceForm.lineDiscount);
    const discount = Number(this.invoiceForm.discount);
    const tax = Number(this.invoiceForm.tax);

    if (!this.invoiceForm.patientId.trim()) {
      this.toast('error', 'Select the billing patient.');
      return false;
    }

    if (!this.invoiceForm.description.trim() || !this.invoiceForm.serviceDescription.trim()) {
      this.toast('error', 'Invoice and service descriptions are required.');
      return false;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.toast('error', 'Invoice quantity must be greater than zero.');
      return false;
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      this.toast('error', 'Unit price must be greater than zero.');
      return false;
    }

    if ([lineDiscount, discount, tax].some((value) => !Number.isFinite(value) || value < 0)) {
      this.toast('error', 'Discount and tax values cannot be negative.');
      return false;
    }

    if (lineDiscount >= quantity * unitPrice) {
      this.toast('error', 'Line discount must be less than the line total.');
      return false;
    }

    return true;
  }

  private resolveClinicalDoctorId(selectedDoctorId: string) {
    return this.loggedDoctorId() || selectedDoctorId;
  }

  private validateRequiredClinicalFields(fields: Array<[unknown, string]>) {
    for (const [value, message] of fields) {
      if (typeof value === 'string' && !value.trim()) {
        this.toast('error', message);
        return false;
      }

      if (value === null || value === undefined) {
        this.toast('error', message);
        return false;
      }
    }

    return true;
  }

  private validRange(value: number, min: number, max: number, message: string) {
    if (!Number.isFinite(value) || value < min || value > max) {
      this.toast('error', message);
      return false;
    }

    return true;
  }

  private defaultEmployeeForm() {
    return {
      firstName: '',
      lastName: '',
      emailAddress: '',
      phone: '',
      role: 'DOCTOR',
      department: 'Outpatient',
      specialization: this.staffSpecializationsByRole['DOCTOR'][0],
    };
  }

  private emptyEncounterForm(): EncounterForm {
    return { patientId: '', doctorId: '', visitType: '', chiefComplaint: '', assessment: '', plan: '' };
  }

  private emptyVitalsForm(): VitalsForm {
    return { patientId: '', temperatureC: null, pulse: null, respiratoryRate: null, bloodPressure: '', weightKg: null, heightCm: null };
  }

  private emptyDiagnosisForm(): DiagnosisForm {
    return { patientId: '', doctorId: '', code: '', description: '', severity: '' };
  }

  private emptyPrescriptionForm(): PrescriptionForm {
    return {
      patientId: '',
      doctorId: '',
      selectedMedications: [],
      customMedication: '',
      medication: '',
      dose: '',
      route: 'Oral',
      frequency: '',
      duration: '',
      quantity: '',
      instructions: '',
    };
  }

  private emptyLabForm(): LabForm {
    return {
      patientId: '',
      doctorId: '',
      selectedTests: [],
      testName: '',
      category: 'Laboratory',
      priority: 'Routine',
      specimenType: 'Whole blood',
      clinicalNote: '',
    };
  }

  private emptyLabResultForm(): LabResultForm {
    return {
      id: '',
      status: 'Specimen Collected',
      specimenType: 'Whole blood',
      resultSummary: '',
      resultValue: '',
      referenceRange: '',
      resultFlag: 'Normal',
      resultNotes: '',
      performedBy: '',
      verifiedBy: '',
      collectedAtUtc: this.localDateTimeValue(0),
      resultedAtUtc: this.localDateTimeValue(0),
    };
  }

  private patientToForm(patient: Patient): Omit<Patient, 'id' | 'mrn'> {
    return {
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email ?? '',
      phone: patient.phone,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      nationalId: patient.nationalId ?? '',
      maritalStatus: patient.maritalStatus ?? 'Single',
      occupation: patient.occupation ?? '',
      address: patient.address ?? '',
      bloodType: patient.bloodType ?? 'O+',
      insuranceCompanyId: patient.insuranceCompanyId,
      employerName: patient.employerName ?? '',
      insurancePlan: patient.insurancePlan ?? '',
      insuranceProvider: patient.insuranceProvider ?? patient.insuranceCompanyName ?? '',
      insurancePolicyNumber: patient.insurancePolicyNumber ?? '',
      emergencyContactName: patient.emergencyContactName ?? '',
      emergencyContactPhone: patient.emergencyContactPhone ?? '',
      photoDataUrl: patient.photoDataUrl ?? '',
    };
  }

  private emptyPatientIntakeForm(): PatientIntakeForm {
    return {
      createAppointment: true,
      department: 'Outpatient',
      doctorId: '',
      startsAtUtc: this.localDateTimeValue(0),
      reason: 'Initial consultation',
      appointmentType: 'Consultation',
      priority: 'Normal',
      notes: 'Created during patient registration',
    };
  }

  private emptyPatient(): Omit<Patient, 'id' | 'mrn'> {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: 'Female',
      dateOfBirth: '1995-01-01',
      nationalId: '',
      maritalStatus: 'Single',
      occupation: '',
      address: '',
      bloodType: 'O+',
      insuranceCompanyId: undefined,
      employerName: '',
      insurancePlan: '',
      insuranceProvider: '',
      insurancePolicyNumber: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      photoDataUrl: '',
    };
  }

  private openDocument(title: string, body: string) {
    const win = window.open('', '_blank', 'width=980,height=760');
    if (!win) return;
    win.document.write(`
      <html><head><title>${title}</title><style>
      body{font-family:Arial,sans-serif;padding:28px;color:#0f172a;background:#fff}
      .brand{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #155e75;padding-bottom:16px;margin-bottom:18px}
      .brand-left{display:flex;align-items:center;gap:12px}.print-logo{display:grid;place-items:center;width:44px;height:44px;border-radius:8px;background:#155e75;color:#fff;font-size:22px;font-weight:900}
      .brand strong{display:block;font-size:24px;color:#0f172a}.brand span{display:block;color:#64748b;text-transform:uppercase;font-size:12px;font-weight:700}
      .brand .print-logo{color:#fff;font-size:22px}
      .brand b{font-size:18px;color:#155e75}.patient{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;background:#f8fafc;border:1px solid #e2e8f0;padding:14px;margin-bottom:18px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px} th,td{border:1px solid #cbd5e1;padding:9px;text-align:left} th{background:#f1f5f9;text-transform:uppercase}
      .totals{width:330px;margin:18px 0 0 auto}.totals div{display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:7px 0}.totals strong{font-size:15px}
      .hint{margin-top:18px;color:#64748b}.signatures{display:flex;justify-content:space-between;margin-top:60px}.signatures span{border-top:1px solid #334155;width:220px;padding-top:8px;text-align:center}
      </style></head><body>${body}<script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  }

  private patientPrintBlock(patient?: Patient) {
    if (!patient) {
      return '<div class="patient"><strong>Patient</strong><span>Not selected</span></div>';
    }

    return `
      <div class="patient">
        <div><strong>${this.cell(patient.mrn)}</strong><br>${this.cell(patient.firstName)} ${this.cell(patient.lastName)}</div>
        <div><strong>Phone</strong><br>${this.cell(patient.phone)}</div>
        <div><strong>Insurance</strong><br>${this.cell(patient.insuranceCompanyName || patient.insuranceProvider || 'Self Pay')}</div>
        <div><strong>Plan</strong><br>${this.cell(patient.insurancePlan || '-')}</div>
      </div>`;
  }

  private totalBlock(rows: Array<[string, number]>) {
    return `<div class="totals">${rows.map(([label, value], index) => `<div>${index === rows.length - 1 ? `<strong>${label}</strong><strong>${this.money(value)}</strong>` : `<span>${label}</span><span>${this.money(value)}</span>`}</div>`).join('')}</div>`;
  }

  private openPrintable(name: string, rows: object[], pdfMode: boolean) {
    const data = this.filtered(rows);
    const columns = data[0] ? Object.keys(data[0]).filter((key) => !key.toLowerCase().includes('photo')) : [];
    const body = data.map((row) => `<tr>${columns.map((column) => `<td>${this.cell((row as Record<string, unknown>)[column])}</td>`).join('')}</tr>`).join('');
    const win = window.open('', '_blank', 'width=1100,height=760');
    if (!win) return;
    win.document.write(`
      <html><head><title>${name}</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111827} h1{font-size:22px}
      table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #d1d5db;padding:8px;text-align:left}
      th{background:#f3f4f6;text-transform:uppercase} .hint{color:#64748b;margin-bottom:18px}
      </style></head><body><h1>${name}</h1><p class="hint">${pdfMode ? 'Choose Save as PDF in your print dialog.' : 'Print-ready HMS report.'}</p>
      <table><thead><tr>${columns.map((column) => `<th>${column}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  }

  private download(filename: string, type: string, content: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private cell(value: unknown) {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined) return '';
    return String(value).replace(/[<>&]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char] ?? char));
  }

  private money(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(value);
  }

  private localDateTimeValue(daysFromNow: number) {
    const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  private toLocalDateTimeInput(value?: string) {
    if (!value) return this.localDateTimeValue(1);
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return this.localDateTimeValue(1);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  private title(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
