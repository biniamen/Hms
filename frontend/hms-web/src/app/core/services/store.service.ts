import { Injectable, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../api.service';
import {
  Appointment, Bed, ClinicalEncounter, Department, Diagnosis, DoctorProfile,
  EmailOutboxMessage, Employee, EnterpriseModule, EnterpriseRecord, EnterpriseTab,
  InsuranceCompany, Invoice, LabRequest, LoginResponse, Patient, Payment, Permission,
  Prescription, QueueSummary, Receipt, RolePermission, ServiceStatus, Toast, ToastKind, VitalSign,
} from '../models';

@Injectable({ providedIn: 'root' })
export class StoreService {
  // ── Data Signals ──
  readonly employees = signal<Employee[]>([]);
  readonly roles = signal<RolePermission[]>([]);
  readonly permissions = signal<Permission[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly doctorProfiles = signal<DoctorProfile[]>([]);
  readonly patients = signal<Patient[]>([]);
  readonly insuranceCompanies = signal<InsuranceCompany[]>([]);
  readonly appointments = signal<Appointment[]>([]);
  readonly queueSummary = signal<QueueSummary[]>([]);
  readonly beds = signal<Bed[]>([]);
  readonly encounters = signal<ClinicalEncounter[]>([]);
  readonly vitals = signal<VitalSign[]>([]);
  readonly diagnoses = signal<Diagnosis[]>([]);
  readonly prescriptions = signal<Prescription[]>([]);
  readonly labRequests = signal<LabRequest[]>([]);
  readonly invoices = signal<Invoice[]>([]);
  readonly payments = signal<Payment[]>([]);
  readonly receipts = signal<Receipt[]>([]);
  readonly services = signal<ServiceStatus[]>([]);
  readonly emailOutbox = signal<EmailOutboxMessage[]>([]);
  readonly enterpriseRecords = signal<EnterpriseRecord[]>([]);
  readonly lastReceipt = signal<Receipt | null>(null);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly search = signal('');
  readonly toasts = signal<Toast[]>([]);
  readonly session = computed(() => this.api.session());
  readonly doctors = computed(() => this.employees().filter((e) => e.role === 'DOCTOR'));
  readonly enterpriseTab = signal<EnterpriseTab>('pharmacy');

  // ── Computed Signals ──
  readonly queueChart = computed(() => this.chartRows([
    ['Waiting', this.appointments().filter((a) => a.queueStatus === 'Waiting').length],
    ['In Service', this.appointments().filter((a) => a.queueStatus === 'In Service').length],
    ['Completed', this.appointments().filter((a) => a.queueStatus === 'Completed').length],
    ['No Show', this.appointments().filter((a) => a.queueStatus === 'No Show').length],
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

  // ── Stat Computed Signals ──
  readonly adminStats = computed(() => [
    { label: 'System Users', value: this.employees().length, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Roles', value: this.roles().length, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Permissions', value: this.permissions().length, tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Departments', value: this.departments().length, tone: 'bg-amber-50 text-amber-700' },
  ]);

  readonly employeeStats = computed(() => [
    { label: 'Total Employees', value: this.employees().length, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Active', value: this.employees().filter((e) => e.isActive).length, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Pending Setup', value: this.employees().filter((e) => e.isActive && !e.passwordSetupCompleted).length, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Doctors', value: this.doctors().length, tone: 'bg-violet-50 text-violet-700' },
  ]);

  readonly patientStats = computed(() => [
    { label: 'Total Patients', value: this.patients().length, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Insured', value: this.patients().filter((p) => p.insuranceCompanyId || p.insuranceProvider).length, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Emergency Contact', value: this.patients().filter((p) => p.emergencyContactName).length, tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Photo Captured', value: this.patients().filter((p) => p.photoDataUrl).length, tone: 'bg-violet-50 text-violet-700' },
  ]);

  readonly insuranceStats = computed(() => [
    { label: 'Companies', value: this.insuranceCompanies().length, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Active', value: this.insuranceCompanies().filter((c) => c.isActive).length, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Coverage Types', value: new Set(this.insuranceCompanies().map((c) => c.coverageType)).size, tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Avg Coverage', value: Math.round(this.insuranceCompanies().reduce((s, c) => s + c.coveragePercent, 0) / Math.max(this.insuranceCompanies().length, 1)) + '%', tone: 'bg-amber-50 text-amber-700' },
  ]);

  readonly appointmentStats = computed(() => [
    { label: "Today's Queue", value: this.appointments().filter((a) => a.startsAtUtc.slice(0, 10) === new Date().toISOString().slice(0, 10) && ['Scheduled', 'Waiting', 'In Service'].includes(a.queueStatus)).length, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Waiting', value: this.appointments().filter((a) => a.queueStatus === 'Waiting').length, tone: 'bg-amber-50 text-amber-700' },
    { label: 'In Service', value: this.appointments().filter((a) => a.queueStatus === 'In Service').length, tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Completed Today', value: this.appointments().filter((a) => a.startsAtUtc.slice(0, 10) === new Date().toISOString().slice(0, 10) && a.queueStatus === 'Completed').length, tone: 'bg-emerald-50 text-emerald-700' },
  ]);

  readonly clinicalStats = computed(() => [
    { label: 'Encounters', value: this.encounters().length, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Vitals Recorded', value: this.vitals().length, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Diagnoses', value: this.diagnoses().length, tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Prescriptions', value: this.prescriptions().length, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Lab Requests', value: this.labRequests().length, tone: 'bg-amber-50 text-amber-700' },
  ]);

  // ── Enterprise Computed Signals ──
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

  // ── Dashboard Role Stats ──
  readonly dashboardRoleStats = computed(() => {
    const role = this.api.session()?.role;
    const today = new Date().toISOString().slice(0, 10);
    const todayApps = this.appointments().filter((a) => a.startsAtUtc.slice(0, 10) === today);
    const activeQueue = this.appointments().filter((a) => ['Scheduled', 'Waiting', 'In Service'].includes(a.queueStatus));

    switch (role) {
      case 'DOCTOR':
        return [
          { label: "Today's Patients", value: todayApps.length, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Waiting', value: todayApps.filter((a) => a.queueStatus === 'Waiting').length, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Pending Rx', value: this.prescriptions().length, tone: 'bg-violet-50 text-violet-700' },
          { label: 'Lab Requests', value: this.labRequests().length, tone: 'bg-cyan-50 text-cyan-700' },
          { label: 'Diagnoses', value: this.diagnoses().length, tone: 'bg-emerald-50 text-emerald-700' },
        ];
      case 'NURSE':
        return [
          { label: 'Queue Today', value: todayApps.length, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Vitals Recorded', value: this.vitals().length, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Bed Occupancy', value: `${Math.round((this.beds().filter((b) => !b.isAvailable).length / Math.max(this.beds().length, 1)) * 100)}%`, tone: 'bg-amber-50 text-amber-700' },
          { label: 'In Service', value: activeQueue.filter((a) => a.queueStatus === 'In Service').length, tone: 'bg-cyan-50 text-cyan-700' },
        ];
      case 'RECEPTIONIST':
        return [
          { label: "Today's Queue", value: todayApps.length, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Waiting', value: todayApps.filter((a) => a.queueStatus === 'Waiting').length, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Registered Today', value: this.patients().filter((p) => p.id).length, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Available Beds', value: this.beds().filter((b) => b.isAvailable).length, tone: 'bg-cyan-50 text-cyan-700' },
        ];
      case 'PHARMACIST':
        return [
          { label: 'Prescriptions', value: this.prescriptions().length, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Pharmacy Records', value: this.enterpriseRecords().filter((r) => r.area === 'Pharmacy').length, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Patients Queued', value: activeQueue.filter((a) => a.queueStatus === 'Waiting').length, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Inventory Tasks', value: this.enterpriseRecords().filter((r) => r.area === 'Inventory').length, tone: 'bg-violet-50 text-violet-700' },
        ];
      case 'LAB_TECHNICIAN':
        return [
          { label: 'Lab Requests', value: this.labRequests().length, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Pending Results', value: this.labRequests().filter((r) => r.status === 'Ordered').length, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Lab Records', value: this.enterpriseRecords().filter((r) => r.area === 'Laboratory').length, tone: 'bg-cyan-50 text-cyan-700' },
          { label: 'Patients Today', value: todayApps.length, tone: 'bg-emerald-50 text-emerald-700' },
        ];
      case 'ACCOUNTANT':
        return [
          { label: 'Total Billed', value: this.money(this.totalBilled()), tone: 'bg-blue-50 text-blue-700' },
          { label: 'Collected', value: this.money(this.totalCollected()), tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Open Balance', value: this.money(this.totalOpenBalance()), tone: 'bg-amber-50 text-amber-700' },
          { label: 'Claims', value: this.enterpriseRecords().filter((r) => r.area === 'Insurance Claims').length, tone: 'bg-violet-50 text-violet-700' },
        ];
      case 'CASHIER':
        return [
          { label: "Today's Payments", value: this.payments().filter((p) => p.paidAtUtc.slice(0, 10) === today).length, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Collected Today', value: this.money(this.payments().filter((p) => p.paidAtUtc.slice(0, 10) === today).reduce((s, p) => s + p.amount, 0)), tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Open Balance', value: this.money(this.totalOpenBalance()), tone: 'bg-amber-50 text-amber-700' },
          { label: 'Receipts Issued', value: this.receipts().length, tone: 'bg-cyan-50 text-cyan-700' },
        ];
      case 'HR_MANAGER':
        return [
          { label: 'Total Employees', value: this.employees().length, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Active', value: this.employees().filter((e) => e.isActive).length, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Pending Setup', value: this.employees().filter((e) => !e.passwordSetupCompleted).length, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Departments', value: this.departments().length, tone: 'bg-violet-50 text-violet-700' },
        ];
      default:
        return [
          { label: 'Employees', value: this.employees().length, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Patients', value: this.patients().length, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Queued Today', value: activeQueue.length, tone: 'bg-cyan-50 text-cyan-700' },
          { label: 'Clinical Orders', value: this.prescriptions().length + this.labRequests().length, tone: 'bg-violet-50 text-violet-700' },
          { label: 'Open Balance', value: this.money(this.totalOpenBalance()), tone: 'bg-amber-50 text-amber-700' },
        ];
    }
  });

  readonly dashboardRoleDescription = computed(() => {
    const descriptions: Record<string, string> = {
      ADMIN: 'Full system oversight — manage users, clinical operations, billing, and enterprise services',
      DOCTOR: 'Clinical command center — review patient queue, diagnoses, prescriptions, and lab results',
      NURSE: 'Nursing station — monitor vitals, bed occupancy, and patient flow through the clinic',
      RECEPTIONIST: 'Front desk control — manage patient registration, appointments, and queue status',
      PHARMACIST: 'Pharmacy desk — review and dispense prescriptions, manage inventory and records',
      LAB_TECHNICIAN: 'Laboratory console — process lab requests, record results, and manage worklists',
      ACCOUNTANT: 'Finance console — oversee billing, collections, claims, and revenue reconciliation',
      CASHIER: 'Payment station — record payments, issue receipts, and manage daily collections',
      HR_MANAGER: 'HR console — manage employee records, roles, invitations, and department staffing',
    };
    return descriptions[this.api.session()?.role ?? ''] ?? 'Hospital operations overview';
  });

  constructor(private api: ApiService) {}

  // ── Data Loading ──
  /**
   * Which data endpoints each role is allowed to call.
   * Prevents 403 errors for admin-only endpoints.
   */
  private readonly roleDataEndpoints: Record<string, string[]> = {
    ADMIN: ['employees','roles','permissions','departments','doctors','patients','insuranceCompanies','appointments','queue','beds','encounters','vitals','diagnoses','prescriptions','labRequests','invoices','payments','receipts','services','emailOutbox','enterpriseRecords'],
    DOCTOR: ['patients','appointments','queue','encounters','vitals','diagnoses','prescriptions','labRequests'],
    NURSE: ['patients','appointments','queue','beds','encounters','vitals','diagnoses','prescriptions','labRequests'],
    RECEPTIONIST: ['patients','insuranceCompanies','appointments','queue','beds'],
    PHARMACIST: ['patients','appointments','queue','prescriptions','enterpriseRecords'],
    LAB_TECHNICIAN: ['patients','appointments','queue','labRequests','enterpriseRecords'],
    ACCOUNTANT: ['patients','insuranceCompanies','invoices','payments','receipts','enterpriseRecords'],
    CASHIER: ['invoices','payments','receipts'],
    HR_MANAGER: ['employees','roles','permissions','departments'],
  };

  /** Role-based data loaders keyed by endpoint name */
  private readonly endpointLoaders: Record<string, () => void> = {
    employees:       () => this.api.getEmployees().subscribe({ next: (r) => { this.employees.set(r.data ?? []); this.dec(); }, error: this.dec }),
    roles:           () => this.api.getRoles().subscribe({ next: (r) => { this.roles.set(r.data ?? []); this.dec(); }, error: this.dec }),
    permissions:     () => this.api.getPermissions().subscribe({ next: (r) => { this.permissions.set(r.data ?? []); this.dec(); }, error: this.dec }),
    departments:     () => this.api.getDepartments().subscribe({ next: (r) => { this.departments.set(r.data ?? []); this.dec(); }, error: this.dec }),
    doctors:         () => this.api.getDoctors().subscribe({ next: (r) => { this.doctorProfiles.set(r.data ?? []); this.dec(); }, error: this.dec }),
    patients:        () => this.api.getPatients().subscribe({ next: (r) => { this.patients.set(r.data ?? []); this.dec(); }, error: this.dec }),
    insuranceCompanies: () => this.api.getInsuranceCompanies().subscribe({ next: (r) => { this.insuranceCompanies.set(r.data ?? []); this.dec(); }, error: this.dec }),
    appointments:    () => this.api.getAppointments().subscribe({ next: (r) => { this.appointments.set(r.data ?? []); this.dec(); }, error: this.dec }),
    queue:           () => this.api.getQueueSummary().subscribe({ next: (r) => { this.queueSummary.set(r.data ?? []); this.dec(); }, error: this.dec }),
    beds:            () => this.api.getBeds().subscribe({ next: (r) => { this.beds.set(r.data ?? []); this.dec(); }, error: this.dec }),
    encounters:      () => this.api.getEncounters().subscribe({ next: (r) => { this.encounters.set(r.data ?? []); this.dec(); }, error: this.dec }),
    vitals:          () => this.api.getVitals().subscribe({ next: (r) => { this.vitals.set(r.data ?? []); this.dec(); }, error: this.dec }),
    diagnoses:       () => this.api.getDiagnoses().subscribe({ next: (r) => { this.diagnoses.set(r.data ?? []); this.dec(); }, error: this.dec }),
    prescriptions:   () => this.api.getPrescriptions().subscribe({ next: (r) => { this.prescriptions.set(r.data ?? []); this.dec(); }, error: this.dec }),
    labRequests:     () => this.api.getLabRequests().subscribe({ next: (r) => { this.labRequests.set(r.data ?? []); this.dec(); }, error: this.dec }),
    invoices:        () => this.api.getInvoices().subscribe({ next: (r) => { this.invoices.set(r.data ?? []); this.dec(); }, error: this.dec }),
    payments:        () => this.api.getPayments().subscribe({ next: (r) => { this.payments.set(r.data ?? []); this.dec(); }, error: this.dec }),
    receipts:        () => this.api.getReceipts().subscribe({ next: (r) => { this.receipts.set(r.data ?? []); this.dec(); }, error: this.dec }),
    services:        () => this.api.getServiceStatuses().subscribe({ next: (r) => { this.services.set(r ?? []); this.dec(); }, error: this.dec }),
    emailOutbox:     () => this.api.getEmailOutbox().subscribe({ next: (r) => { this.emailOutbox.set(r.data ?? []); this.dec(); }, error: this.dec }),
    enterpriseRecords: () => this.api.getEnterpriseRecords().subscribe({ next: (r) => { this.enterpriseRecords.set(r.data ?? []); this.dec(); }, error: this.dec }),
  };

  private pending = 0;
  private dec = () => {
    this.pending -= 1;
    if (this.pending <= 0) {
      this.pending = 0;
      this.loading.set(false);
    }
  };

  loadAll() {
    const role = this.api.session()?.role;
    if (!role) { this.loading.set(false); return; }

    const endpointKeys = this.roleDataEndpoints[role] ?? ['patients', 'appointments', 'queue'];
    this.pending = endpointKeys.length;
    this.loading.set(true);

    for (const key of endpointKeys) {
      const loader = this.endpointLoaders[key];
      if (loader) loader();
    }

    // If no endpoints matched, turn off loading immediately
    if (this.pending === 0) this.loading.set(false);
  }

  // ── CRUD Operations ──
  createEmployee(payload: Parameters<typeof this.api.createEmployee>[0]) {
    return this.api.createEmployee(payload);
  }

  resendEmployeeInvite(id: string) {
    return this.api.resendEmployeeInvite(id);
  }

  copyLatestEmailLink(email: string) {
    return this.api.getLatestEmailLink(email);
  }

  createRole(payload: Parameters<typeof this.api.createRole>[0]) {
    return this.api.createRole(payload);
  }

  updateRole(role: string, payload: Parameters<typeof this.api.updateRole>[1]) {
    return this.api.updateRole(role, payload);
  }

  createPermission(payload: Parameters<typeof this.api.createPermission>[0]) {
    return this.api.createPermission(payload);
  }

  createDepartment(payload: Parameters<typeof this.api.createDepartment>[0]) {
    return this.api.createDepartment(payload);
  }

  createInsuranceCompany(payload: Parameters<typeof this.api.createInsuranceCompany>[0]) {
    return this.api.createInsuranceCompany(payload);
  }

  createPatient(payload: Parameters<typeof this.api.createPatient>[0]) {
    return this.api.createPatient(payload);
  }

  createAppointment(payload: Parameters<typeof this.api.createAppointment>[0]) {
    return this.api.createAppointment(payload);
  }

  updateAppointmentStatus(id: string, status: string) {
    return this.api.updateAppointmentStatus(id, status);
  }

  startService(id: string) {
    return this.api.startService(id);
  }

  createEncounter(payload: Parameters<typeof this.api.createEncounter>[0]) {
    return this.api.createEncounter(payload);
  }

  createVitals(payload: Parameters<typeof this.api.createVitals>[0]) {
    return this.api.createVitals(payload);
  }

  createDiagnosis(payload: Parameters<typeof this.api.createDiagnosis>[0]) {
    return this.api.createDiagnosis(payload);
  }

  createPrescription(payload: Parameters<typeof this.api.createPrescription>[0]) {
    return this.api.createPrescription(payload);
  }

  createLabRequest(payload: Parameters<typeof this.api.createLabRequest>[0]) {
    return this.api.createLabRequest(payload);
  }

  createInvoice(payload: Parameters<typeof this.api.createInvoice>[0]) {
    return this.api.createInvoice(payload);
  }

  recordPayment(payload: Parameters<typeof this.api.recordPayment>[0]) {
    return this.api.recordPayment(payload);
  }

  createEnterpriseRecord(payload: Parameters<typeof this.api.createEnterpriseRecord>[0]) {
    return this.api.createEnterpriseRecord(payload);
  }

  updateEnterpriseRecordStatus(id: string, status: string) {
    return this.api.updateEnterpriseRecordStatus(id, status);
  }

  // ── Helper Methods ──
  patientName(id: string) {
    const p = this.patients().find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : id;
  }

  doctorName(id: string) {
    const d = this.employees().find((x) => x.id === id);
    return d ? `${d.firstName} ${d.lastName}` : id;
  }

  employeeById(id: string) {
    return this.employees().find((e) => e.id === id);
  }

  patientById(id: string) {
    return this.patients().find((p) => p.id === id);
  }

  insuranceName(id?: string) {
    return this.insuranceCompanies().find((c) => c.id === id)?.name ?? '';
  }

  doctorQueueCount(doctorId: string) {
    const today = new Date().toISOString().slice(0, 10);
    return this.appointments().filter((a) =>
      a.doctorId === doctorId && a.startsAtUtc.slice(0, 10) === today &&
      ['Scheduled', 'Waiting', 'In Service'].includes(a.queueStatus)
    ).length;
  }

  departmentStaffCount(departmentName: string) {
    return this.employees().filter((e) => e.department === departmentName).length;
  }

  totalBilled() {
    return this.invoices().reduce((t, i) => t + i.total, 0);
  }

  totalCollected() {
    return this.invoices().reduce((t, i) => t + i.paid, 0);
  }

  totalOpenBalance() {
    return this.invoices().reduce((t, i) => t + i.balance, 0);
  }

  invoiceFor(id: string) {
    return this.invoices().find((i) => i.id === id);
  }

  filtered<T extends object>(items: T[]) {
    const term = this.search().trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(term));
  }

  // ── Export / Print ──
  exportExcel(name: string, rows: object[]) {
    const data = this.filtered(rows);
    if (!data.length) { this.toast('info', 'No rows to export.'); return; }
    const cols = Object.keys(data[0]).filter((k) => !k.toLowerCase().includes('photo'));
    const html = `<table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${data.map((r) => `<tr>${cols.map((c) => `<td>${this.cell((r as Record<string, unknown>)[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    this.download(`${name}.xls`, 'application/vnd.ms-excel', html);
    this.toast('success', 'Excel file is ready.');
  }

  exportPdf(name: string, rows: object[]) {
    this.openPrintable(name, rows, true);
    this.toast('info', 'Use the print dialog destination "Save as PDF".');
  }

  printTable(name: string, rows: object[]) {
    this.openPrintable(name, rows, false);
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
      <tr><td>${this.cell(item.serviceCode)}</td><td>${this.cell(item.description)}</td><td>${item.quantity}</td><td>${this.money(item.unitPrice)}</td><td>${this.money(item.discount)}</td><td>${this.money(item.lineTotal)}</td></tr>`).join('');
    this.openDocument('Invoice', `
      <div class="brand"><div class="brand-left"><span class="print-logo">H</span><div><strong>HMS Platform</strong><span>Patient Invoice</span></div></div><b>${invoice.invoiceNumber}</b></div>
      ${this.patientPrintBlock(patient)}
      <table><thead><tr><th>Code</th><th>Description</th><th>Qty</th><th>Unit</th><th>Discount</th><th>Total</th></tr></thead><tbody>${items}</tbody></table>
      ${this.totalBlock([['Subtotal', invoice.subtotal], ['Discount', invoice.discount], ['Tax', invoice.tax], ['Total', invoice.total], ['Paid', invoice.paid], ['Balance', invoice.balance]])}
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

  copySetupUrl(setupUrl: string) {
    if (!setupUrl) return;
    navigator.clipboard?.writeText(setupUrl).then(
      () => this.toast('info', 'Setup link copied to clipboard for local testing.'),
      () => this.toast('info', 'Setup link is available in the Identity API email outbox.')
    );
  }

  // ── Toast ──
  toast(kind: ToastKind, message: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    this.toasts.update((items) => [...items, { id, kind, message }]);
    setTimeout(() => this.toasts.update((items) => items.filter((t) => t.id !== id)), 4800);
  }

  dismissToast(id: number) {
    this.toasts.update((items) => items.filter((t) => t.id !== id));
  }

  // ── Private Helpers ──
  private chartRows(rows: Array<[string, number]>) {
    const max = Math.max(...rows.map((r) => r[1]), 1);
    return rows.map(([label, value]) => ({ label, value, percent: Math.round((value / max) * 100) }));
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
    if (!patient) return '<div class="patient"><strong>Patient</strong><span>Not selected</span></div>';
    return `<div class="patient">
      <div><strong>${this.cell(patient.mrn)}</strong><br>${this.cell(patient.firstName)} ${this.cell(patient.lastName)}</div>
      <div><strong>Phone</strong><br>${this.cell(patient.phone)}</div>
      <div><strong>Insurance</strong><br>${this.cell(patient.insuranceCompanyName || patient.insuranceProvider || 'Self Pay')}</div>
      <div><strong>Policy</strong><br>${this.cell(patient.insurancePolicyNumber || '-')}</div>
    </div>`;
  }

  private totalBlock(rows: Array<[string, number]>) {
    return `<div class="totals">${rows.map(([label, value], i) =>
      `<div>${i === rows.length - 1 ? `<strong>${label}</strong><strong>${this.money(value)}</strong>` : `<span>${label}</span><span>${this.money(value)}</span>`}</div>`
    ).join('')}</div>`;
  }

  private openPrintable(name: string, rows: object[], pdfMode: boolean) {
    const data = this.filtered(rows);
    const cols = data[0] ? Object.keys(data[0]).filter((k) => !k.toLowerCase().includes('photo')) : [];
    const body = data.map((r) => `<tr>${cols.map((c) => `<td>${this.cell((r as Record<string, unknown>)[c])}</td>`).join('')}</tr>`).join('');
    const win = window.open('', '_blank', 'width=1100,height=760');
    if (!win) return;
    win.document.write(`
      <html><head><title>${name}</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111827} h1{font-size:22px}
      table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #d1d5db;padding:8px;text-align:left}
      th{background:#f3f4f6;text-transform:uppercase} .hint{color:#64748b;margin-bottom:18px}
      </style></head><body><h1>${name}</h1><p class="hint">${pdfMode ? 'Choose Save as PDF in your print dialog.' : 'Print-ready HMS report.'}</p>
      <table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  }

  private download(filename: string, type: string, content: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  money(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(value);
  }

  cell(value: unknown) {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined) return '';
    return String(value).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] ?? c));
  }
}
