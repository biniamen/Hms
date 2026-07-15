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
type Modal = 'role' | 'newRole' | 'permission' | 'department' | 'insurance' | 'employee' | 'patient' | 'appointment' | 'encounter' | 'vitals' | 'diagnosis' | 'prescription' | 'lab' | 'invoice' | 'payment' | 'enterpriseRecord' | null;
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
  password = 'Admin@123';
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

  employeeForm = { firstName: '', lastName: '', emailAddress: '', phone: '', role: 'DOCTOR', department: 'Outpatient', specialization: 'Internal Medicine' };
  newRoleForm = { role: '', description: '', permissionsText: '' };
  roleForm = { role: '', description: '', permissionsText: '' };
  permissionForm = { key: '', description: '', module: 'Administration' };
  departmentForm = { code: '', name: '', type: 'Clinical', location: 'Main Campus' };
  insuranceForm = { name: '', payerCode: '', contactPerson: '', phone: '', email: '', address: '', coverageType: 'Corporate', coveragePercent: 80 };
  patientForm: Omit<Patient, 'id' | 'mrn'> = this.emptyPatient();
  appointmentForm = {
    patientId: '',
    doctorId: '',
    startsAtUtc: this.localDateTimeValue(1),
    reason: '',
    department: 'Outpatient',
    appointmentType: 'Consultation',
    priority: 'Normal',
    notes: '',
  };
  encounterForm = { patientId: '', doctorId: '', visitType: 'Outpatient', chiefComplaint: '', assessment: '', plan: '' };
  vitalsForm = { patientId: '', temperatureC: 37, pulse: 80, respiratoryRate: 18, bloodPressure: '120/80', weightKg: 60, heightCm: 165 };
  diagnosisForm = { patientId: '', doctorId: '', code: '', description: '', severity: 'Mild' };
  prescriptionForm = { patientId: '', doctorId: '', medication: '', instructions: '' };
  labForm = { patientId: '', doctorId: '', testName: '' };
  invoiceForm = { patientId: '', description: 'Outpatient service invoice', serviceCode: 'CONS', serviceDescription: 'General consultation', quantity: 1, unitPrice: 350, lineDiscount: 0, discount: 0, tax: 0, paymentType: 'Cash', insuranceProvider: '' };
  paymentForm = { invoiceId: '', amount: 0, method: 'Cash', reference: '', receivedBy: 'Cashier' };
  enterpriseRecordForm = { area: 'Pharmacy', patientId: '', title: '', department: 'Pharmacy', owner: '', priority: 'Normal', status: 'Open', amount: 0, dueAtUtc: this.localDateTimeValue(1), details: '' };

  readonly session = computed(() => this.api.session());
  readonly doctors = computed(() => this.employees().filter((employee) => employee.role === 'DOCTOR'));
  readonly activeTitle = computed(() => this.active() === 'admin' ? 'Administration' : this.title(this.active()));
  readonly stats = computed(() => [
    { label: 'Employees', value: this.employees().length, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Patients', value: this.patients().length, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Queued Today', value: this.appointments().filter((appointment) => ['Scheduled', 'Waiting', 'In Service'].includes(appointment.queueStatus)).length, tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Clinical Orders', value: this.prescriptions().length + this.labRequests().length, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Open Balance', value: this.invoices().filter((invoice) => invoice.status !== 'Paid').reduce((sum, invoice) => sum + invoice.balance, 0), tone: 'bg-amber-50 text-amber-700' },
  ]);
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
    { id: 'operations', label: 'Service Portal', roles: ['ADMIN'] },
    { id: 'admin', label: 'Administration', roles: ['ADMIN'] },
    { id: 'enterprise', label: 'Enterprise HMS', roles: ['ADMIN'] },
    { id: 'employees', label: 'Employees', roles: ['ADMIN', 'HR_MANAGER'] },
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
        this.api.session.set(res.data);
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
    this.api.session.set(null);
    this.active.set('dashboard');
  }

  canSee(item: { roles: string[] }, session: LoginResponse | null) {
    return !!session && (item.roles.includes('ALL') || item.roles.includes(session.role));
  }

  load(section: Section) {
    this.active.set(section);
    this.search.set('');
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    let pending = 21;
    const done = () => {
      pending -= 1;
      if (pending === 0) {
        this.loading.set(false);
        this.syncDefaultSelections();
      }
    };
    const fail = () => {
      this.toast('error', 'Some data could not load. Check backend services.');
      done();
    };

    this.api.getEmployees().subscribe({ next: (res) => { this.employees.set(res.data ?? []); done(); }, error: fail });
    this.api.getRoles().subscribe({ next: (res) => { this.roles.set(res.data ?? []); done(); }, error: fail });
    this.api.getPermissions().subscribe({ next: (res) => { this.permissions.set(res.data ?? []); done(); }, error: fail });
    this.api.getDepartments().subscribe({ next: (res) => { this.departments.set(res.data ?? []); done(); }, error: fail });
    this.api.getDoctors().subscribe({ next: (res) => { this.doctorProfiles.set(res.data ?? []); done(); }, error: fail });
    this.api.getPatients().subscribe({ next: (res) => { this.patients.set(res.data ?? []); done(); }, error: fail });
    this.api.getInsuranceCompanies().subscribe({ next: (res) => { this.insuranceCompanies.set(res.data ?? []); done(); }, error: fail });
    this.api.getAppointments().subscribe({ next: (res) => { this.appointments.set(res.data ?? []); done(); }, error: fail });
    this.api.getQueueSummary().subscribe({ next: (res) => { this.queueSummary.set(res.data ?? []); done(); }, error: fail });
    this.api.getBeds().subscribe({ next: (res) => { this.beds.set(res.data ?? []); done(); }, error: fail });
    this.api.getEncounters().subscribe({ next: (res) => { this.encounters.set(res.data ?? []); done(); }, error: fail });
    this.api.getVitals().subscribe({ next: (res) => { this.vitals.set(res.data ?? []); done(); }, error: fail });
    this.api.getDiagnoses().subscribe({ next: (res) => { this.diagnoses.set(res.data ?? []); done(); }, error: fail });
    this.api.getPrescriptions().subscribe({ next: (res) => { this.prescriptions.set(res.data ?? []); done(); }, error: fail });
    this.api.getLabRequests().subscribe({ next: (res) => { this.labRequests.set(res.data ?? []); done(); }, error: fail });
    this.api.getInvoices().subscribe({ next: (res) => { this.invoices.set(res.data ?? []); done(); }, error: fail });
    this.api.getPayments().subscribe({ next: (res) => { this.payments.set(res.data ?? []); done(); }, error: fail });
    this.api.getReceipts().subscribe({ next: (res) => { this.receipts.set(res.data ?? []); done(); }, error: fail });
    this.api.getServiceStatuses().subscribe({ next: (res) => { this.services.set(res ?? []); done(); }, error: fail });
    this.api.getEmailOutbox().subscribe({ next: (res) => { this.emailOutbox.set(res.data ?? []); done(); }, error: fail });
    this.api.getEnterpriseRecords().subscribe({ next: (res) => { this.enterpriseRecords.set(res.data ?? []); done(); }, error: fail });
  }

  createEmployee() {
    this.saving.set(true);
    this.api.createEmployee(this.employeeForm).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.modal.set(null);
        this.employeeForm = { firstName: '', lastName: '', emailAddress: '', phone: '', role: 'DOCTOR', department: 'Outpatient', specialization: 'Internal Medicine' };
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
    this.save(this.api.createPermission(this.permissionForm), 'Permission saved.', () => {
      this.permissionForm = { key: '', description: '', module: 'Administration' };
    });
  }

  createDepartment() {
    this.save(this.api.createDepartment(this.departmentForm), 'Department saved.', () => {
      this.departmentForm = { code: '', name: '', type: 'Clinical', location: 'Main Campus' };
    });
  }

  createInsuranceCompany() {
    this.save(this.api.createInsuranceCompany(this.insuranceForm), 'Insurance company registered.', () => {
      this.insuranceForm = { name: '', payerCode: '', contactPerson: '', phone: '', email: '', address: '', coverageType: 'Corporate', coveragePercent: 80 };
    });
  }

  createPatient() {
    const payload = {
      ...this.patientForm,
      insuranceCompanyId: this.patientForm.insuranceCompanyId || undefined,
    };
    this.save(this.api.createPatient(payload), 'Patient registered and RabbitMQ event published.', () => {
      this.patientForm = this.emptyPatient();
    });
  }

  createAppointment() {
    this.save(this.api.createAppointment({ ...this.appointmentForm, startsAtUtc: new Date(this.appointmentForm.startsAtUtc).toISOString() }), 'Appointment booked.', () => {
      this.appointmentForm.reason = '';
      this.appointmentForm.notes = '';
      this.appointmentForm.startsAtUtc = this.localDateTimeValue(1);
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

  createEncounter() {
    this.save(this.api.createEncounter(this.encounterForm), 'Clinical encounter saved.', () => {
      this.encounterForm.chiefComplaint = '';
      this.encounterForm.assessment = '';
      this.encounterForm.plan = '';
    });
  }

  createVitals() {
    this.save(this.api.createVitals(this.vitalsForm), 'Vitals recorded.', () => {});
  }

  createDiagnosis() {
    this.save(this.api.createDiagnosis(this.diagnosisForm), 'Diagnosis added.', () => {
      this.diagnosisForm.code = '';
      this.diagnosisForm.description = '';
    });
  }

  createPrescription() {
    this.save(this.api.createPrescription(this.prescriptionForm), 'Prescription issued.', () => {
      this.prescriptionForm.medication = '';
      this.prescriptionForm.instructions = '';
    });
  }

  createLabRequest() {
    this.save(this.api.createLabRequest(this.labForm), 'Lab request created.', () => {
      this.labForm.testName = '';
    });
  }

  createInvoice() {
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

  recordPayment() {
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
    return doctor ? `${doctor.firstName} ${doctor.lastName}` : id;
  }

  employeeById(id: string) {
    return this.employees().find((employee) => employee.id === id);
  }

  patientById(id: string) {
    return this.patients().find((patient) => patient.id === id);
  }

  insuranceName(id?: string) {
    return this.insuranceCompanies().find((company) => company.id === id)?.name ?? '';
  }

  onInsuranceCompanyChange(companyId: string) {
    const company = this.insuranceCompanies().find((item) => item.id === companyId);
    this.patientForm.insuranceCompanyId = companyId || undefined;
    this.patientForm.insuranceProvider = company?.name ?? '';
    this.patientForm.insurancePlan = company?.coverageType ?? '';
  }

  appointmentDoctors() {
    const department = this.appointmentForm.department;
    const filtered = this.doctors().filter((doctor) => !department || doctor.department === department);
    return filtered.length ? filtered : this.doctors();
  }

  onAppointmentDepartmentChange() {
    const firstDoctor = this.appointmentDoctors()[0];
    this.appointmentForm.doctorId = firstDoctor?.id ?? '';
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
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(term));
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

  private syncDefaultSelections() {
    const firstPatientId = this.patients()[0]?.id ?? '';
    const firstDoctorId = this.doctors()[0]?.id ?? this.employees()[0]?.id ?? '';
    const firstInvoice = this.invoices().find((invoice) => invoice.status !== 'Paid') ?? this.invoices()[0];
    this.appointmentForm.patientId ||= firstPatientId;
    this.appointmentForm.doctorId ||= firstDoctorId;
    this.encounterForm.patientId ||= firstPatientId;
    this.encounterForm.doctorId ||= firstDoctorId;
    this.vitalsForm.patientId ||= firstPatientId;
    this.diagnosisForm.patientId ||= firstPatientId;
    this.diagnosisForm.doctorId ||= firstDoctorId;
    this.prescriptionForm.patientId ||= firstPatientId;
    this.prescriptionForm.doctorId ||= firstDoctorId;
    this.labForm.patientId ||= firstPatientId;
    this.labForm.doctorId ||= firstDoctorId;
    this.invoiceForm.patientId ||= firstPatientId;
    this.paymentForm.invoiceId ||= firstInvoice?.id ?? '';
    this.paymentForm.amount ||= firstInvoice?.balance ?? 0;
    this.invoiceForm.insuranceProvider ||= this.patients().find((patient) => patient.id === this.invoiceForm.patientId)?.insuranceProvider ?? '';
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
        <div><strong>Policy</strong><br>${this.cell(patient.insurancePolicyNumber || '-')}</div>
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

  private title(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
