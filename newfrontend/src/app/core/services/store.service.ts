import { Injectable, computed, signal, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../api.service';
import type {
  User, UserRole, Patient, Appointment, Prescription, Medication, LabOrder,
  BillingInvoice, Department, Bed, BedAdmission, InsuranceClaim, MedicalRecord,
  ToastMessage, VitalSigns, EnterpriseModule, DiagnosticTest, LabResultItem, ClinicalVitalEntry,
  ClinicalDiagnosis, BackendEmployee, BackendDoctorProfile,
  BackendPatient, BackendAppointment, BackendLabRequest,
  BackendPrescription, BackendDepartment, BackendBed, BackendBedAdmission, BackendDiagnosticTest, BackendVitalSign, BackendDiagnosis,
  BackendInvoice, BackendInvoiceItem, BackendEnterpriseRecord,
  BackendClinicalEncounter, BackendInsuranceCompany, BackendQueueSummary,
  WardConfig, MedicalCertificate, ReferralRecord,
} from '../models';
import { AVATARS } from '../models';

@Injectable({ providedIn: 'root' })
export class StoreService {
  private api = inject(ApiService);

  // ── Auth State ──
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.api.session());
  readonly session = computed(() => this.api.session());

  // ── Loading State ──
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly pending = signal(0);
  // Tracks whether the data endpoints for the current session have been fetched.
  // Used to re-hydrate the store when a session is restored (page refresh / reopen)
  // without double-fetching right after a fresh login.
  readonly dataLoaded = signal(false);
  readonly loadFailed = signal(false);
  private currentLoadEndpointCount = 0;
  private loadSuccessCount = 0;
  private loadFailureCount = 0;
  private readonly prescriptionPayloadMarker = 'HMS_RX_JSON:';

  // ── Global Search ──
  readonly globalSearchQuery = signal('');

  // ── Toast State ──
  readonly toasts = signal<ToastMessage[]>([]);

  // ── Data Signals (Backend-backed) ──
  readonly employees = signal<BackendEmployee[]>([]);
  readonly doctors = signal<BackendDoctorProfile[]>([]);
  readonly patients = signal<Patient[]>([]);
  readonly appointments = signal<Appointment[]>([]);
  readonly beds = signal<Bed[]>([]);
  readonly bedAdmissions = signal<BedAdmission[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly prescriptions = signal<Prescription[]>([]);
  readonly labOrders = signal<LabOrder[]>([]);
  readonly diagnosticTests = signal<DiagnosticTest[]>([]);
  readonly clinicalVitals = signal<ClinicalVitalEntry[]>([]);
  readonly clinicalDiagnoses = signal<ClinicalDiagnosis[]>([]);
  readonly billingInvoices = signal<BillingInvoice[]>([]);
  readonly medicalRecords = signal<MedicalRecord[]>([]);
  readonly insuranceClaims = signal<InsuranceClaim[]>([]);
  readonly insuranceCompanies = signal<BackendInsuranceCompany[]>([]);
  readonly enterpriseRecords = signal<BackendEnterpriseRecord[]>([]);
  readonly queueSummary = signal<BackendQueueSummary[]>([]);
  readonly wardConfigs = signal<WardConfig[]>(this.loadLocalArray<WardConfig>('hms.wardConfigs', this.defaultWardConfigs()));
  readonly allClinicalHistoryPatients = signal<Patient[]>([]);
  readonly medicalCertificates = signal<MedicalCertificate[]>(this.loadLocalArray<MedicalCertificate>('hms.medicalCertificates', []));
  readonly referralRecords = signal<ReferralRecord[]>(this.loadLocalArray<ReferralRecord>('hms.referralRecords', []));

  // ── Employees as Users (for staff directory) ──
  readonly employeesAsUsers = computed<User[]>(() =>
    this.employees().map(e => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      email: e.emailAddress,
      role: e.role as UserRole,
      department: e.department || 'General',
      phone: e.phone || '',
      avatarUrl: this.getAvatarForRole(e.role),
      specialization: e.specialization,
      status: e.isActive ? 'ACTIVE' as const : 'INACTIVE' as const,
      licenseNumber: e.specialization ? `LIC-${e.id.slice(0, 6).toUpperCase()}` : undefined,
    }))
  );

  // ── Computed Signals ──
  readonly totalPatientsCount = computed(() => this.patients().length);
  readonly admittedPatientsCount = computed(() => this.patients().filter(p => p.status === 'ADMITTED').length);
  readonly outpatientCount = computed(() => this.patients().filter(p => p.status === 'OUTPATIENT').length);
  readonly triageCount = computed(() => this.patients().filter(p => p.status === 'IN_TRIAGE').length);
  readonly todayAppointmentsCount = computed(() => this.appointments().length);
  readonly pendingLabOrdersCount = computed(() => this.labOrders().filter(l => l.status !== 'COMPLETED').length);
  readonly pendingPrescriptionsCount = computed(() => this.prescriptions().filter(p => p.status === 'PENDING').length);
  readonly unpaidInvoicesTotal = computed(() =>
    this.billingInvoices()
      .filter(i => i.status === 'UNPAID' || i.status === 'INSURANCE_PENDING')
      .reduce((sum, inv) => sum + (inv.totalAmount - inv.patientPaidAmount - inv.insuranceCoveredAmount), 0)
  );

  readonly bedOccupancyRate = computed(() => {
    const total = this.beds().length;
    const occupied = this.beds().filter(b => b.isOccupied).length;
    return total > 0 ? Math.round((occupied / total) * 100) : 0;
  });

  // ── Queue Summary (with resolved doctor names) ──
  // The Patients API resolves doctor names from the Identity service. When Identity
  // is unreachable the API falls back to the doctor ID; detect that and resolve the
  // name from the locally-loaded employee/doctor data instead.
  readonly queueSummaryWithNames = computed(() =>
    this.queueSummary().map(row => ({
      ...row,
      doctorName: this.queueDoctorName(row),
    }))
  );

  readonly clinicalWorklistPatients = computed(() => {
    const user = this.currentUser();
    const settledPatientIds = new Set(
      this.billingInvoices()
        .filter(invoice => this.invoiceClearsClinicalAccess(invoice))
        .map(invoice => invoice.patientId)
    );

    return this.patients().filter(patient => {
      const hasEmergencyAccess = this.hasEmergencyClinicalAccess(patient.id, user);
      if (!settledPatientIds.has(patient.id) && !hasEmergencyAccess) return false;
      if (user?.role === 'DOCTOR') {
        return this.appointments().some(appointment =>
          appointment.patientId === patient.id &&
          appointment.doctorId === user.id &&
          appointment.status !== 'CANCELLED' &&
          appointment.status !== 'NO_SHOW');
      }
      if (user?.role === 'NURSE') {
        return this.appointments().some(appointment =>
          appointment.patientId === patient.id &&
          appointment.status !== 'CANCELLED' &&
          appointment.status !== 'NO_SHOW');
      }
      return true;
    }).sort((left, right) => this.patientQueueRank(left.id, user) - this.patientQueueRank(right.id, user));
  });

  readonly roleVisiblePatients = computed(() => {
    const user = this.currentUser();
    if (user?.role === 'DOCTOR') {
      const assignedIds = new Set(this.clinicalWorklistPatients().map(patient => patient.id));
      return this.patients().filter(patient => assignedIds.has(patient.id));
    }
    return this.patients();
  });

  readonly activeWardConfigs = computed(() =>
    this.wardConfigs()
      .filter(ward => ward.isActive)
      .sort((left, right) => left.name.localeCompare(right.name)));

  // ── Enterprise Modules ──
  readonly enterpriseModules: EnterpriseModule[] = [
    { id: 'pharmacy', label: 'Pharmacy', area: 'Pharmacy', department: 'Pharmacy', owner: 'Pharmacist', action: 'Dispense Medication', description: 'Prescription review, dispensing, stock posting, counselling, controlled-drug handling, and pharmacy billing.',
      workflow: ['Review prescription', 'Check stock and safety', 'Dispense medication', 'Post stock movement', 'Send charge to billing', 'Counsel patient'] },
    { id: 'laboratory', label: 'Laboratory', area: 'Laboratory', department: 'Laboratory', owner: 'Lab Technician', action: 'Process Result',
      description: 'Specimen collection, test processing, result verification, abnormal flagging, and release to the clinician.',
      workflow: ['Receive request', 'Collect specimen', 'Run test', 'Verify result', 'Release report', 'Notify clinician'] },
    { id: 'radiology', label: 'Radiology', area: 'Radiology', department: 'Radiology', owner: 'Radiology Officer', action: 'Schedule Imaging',
      description: 'Imaging orders, modality schedule, reporting, image references, and doctor notification.',
      workflow: ['Receive imaging order', 'Schedule modality', 'Capture image', 'Prepare report', 'Attach reference', 'Release to doctor'] },
    { id: 'inpatient', label: 'Inpatient', area: 'Inpatient', department: 'Medical Ward', owner: 'Charge Nurse', action: 'Manage Admission',
      description: 'Admissions, transfers, bed occupancy, nursing notes, care plan, medication administration, and discharge preparation.',
      workflow: ['Admit patient', 'Assign bed', 'Create care plan', 'Record nursing notes', 'Prepare discharge', 'Close admission'] },
    { id: 'emergency', label: 'Emergency', area: 'Emergency', department: 'Emergency', owner: 'ER Nurse', action: 'Triage Case',
      description: 'Triage, priority queue, emergency visit handling, stabilization, and ward handoff.',
      workflow: ['Register emergency case', 'Assign triage level', 'Stabilize patient', 'Call clinician', 'Order investigations', 'Admit or discharge'] },
    { id: 'theatre', label: 'Operating Theatre', area: 'Operating Theatre', department: 'Operating Theatre', owner: 'Theatre Coordinator', action: 'Schedule Surgery',
      description: 'Surgery schedule, theatre availability, checklist, anesthesia readiness, recovery, and utilization review.',
      workflow: ['Book theatre', 'Confirm team', 'Complete checklist', 'Prepare anesthesia', 'Record recovery', 'Update theatre utilization'] },
    { id: 'inventory', label: 'Inventory', area: 'Inventory', department: 'Main Store', owner: 'Store Keeper', action: 'Post Stock Movement',
      description: 'Stock ledger, reorder level, expiry alerts, department issue, receiving, and stock adjustment.',
      workflow: ['Review stock level', 'Create movement', 'Approve issue', 'Update ledger', 'Check expiry', 'Notify department'] },
    { id: 'procurement', label: 'Procurement', area: 'Procurement', department: 'Procurement', owner: 'Procurement Officer', action: 'Raise Purchase Request',
      description: 'Purchase requests, approval, supplier quotation, purchase order, goods receiving, and supplier tracking.',
      workflow: ['Raise request', 'Review budget', 'Collect quotation', 'Approve order', 'Receive goods', 'Close purchase'] },
    { id: 'assets', label: 'Assets', area: 'Asset Management', department: 'Administration', owner: 'Asset Officer', action: 'Register Asset',
      description: 'Asset register, custodian assignment, warranty, depreciation, transfer, and disposal control.',
      workflow: ['Register asset', 'Assign custodian', 'Record location', 'Schedule inspection', 'Track warranty', 'Retire asset'] },
    { id: 'biomedical', label: 'Biomedical', area: 'Biomedical Maintenance', department: 'Biomedical', owner: 'Biomedical Engineer', action: 'Create Work Order',
      description: 'Equipment maintenance, calibration, spare parts, downtime tracking, and vendor service history.',
      workflow: ['Log fault', 'Assign engineer', 'Diagnose issue', 'Record parts', 'Calibrate equipment', 'Release to service'] },
    { id: 'claims', label: 'Insurance Claims', area: 'Insurance Claims', department: 'Billing', owner: 'Claims Officer', action: 'Prepare Claim',
      description: 'Eligibility, claim preparation, submission, rejection handling, remittance, and outstanding follow-up.',
      workflow: ['Check eligibility', 'Attach invoice', 'Prepare claim', 'Submit payer file', 'Post remittance', 'Follow outstanding'] },
    { id: 'security', label: 'Security Audit', area: 'Security Audit', department: 'Administration', owner: 'System Admin', action: 'Log Audit Review',
      description: 'Access review, role audit, password setup review, session checks, consent monitoring, and security exceptions.',
      workflow: ['Select review area', 'Check user access', 'Record exception', 'Assign correction', 'Approve closure', 'Archive evidence'] },
    { id: 'notifications', label: 'Notifications', area: 'Notifications', department: 'IT', owner: 'System Admin', action: 'Send Notification Task',
      description: 'Email, SMS, appointment reminders, queue alerts, payment alerts, retry tracking, and delivery follow-up.',
      workflow: ['Choose channel', 'Prepare message', 'Send or queue', 'Track delivery', 'Retry failed item', 'Close notification'] },
    { id: 'documents', label: 'Documents', area: 'Documents', department: 'Records', owner: 'Records Officer', action: 'Index Document',
      description: 'Patient documents, consent forms, scanned attachments, image references, storage metadata, and access audit.',
      workflow: ['Receive document', 'Select patient', 'Index metadata', 'Store reference', 'Confirm access', 'Audit retrieval'] },
    { id: 'reporting', label: 'Reporting', area: 'Reporting', department: 'Finance', owner: 'Reporting Officer', action: 'Prepare Report',
      description: 'Daily performance pack, revenue, queue, bed occupancy, department workload, A/R, and inventory alerts.',
      workflow: ['Collect data', 'Validate figures', 'Prepare report', 'Review exceptions', 'Share dashboard', 'Archive snapshot'] },
    { id: 'integration', label: 'Integration', area: 'Integration', department: 'IT', owner: 'Integration Officer', action: 'Register Integration',
      description: 'Payment gateway, SMS gateway, payer integration, lab equipment, external API contract, and reconciliation readiness.',
      workflow: ['Register endpoint', 'Store credentials', 'Test request', 'Map response', 'Monitor failures', 'Reconcile transactions'] },
  ];

  // ── Login / Logout ──
  login(emailAddress: string, password: string): Observable<any> {
    return this.api.login(emailAddress, password).pipe(
      tap(res => {
        if (res.success) {
          this.api.storeSession(res.data);
          this.setCurrentUserFromSession();
        }
      })
    );
  }

  logout() {
    this.api.clearSession();
    this.currentUser.set(null);
    this.patients.set([]);
    this.appointments.set([]);
    this.employees.set([]);
    this.doctors.set([]);
    this.prescriptions.set([]);
    this.labOrders.set([]);
    this.diagnosticTests.set([]);
    this.clinicalVitals.set([]);
    this.clinicalDiagnoses.set([]);
    this.billingInvoices.set([]);
    this.beds.set([]);
    this.bedAdmissions.set([]);
    this.departments.set([]);
    this.insuranceCompanies.set([]);
    this.enterpriseRecords.set([]);
    this.medicalRecords.set([]);
    this.insuranceClaims.set([]);
    this.queueSummary.set([]);
    this.allClinicalHistoryPatients.set([]);
    this.medicalCertificates.set(this.loadLocalArray<MedicalCertificate>('hms.medicalCertificates', []));
    this.referralRecords.set(this.loadLocalArray<ReferralRecord>('hms.referralRecords', []));
    this.wardConfigs.set(this.loadLocalArray<WardConfig>('hms.wardConfigs', this.defaultWardConfigs()));
    this.dataLoaded.set(false);
  }

  private setCurrentUserFromSession() {
    const s = this.api.session();
    if (!s) return;
    this.currentUser.set({
      id: s.employeeId,
      name: s.emailAddress.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: s.emailAddress,
      role: s.role as UserRole,
      department: 'General',
      phone: '',
      avatarUrl: this.getAvatarForRole(s.role),
      status: 'ACTIVE',
    });
  }

  private getAvatarForRole(role: string): string {
    const key = role.startsWith('ADMIN') ? 'admin' :
      role.startsWith('DOCTOR') ? 'doctor' :
      role.startsWith('NURSE') ? 'nurse' :
      role.startsWith('RECEPTION') ? 'receptionist' :
      role.startsWith('PHARMAC') ? 'pharmacist' :
      role.startsWith('LAB') ? 'lab' :
      role.startsWith('BILLING') || role.startsWith('ACCOUNT') || role.startsWith('CASHIER') ? 'billing' : 'default';
    return AVATARS[key] || AVATARS['default'];
  }

  // ── Data Loading ──
  loadAll() {
    const session = this.api.session();
    if (!session) return;
    // Already loaded for this session (e.g. the layout remounts right after login)
    // or a load is already in flight — never double-fetch.
    if (this.dataLoaded() || this.isLoading()) return;
    this.setCurrentUserFromSession();
    this.isLoading.set(true);
    this.pending.set(0);
    this.currentLoadEndpointCount = 0;
    this.loadSuccessCount = 0;
    this.loadFailureCount = 0;
    this.loadFailed.set(false);

    // Determine which endpoints to call based on role
    const role = session.role;
    const endpoints = this.getEndpointsForRole(role);
    this.currentLoadEndpointCount = endpoints.length;
    this.pending.set(endpoints.length);

    for (const ep of endpoints) {
      this.callEndpoint(ep);
    }

    if (endpoints.length === 0) {
      this.isLoading.set(false);
      this.dataLoaded.set(true);
    }
  }

  loadDepartments() {
    this.api.getDepartments().subscribe({
      next: (r) => {
        if (r.data) this.departments.set(r.data.map(d => this.mapBackendDepartment(d)));
      },
      error: () => this.addToast('error', 'Departments Unavailable', 'Department master data could not be loaded.'),
    });
  }

  loadDoctors() {
    this.api.getDoctors().subscribe({
      next: (r) => {
        if (r.data) {
          this.doctors.set(r.data);
          this.refreshResolvedDisplayValues();
        }
      },
      error: () => this.addToast('error', 'Doctors Unavailable', 'Doctor master data could not be loaded.'),
    });
  }

  loadInsuranceCompanies() {
    this.api.getInsuranceCompanies().subscribe({
      next: (r) => {
        if (r.data) this.insuranceCompanies.set(r.data);
      },
      error: () => this.addToast('error', 'Insurance Unavailable', 'Insurance company master data could not be loaded.'),
    });
  }

  loadClinicalHistoryPatients() {
    this.api.getPatients(true).subscribe({
      next: (r) => {
        if (r.data) this.allClinicalHistoryPatients.set(r.data.map(p => this.mapBackendPatient(p)));
      },
      error: () => {
        if (this.allClinicalHistoryPatients().length === 0) {
          this.allClinicalHistoryPatients.set(this.patients());
        }
      },
    });
  }

  private callEndpoint(key: string) {
    const dec = (failed = false) => {
      if (failed) {
        this.loadFailureCount += 1;
      } else {
        this.loadSuccessCount += 1;
      }

      this.pending.update(p => p - 1);
      if (this.pending() <= 0) {
        this.pending.set(0);
        this.isLoading.set(false);
        // Empty databases are valid, so a successful endpoint counts as a load even
        // when it returns no rows. A fully failed boot stays retryable.
        if (this.loadSuccessCount > 0 || this.hasAnyLoadedData()) {
          this.dataLoaded.set(true);
        } else if (this.currentLoadEndpointCount > 0 && this.loadFailureCount >= this.currentLoadEndpointCount) {
          this.loadFailed.set(true);
          this.addToast('error', 'Backend Unavailable', 'No system data was loaded. Check the API Gateway and backend services, then refresh.');
        }
      }
    };

    switch (key) {
      case 'employees':
        this.api.getEmployees().subscribe({ next: (r) => { if (r.data) { this.employees.set(r.data); this.refreshResolvedDisplayValues(); } dec(); }, error: () => dec(true) });
        break;
      case 'doctors':
        this.api.getDoctors().subscribe({ next: (r) => { if (r.data) { this.doctors.set(r.data); this.refreshResolvedDisplayValues(); } dec(); }, error: () => dec(true) });
        break;
      case 'patients':
        this.api.getPatients().subscribe({
          next: (r) => { if (r.data) { this.patients.set(r.data.map(p => this.mapBackendPatient(p))); this.refreshResolvedDisplayValues(); } dec(); },
          error: () => { this.addToast('error', 'Patient Registry Unavailable', 'The patient list could not be loaded. Sign out and back in to retry.'); dec(true); },
        });
        break;
      case 'appointments':
        this.api.getAppointments().subscribe({ next: (r) => { if (r.data) this.appointments.set(this.sortAppointmentsForQueue(r.data.map(a => this.mapBackendAppointment(a)))); dec(); }, error: () => dec(true) });
        break;
      case 'departments':
        this.api.getDepartments().subscribe({ next: (r) => { if (r.data) this.departments.set(r.data.map(d => this.mapBackendDepartment(d))); dec(); }, error: () => dec(true) });
        break;
      case 'insuranceCompanies':
        this.api.getInsuranceCompanies().subscribe({ next: (r) => { if (r.data) this.insuranceCompanies.set(r.data); dec(); }, error: () => dec(true) });
        break;
      case 'beds':
        this.api.getBeds().subscribe({ next: (r) => { if (r.data) { this.beds.set(r.data.map(b => this.mapBackendBed(b))); this.refreshResolvedDisplayValues(); } dec(); }, error: () => dec(true) });
        break;
      case 'bedAdmissions':
        this.api.getBedAdmissions().subscribe({ next: (r) => { if (r.data) this.bedAdmissions.set(r.data.map(a => this.mapBackendBedAdmission(a))); dec(); }, error: () => dec(true) });
        break;
      case 'prescriptions':
        this.api.getPrescriptions().subscribe({ next: (r) => { if (r.data) this.prescriptions.set(r.data.map(p => this.mapBackendPrescription(p))); dec(); }, error: () => dec(true) });
        break;
      case 'labRequests':
        this.api.getLabRequests().subscribe({ next: (r) => { if (r.data) this.labOrders.set(r.data.map(l => this.mapBackendLabRequest(l))); dec(); }, error: () => dec(true) });
        break;
      case 'diagnosticTests':
        this.api.getDiagnosticTests().subscribe({ next: (r) => { if (r.data) this.diagnosticTests.set(r.data.map(t => this.mapBackendDiagnosticTest(t))); dec(); }, error: () => dec(true) });
        break;
      case 'vitals':
        this.api.getVitals().subscribe({ next: (r) => { if (r.data) this.clinicalVitals.set(r.data.map(v => this.mapBackendVital(v))); dec(); }, error: () => dec(true) });
        break;
      case 'diagnoses':
        this.api.getDiagnoses().subscribe({ next: (r) => { if (r.data) this.clinicalDiagnoses.set(r.data.map(d => this.mapBackendDiagnosis(d))); dec(); }, error: () => dec(true) });
        break;
      case 'invoices':
        this.api.getInvoices().subscribe({ next: (r) => { if (r.data) this.billingInvoices.set(r.data.map(i => this.mapBackendInvoice(i))); dec(); }, error: () => dec(true) });
        break;
      case 'clinicalEncounters':
        this.api.getEncounters().subscribe({ next: (r) => { if (r.data) this.medicalRecords.set(r.data.map(e => this.mapBackendEncounter(e))); dec(); }, error: () => dec(true) });
        break;
      case 'enterpriseRecords':
        this.api.getEnterpriseRecords().subscribe({ next: (r) => { if (r.data) this.enterpriseRecords.set(r.data); dec(); }, error: () => dec(true) });
        break;
      case 'queue':
        this.api.getQueueSummary().subscribe({ next: (r) => { if (r.data) this.queueSummary.set(r.data); dec(); }, error: () => dec(true) });
        break;
      default:
        dec();
    }
  }

  /** True when any data endpoint has actually populated its signal. */
  private hasAnyLoadedData(): boolean {
    return this.employees().length > 0
      || this.doctors().length > 0
      || this.patients().length > 0
      || this.appointments().length > 0
      || this.departments().length > 0
      || this.insuranceCompanies().length > 0
      || this.beds().length > 0
      || this.bedAdmissions().length > 0
      || this.prescriptions().length > 0
      || this.labOrders().length > 0
      || this.diagnosticTests().length > 0
      || this.clinicalVitals().length > 0
      || this.clinicalDiagnoses().length > 0
      || this.billingInvoices().length > 0
      || this.medicalRecords().length > 0
      || this.enterpriseRecords().length > 0
      || this.queueSummary().length > 0;
  }

  private getEndpointsForRole(role: string): string[] {
    const roleEndpoints: Record<string, string[]> = {
      ADMIN: ['employees', 'doctors', 'patients', 'appointments', 'departments', 'insuranceCompanies', 'beds', 'bedAdmissions', 'diagnosticTests', 'prescriptions', 'labRequests', 'vitals', 'diagnoses', 'invoices', 'enterpriseRecords', 'clinicalEncounters', 'queue'],
      DOCTOR: ['doctors', 'patients', 'appointments', 'departments', 'insuranceCompanies', 'bedAdmissions', 'invoices', 'diagnosticTests', 'prescriptions', 'labRequests', 'vitals', 'diagnoses', 'clinicalEncounters', 'queue'],
      NURSE: ['doctors', 'patients', 'appointments', 'departments', 'insuranceCompanies', 'invoices', 'beds', 'bedAdmissions', 'diagnosticTests', 'prescriptions', 'vitals', 'diagnoses', 'clinicalEncounters', 'queue'],
      RECEPTIONIST: ['doctors', 'patients', 'appointments', 'departments', 'insuranceCompanies', 'beds', 'bedAdmissions', 'invoices', 'queue'],
      PHARMACIST: ['doctors', 'patients', 'appointments', 'prescriptions', 'enterpriseRecords'],
      LAB_TECHNICIAN: ['doctors', 'patients', 'appointments', 'diagnosticTests', 'labRequests', 'enterpriseRecords'],
      ACCOUNTANT: ['patients', 'insuranceCompanies', 'bedAdmissions', 'invoices', 'enterpriseRecords'],
      CASHIER: ['patients', 'insuranceCompanies', 'bedAdmissions', 'invoices'],
      HR_MANAGER: ['employees', 'departments'],
    };
    return roleEndpoints[role] || ['doctors', 'patients', 'appointments'];
  }

  // ── Mapping Functions (Backend DTO -> Frontend Model) ──
  private mapBackendPatient(bp: BackendPatient): Patient {
    return {
      id: bp.id,
      mrn: bp.mrn,
      name: `${bp.firstName} ${bp.lastName}`,
      firstName: bp.firstName,
      lastName: bp.lastName,
      dob: bp.dateOfBirth,
      gender: bp.gender,
      bloodType: bp.bloodType || 'O+',
      phone: bp.phone,
      email: bp.email || '',
      address: bp.address || '',
      insuranceProvider: bp.insuranceProvider || bp.insuranceCompanyName || 'Self Pay',
      insurancePolicyNumber: bp.insurancePolicyNumber || '',
      insuranceCompanyName: bp.insuranceCompanyName,
      insuranceCompanyId: bp.insuranceCompanyId,
      insuranceMemberType: this.memberTypeFromPlan(bp.insurancePlan),
      principalMemberName: this.principalNameFromPlan(bp.insurancePlan),
      emergencyContact: {
        name: bp.emergencyContactName || 'Not on file',
        relation: 'Emergency Contact',
        phone: bp.emergencyContactPhone || '',
      },
      status: 'OUTPATIENT',
      assignedDoctorId: undefined,
      assignedDoctorName: undefined,
      primaryCondition: 'General Consultation',
      vitals: {
        bp: '120/80', hr: 72, temp: 37.0, spo2: 98, respiratoryRate: 16, updatedAt: 'N/A',
      },
      allergyList: [],
      registeredDate: new Date().toISOString().split('T')[0],
      photoDataUrl: bp.photoDataUrl,
      employerName: bp.employerName,
      occupation: bp.occupation,
    };
  }

  private memberTypeFromPlan(plan?: string): Patient['insuranceMemberType'] {
    const value = (plan || '').toLowerCase();
    if (value.includes('spouse')) return 'Spouse';
    if (value.includes('child')) return 'Child';
    if (value.includes('employee')) return 'Employee';
    return undefined;
  }

  private principalNameFromPlan(plan?: string): string | undefined {
    const match = (plan || '').match(/of\s+(.+)$/i);
    return match?.[1]?.trim() || undefined;
  }

  private mapBackendAppointment(a: BackendAppointment): Appointment {
    const patient = this.patients().find(p => p.id === a.patientId);
    const employee = this.employees().find(e => e.id === a.doctorId);
    const timeStr = a.startsAtUtc ? new Date(a.startsAtUtc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';

    return {
      id: a.id,
      patientId: a.patientId,
      patientName: this.patientDisplayName(a.patientId),
      patientMrn: this.patientMrn(a.patientId),
      doctorId: a.doctorId,
      doctorName: employee ? `Dr. ${employee.firstName} ${employee.lastName}` : this.doctorDisplayName(a.doctorId),
      department: a.department,
      dateTime: a.startsAtUtc,
      timeSlot: timeStr,
      status: this.mapAppointmentStatus(a.queueStatus || a.status),
      type: this.mapAppointmentType(a.appointmentType || a.priority),
      reason: a.reason,
      notes: a.notes,
      queueNumber: a.queueNumber,
      waitingAhead: a.waitingAhead,
    };
  }

  private mapAppointmentStatus(status?: string): Appointment['status'] {
    const value = (status || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
    if (value === 'completed') return 'COMPLETED';
    if (value === 'cancelled' || value === 'canceled') return 'CANCELLED';
    if (value === 'no show' || value === 'noshow') return 'NO_SHOW';
    if (value === 'in service' || value === 'in progress') return 'IN_PROGRESS';
    return 'SCHEDULED';
  }

  private mapAppointmentType(value?: string): Appointment['type'] {
    const clean = (value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
    if (clean.includes('emergency') || clean.includes('urgent') || clean.includes('critical') || clean.includes('trauma') || clean.includes('accident')) return 'EMERGENCY';
    if (clean.includes('follow')) return 'FOLLOW_UP';
    if (clean.includes('lab')) return 'LAB_TEST';
    if (clean.includes('surgery')) return 'SURGERY';
    return 'CONSULTATION';
  }

  private appointmentStatusToBackend(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'IN_PROGRESS': return 'In Service';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      case 'NO_SHOW': return 'No Show';
      default: return 'Waiting';
    }
  }

  private sortAppointmentsForQueue(appointments: Appointment[]): Appointment[] {
    return [...appointments].sort((left, right) =>
      this.appointmentQueueRank(left) - this.appointmentQueueRank(right) ||
      (left.queueNumber || 9999) - (right.queueNumber || 9999) ||
      new Date(left.dateTime || 0).getTime() - new Date(right.dateTime || 0).getTime());
  }

  private appointmentQueueRank(appointment: Appointment): number {
    const typeRank = appointment.type === 'EMERGENCY' ? 0 : 10;
    const statusRank =
      appointment.status === 'IN_PROGRESS' ? 0 :
      appointment.status === 'SCHEDULED' ? 1 :
      appointment.status === 'COMPLETED' ? 20 :
      30;
    return typeRank + statusRank;
  }

  private hasEmergencyClinicalAccess(patientId: string, user: User | null): boolean {
    return this.appointments().some(appointment => {
      if (appointment.patientId !== patientId || appointment.type !== 'EMERGENCY') return false;
      if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') return false;
      if (user?.role === 'DOCTOR') return appointment.doctorId === user.id;
      return true;
    });
  }

  private patientQueueRank(patientId: string, user: User | null): number {
    const appointment = this.sortAppointmentsForQueue(this.appointments().filter(item => {
      if (item.patientId !== patientId) return false;
      if (user?.role === 'DOCTOR' && item.doctorId !== user.id) return false;
      if (item.status === 'CANCELLED' || item.status === 'NO_SHOW') return false;
      return true;
    }))[0];
    return appointment ? this.appointmentQueueRank(appointment) * 10000 + (appointment.queueNumber || 9999) : 999999;
  }

  private mapBackendDepartment(d: BackendDepartment): Department {
    return {
      id: d.id,
      name: d.name,
      code: d.code,
      type: d.type,
      location: d.location,
      specializations: d.specializations?.length ? d.specializations : this.defaultSpecializationsForDepartment(d.name),
      headDoctorName: 'Department Head',
      totalBeds: 20,
      occupiedBeds: 12,
      activeStaffCount: 10,
      icon: 'local_hospital',
    };
  }

  private mapBackendBed(b: BackendBed): Bed {
    return {
      id: b.id,
      roomNumber: b.room,
      wardName: b.ward,
      bedNumber: b.bedNumber,
      type: b.category || 'Normal',
      category: b.category || 'Normal',
      dailyRate: b.dailyRate || 0,
      currency: b.currency || 'ETB',
      isOccupied: !b.isAvailable,
      currentAdmissionId: b.currentAdmissionId,
      patientId: b.currentPatientId,
      patientName: b.currentPatientName,
      patientMrn: b.currentPatientMrn,
      admittedAtUtc: b.admittedAtUtc,
      admittedDate: b.admittedAtUtc ? new Date(b.admittedAtUtc).toISOString().split('T')[0] : undefined,
    };
  }

  private mapBackendBedAdmission(a: BackendBedAdmission): BedAdmission {
    return {
      id: a.id,
      patientId: a.patientId,
      patientName: a.patientName,
      patientMrn: a.patientMrn,
      bedId: a.bedId,
      wardName: a.ward,
      roomNumber: a.room,
      bedNumber: a.bedNumber,
      bedCategory: a.bedCategory,
      dailyRate: a.dailyRate || 0,
      currency: a.currency || 'ETB',
      admittedAtUtc: a.admittedAtUtc,
      dischargedAtUtc: a.dischargedAtUtc,
      chargeableDays: a.chargeableDays || 0,
      bedCharge: a.bedCharge || 0,
      status: a.status,
      notes: a.notes,
    };
  }

  private mapBackendDiagnosticTest(test: BackendDiagnosticTest): DiagnosticTest {
  return {
    id: test.id,
    groupName: test.groupName,
    subGroup: test.subGroup || 'General',
    testName: test.testName,
    specimenType: test.specimenType || '',
    unit: test.unit || '',
    referenceRange: test.referenceRange || '',
    sortOrder: test.sortOrder || 0,
    isActive: test.isActive,
    price: test.price ?? 0,
    currency: test.currency || 'ETB',
  };
}

  private serializePrescriptionInstructions(rx: Omit<Prescription, 'id' | 'date' | 'status'>): string {
    const instructionText = rx.medications
      .map(item => `${item.name}: ${item.frequency}, ${item.duration}. ${item.instructions}`.trim())
      .filter(Boolean)
      .join('\n');

    return `${this.prescriptionPayloadMarker}${JSON.stringify(rx.medications)}\n${instructionText || 'As directed'}`;
  }

  private parsePrescriptionMedications(p: BackendPrescription): Medication[] {
    const instructions = p.instructions || '';
    const markerIndex = instructions.indexOf(this.prescriptionPayloadMarker);
    if (markerIndex >= 0) {
      const jsonStart = markerIndex + this.prescriptionPayloadMarker.length;
      const jsonEnd = instructions.indexOf('\n', jsonStart);
      const jsonText = (jsonEnd >= 0 ? instructions.slice(jsonStart, jsonEnd) : instructions.slice(jsonStart)).trim();

      try {
        const parsed = JSON.parse(jsonText) as Partial<Medication>[];
        if (Array.isArray(parsed)) {
          const medications = parsed
            .map(item => ({
              name: String(item.name || '').trim(),
              dosage: String(item.dosage || '').trim() || 'As prescribed',
              frequency: String(item.frequency || '').trim() || 'As directed',
              duration: String(item.duration || '').trim() || 'As directed',
              instructions: String(item.instructions || '').trim() || 'As directed by physician',
            }))
            .filter(item => item.name.length > 0);

          if (medications.length > 0) {
            return medications;
          }
        }
      } catch {
        // Older records keep using the plain-text fallback below.
      }
    }

    const cleanInstructions = this.cleanPrescriptionInstructions(instructions) || 'As directed by physician';
    const medicationNames = (p.medication || 'Medication')
      .split(';')
      .map(item => item.trim())
      .filter(Boolean);

    return (medicationNames.length > 0 ? medicationNames : ['Medication']).map(name => ({
      name,
      dosage: 'As prescribed',
      frequency: 'As directed',
      duration: 'As directed',
      instructions: cleanInstructions,
    }));
  }

  private cleanPrescriptionInstructions(instructions?: string): string {
    if (!instructions) return '';
    const markerIndex = instructions.indexOf(this.prescriptionPayloadMarker);
    if (markerIndex < 0) return instructions;

    const jsonEnd = instructions.indexOf('\n', markerIndex + this.prescriptionPayloadMarker.length);
    return jsonEnd >= 0 ? instructions.slice(jsonEnd + 1).trim() : '';
  }

  private mapBackendPrescription(p: BackendPrescription): Prescription {
    const patient = this.patients().find(pat => pat.id === p.patientId);
    const employee = this.employees().find(e => e.id === p.doctorId);
    return {
      id: p.id,
      patientId: p.patientId,
      patientName: this.patientDisplayName(p.patientId),
      patientMrn: this.patientMrn(p.patientId),
      doctorId: p.doctorId,
      doctorName: employee ? `Dr. ${employee.firstName} ${employee.lastName}` : this.doctorDisplayName(p.doctorId),
      date: p.orderedAtUtc ? new Date(p.orderedAtUtc).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      medications: this.parsePrescriptionMedications(p),
      status: 'PENDING',
    };
  }

  private mapBackendLabRequest(l: BackendLabRequest): LabOrder {
    const patient = this.patients().find(p => p.id === l.patientId);
    const employee = this.employees().find(e => e.id === l.doctorId);
    const normalizedStatus = (l.status || '').toLowerCase();
    const status: LabOrder['status'] =
      normalizedStatus.includes('awaiting') && normalizedStatus.includes('payment')
        ? 'AWAITING_PAYMENT'
        : normalizedStatus.includes('complete') || normalizedStatus.includes('verified') || normalizedStatus.includes('result')
        ? 'COMPLETED'
        : normalizedStatus.includes('collected')
          ? 'SAMPLE_COLLECTED'
          : normalizedStatus.includes('progress') || normalizedStatus.includes('analysis')
            ? 'IN_ANALYSIS'
            : 'ORDERED';
    return {
      id: l.id,
      patientId: l.patientId,
      patientName: this.patientDisplayName(l.patientId),
      patientMrn: this.patientMrn(l.patientId),
      doctorId: l.doctorId,
      doctorName: employee ? `Dr. ${employee.firstName} ${employee.lastName}` : this.doctorDisplayName(l.doctorId),
      testName: l.testName,
      testCatalogIds: l.testCatalogIds || [],
      category: (l.category as LabOrder['category']) || 'Biochemistry',
      priority: l.priority,
      specimenType: l.specimenType,
      clinicalNote: l.clinicalNote,
      status,
      result: l.resultSummary || l.resultValue,
      normalRange: l.referenceRange,
      resultFlag: l.resultFlag,
      resultNotes: l.resultNotes,
      performedBy: l.performedBy,
      verifiedBy: l.verifiedBy,
      resultItems: this.parseLabResultItems(l.resultItemsJson),
      isAbnormal: l.resultFlag === 'Abnormal' || l.resultFlag === 'Critical',
      orderedDate: l.orderedAtUtc ? new Date(l.orderedAtUtc).toLocaleString() : new Date().toLocaleString(),
      completedDate: l.resultedAtUtc ? new Date(l.resultedAtUtc).toLocaleString() : undefined,
      collectedDate: l.collectedAtUtc ? new Date(l.collectedAtUtc).toLocaleString() : undefined,
      labTechName: l.performedBy,
    };
  }

  private mapBackendVital(v: BackendVitalSign): ClinicalVitalEntry {
    const patient = this.patients().find(p => p.id === v.patientId);
    return {
      id: v.id,
      patientId: v.patientId,
      patientName: this.patientDisplayName(v.patientId),
      patientMrn: this.patientMrn(v.patientId),
      temperatureC: v.temperatureC,
      pulse: v.pulse,
      respiratoryRate: v.respiratoryRate,
      bloodPressure: v.bloodPressure,
      weightKg: v.weightKg,
      heightCm: v.heightCm,
      recordedAtUtc: v.recordedAtUtc,
    };
  }

  private mapBackendDiagnosis(d: BackendDiagnosis): ClinicalDiagnosis {
    const patient = this.patients().find(p => p.id === d.patientId);
    const employee = this.employees().find(e => e.id === d.doctorId);
    return {
      id: d.id,
      patientId: d.patientId,
      patientName: this.patientDisplayName(d.patientId),
      patientMrn: this.patientMrn(d.patientId),
      doctorId: d.doctorId,
      doctorName: employee ? `Dr. ${employee.firstName} ${employee.lastName}` : this.doctorDisplayName(d.doctorId),
      code: d.code,
      description: d.description,
      severity: d.severity,
      diagnosedAtUtc: d.diagnosedAtUtc,
    };
  }

  private mapBackendEncounter(e: BackendClinicalEncounter): MedicalRecord {
    const patient = this.patients().find(p => p.id === e.patientId);
    const employee = this.employees().find(emp => emp.id === e.doctorId);
    return {
      id: e.id,
      patientId: e.patientId,
      patientName: this.patientDisplayName(e.patientId),
      doctorId: e.doctorId,
      doctorName: employee ? `Dr. ${employee.firstName} ${employee.lastName}` : this.doctorDisplayName(e.doctorId),
      date: e.encounterAtUtc ? new Date(e.encounterAtUtc).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      diagnosis: e.assessment || 'N/A',
      icdCode: undefined,
      symptoms: [e.chiefComplaint].filter(Boolean),
      clinicalNotes: `${e.chiefComplaint}\n\nAssessment: ${e.assessment}\nPlan: ${e.plan}`,
      vitalSigns: {
        bp: 'N/A', hr: 0, temp: 0, spo2: 0, respiratoryRate: 0, updatedAt: 'N/A',
      },
    };
  }

  private mapBackendInvoice(i: BackendInvoice): BillingInvoice {
    const patient = this.patients().find(p => p.id === i.patientId);
    const paymentType = (i.paymentType || '').toUpperCase() === 'INSURANCE' ? 'INSURANCE' as const : 'CASH' as const;
    return {
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      patientId: i.patientId,
      patientName: this.patientDisplayName(i.patientId),
      patientMrn: this.patientMrn(i.patientId),
      date: i.createdAtUtc ? new Date(i.createdAtUtc).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: i.dueAtUtc ? new Date(i.dueAtUtc).toISOString().split('T')[0] : '',
      items: i.items.map((item: BackendInvoiceItem) => ({
        id: item.id,
        serviceCode: item.serviceCode,
        description: item.description,
        category: item.referenceType?.toUpperCase() === 'LAB_REQUEST'
          ? 'Laboratory' as const
          : item.referenceType?.toUpperCase() === 'BED_ADMISSION'
            ? 'Room Charge' as const
            : item.referenceType?.toUpperCase() === 'DOCTOR'
              ? 'Consultation' as const
              : 'Procedure' as const,
        amount: item.lineTotal,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
      })),
      totalAmount: i.total,
      // Trust the authoritative covered amount computed and stored by the Billing
      // service (based on the patient's real coverage). A stored zero is also
      // authoritative — it means no covered portion was resolved — so frontend and
      // backend clearance gates always agree. The client-side estimate is only a
      // fallback when the backend field is entirely absent.
      insuranceCoveredAmount: i.insuranceCoveredAmount != null
        ? i.insuranceCoveredAmount
        : this.invoiceInsuranceCovered(i.total, i.paymentType, i.insuranceProvider, i.patientId),
      patientPaidAmount: i.paid || 0,
      status: this.mapInvoiceStatus(i.status),
      paymentType,
      insuranceProvider: i.insuranceProvider || undefined,
    };
  }

  private invoiceInsuranceCovered(total: number, paymentType?: string, insuranceProvider?: string, patientId?: string): number {
    const isInsuranceRouted = (paymentType || '').toUpperCase() === 'INSURANCE' || !!insuranceProvider;
    if (!isInsuranceRouted) return 0;
    const coverage = this.insuranceCoverageFor(patientId || '');
    return Math.round(total * (coverage.coveragePercent / 100) * 100) / 100;
  }

  private mapInvoiceStatus(status: string): BillingInvoice['status'] {
    const value = (status || '').toLowerCase();
    if (value.includes('unpaid') || value.includes('open')) return 'UNPAID';
    if (value.includes('partial')) return 'PARTIALLY_PAID';
    if (value.includes('paid') || value.includes('settled')) return 'PAID';
    if (value.includes('insurance')) return 'INSURANCE_PENDING';
    return 'UNPAID';
  }

  private invoiceClearsClinicalAccess(invoice: BillingInvoice): boolean {
    const balance = invoice.totalAmount - invoice.insuranceCoveredAmount - invoice.patientPaidAmount;
    return invoice.status === 'PAID' || balance <= 0;
  }

  patientHasClinicalPayment(patientId: string): boolean {
    return this.billingInvoices().some(invoice => invoice.patientId === patientId && this.invoiceClearsClinicalAccess(invoice));
  }

  patientHasEmergencyAppointment(patientId: string): boolean {
    return this.hasEmergencyClinicalAccess(patientId, this.currentUser());
  }

  private defaultSpecializationsForDepartment(departmentName: string): string[] {
    const key = (departmentName || '').toLowerCase();
    if (key.includes('emergency')) return ['Emergency Medicine', 'Trauma Care', 'Critical Care Nursing', 'Triage'];
    if (key.includes('pedia')) return ['Pediatrics', 'Neonatology', 'Pediatric Nursing'];
    if (key.includes('maternity') || key.includes('obstetric')) return ['Obstetrics', 'Gynecology', 'Midwifery', 'Maternal Health'];
    if (key.includes('laboratory')) return ['Hematology', 'Clinical Chemistry', 'Microbiology', 'Serology'];
    if (key.includes('pharmacy')) return ['Dispensing', 'Clinical Pharmacy', 'Inventory Control'];
    if (key.includes('finance') || key.includes('billing')) return ['Revenue Cycle', 'Cashier', 'Claims Management'];
    if (key.includes('admin')) return ['Platform Administration', 'Human Resources', 'Operations'];
    return ['Internal Medicine', 'General Practice', 'Nursing'];
  }

  // ── Patient Search / Utilities ──
  patientById(id: string): Patient | undefined {
    return this.patients().find(p => p.id === id);
  }

  patientDisplayName(id: string): string {
    return this.patientById(id)?.name || 'Patient record unavailable';
  }

  patientMrn(id: string): string {
    return this.patientById(id)?.mrn || 'MRN unavailable';
  }

  doctorDisplayName(id: string): string {
    const doctor = this.doctors().find(item => item.id === id);
    if (doctor) return `Dr. ${doctor.firstName} ${doctor.lastName}`;

    const employee = this.employees().find(item => item.id === id && item.role === 'DOCTOR');
    if (employee) return `Dr. ${employee.firstName} ${employee.lastName}`;

    const current = this.currentUser();
    if (current?.id === id && current.role === 'DOCTOR') {
      return current.name.startsWith('Dr.') ? current.name : `Dr. ${current.name}`;
    }

    return 'Doctor record unavailable';
  }

  /**
   * Resolves the queue summary doctor name. The backend returns a real name resolved
   * from the Identity service; when that lookup failed it falls back to the raw doctor
   * ID, which is detected here and replaced with the locally-resolved name.
   */
  private queueDoctorName(row: BackendQueueSummary): string {
    const raw = (row.doctorName || '').trim();
    const isFallbackId = raw === row.doctorId || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
    if (isFallbackId) return this.doctorDisplayName(row.doctorId);
    return raw.startsWith('Dr.') ? raw : `Dr. ${raw}`;
  }

  private refreshResolvedDisplayValues() {
    this.appointments.update(items => items.map(item => ({
      ...item,
      patientName: this.patientDisplayName(item.patientId),
      patientMrn: this.patientMrn(item.patientId),
      doctorName: this.doctorDisplayName(item.doctorId),
    })));
    this.prescriptions.update(items => items.map(item => ({
      ...item,
      patientName: this.patientDisplayName(item.patientId),
      patientMrn: this.patientMrn(item.patientId),
      doctorName: this.doctorDisplayName(item.doctorId),
    })));
    this.labOrders.update(items => items.map(item => ({
      ...item,
      patientName: this.patientDisplayName(item.patientId),
      patientMrn: this.patientMrn(item.patientId),
      doctorName: this.doctorDisplayName(item.doctorId),
    })));
    this.clinicalVitals.update(items => items.map(item => ({
      ...item,
      patientName: this.patientDisplayName(item.patientId),
      patientMrn: this.patientMrn(item.patientId),
    })));
    this.clinicalDiagnoses.update(items => items.map(item => ({
      ...item,
      patientName: this.patientDisplayName(item.patientId),
      patientMrn: this.patientMrn(item.patientId),
      doctorName: this.doctorDisplayName(item.doctorId),
    })));
    this.billingInvoices.update(items => items.map(item => ({
      ...item,
      patientName: this.patientDisplayName(item.patientId),
      patientMrn: this.patientMrn(item.patientId),
      // Keep the backend-authoritative covered amount (a stored zero is respected
      // too); only fall back to the client-side estimate when it is entirely absent.
      insuranceCoveredAmount: item.insuranceCoveredAmount != null
        ? item.insuranceCoveredAmount
        : this.invoiceInsuranceCovered(
            item.totalAmount,
            item.paymentType,
            item.insuranceProvider,
            item.patientId),
    })));
    this.medicalRecords.update(items => items.map(item => ({
      ...item,
      patientName: this.patientDisplayName(item.patientId),
      doctorName: this.doctorDisplayName(item.doctorId),
    })));
    this.syncPatientAdmissions();
  }

  private syncPatientAdmissions() {
    const occupiedByPatient = new Map(this.beds()
      .filter(bed => bed.isOccupied && bed.patientId)
      .map(bed => [bed.patientId!, bed]));

    this.patients.update(items => items.map(patient => {
      const bed = occupiedByPatient.get(patient.id);
      if (!bed) {
        return patient.assignedBedNumber
          ? { ...patient, status: 'OUTPATIENT' as const, assignedBedNumber: undefined, assignedWard: undefined }
          : patient;
      }

      return {
        ...patient,
        status: 'ADMITTED' as const,
        assignedBedNumber: bed.bedNumber,
        assignedWard: bed.wardName,
      };
    }));
  }

  employeeById(id: string): BackendEmployee | undefined {
    return this.employees().find(e => e.id === id);
  }

  // ── In-Memory CRUD (for local operations until backend is fully available) ──

  addToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
    const newToast: ToastMessage = {
      id: 'toast-' + Date.now(),
      type,
      title,
      message,
      timestamp: new Date(),
    };
    this.toasts.update(current => [newToast, ...current]);
    setTimeout(() => this.removeToast(newToast.id), 4000);
  }

  removeToast(id: string) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  addPatient(patient: Omit<Patient, 'id' | 'mrn' | 'registeredDate'>) {
    // Try real API first
    const spaceIdx = patient.name.indexOf(' ');
    const firstName = spaceIdx > 0 ? patient.name.slice(0, spaceIdx) : patient.name;
    const lastName = spaceIdx > 0 ? patient.name.slice(spaceIdx + 1) : 'Patient';
    const payload = {
      firstName,
      lastName,
      phone: patient.phone,
      gender: patient.gender,
      dateOfBirth: patient.dob,
      email: patient.email,
      address: patient.address,
      bloodType: patient.bloodType,
      insuranceCompanyId: patient.insuranceCompanyId || undefined,
      employerName: patient.employerName || undefined,
      occupation: patient.occupation || undefined,
      insurancePlan: patient.insuranceMemberType
        ? `${patient.insuranceMemberType}${patient.principalMemberName ? ` of ${patient.principalMemberName}` : ''}`
        : undefined,
      insuranceProvider: patient.insuranceProvider || undefined,
      insurancePolicyNumber: patient.insurancePolicyNumber || undefined,
      emergencyContactName: patient.emergencyContact?.name || undefined,
      emergencyContactPhone: patient.emergencyContact?.phone || undefined,
      photoDataUrl: patient.photoDataUrl || undefined,
    };
    this.api.createPatient(payload as any).subscribe({
      next: (res) => {
        if (res.data) {
          this.patients.update(current => [this.mapBackendPatient(res.data), ...current]);
          this.addToast('success', 'Patient Registered', `${patient.name} registered successfully.`);
        }
      },
      error: (err) => {
        const backendMessage = err?.error?.message || err?.error?.title;
        if (err?.status && err.status >= 400 && err.status < 500 && backendMessage) {
          this.addToast('error', 'Patient Not Registered', backendMessage);
          return;
        }
        this.addToast('error', 'Patient Not Registered', 'The patient was not saved because the Patient Management API is unavailable. Start the service and try again.');
      },
    });
  }

  addAppointment(apt: Omit<Appointment, 'id' | 'status' | 'queueNumber' | 'waitingAhead'>) {
    const payload = {
      patientId: apt.patientId,
      doctorId: apt.doctorId,
      startsAtUtc: apt.dateTime || new Date().toISOString(),
      reason: apt.reason,
      department: apt.department,
      appointmentType: apt.type,
      priority: apt.type === 'EMERGENCY' ? 'Emergency' : 'Normal',
    };
    this.api.createAppointment(payload).subscribe({
      next: (res) => {
        if (res.data) {
          const mapped = this.mapBackendAppointment(res.data);
          this.appointments.update(current => this.sortAppointmentsForQueue([mapped, ...current]));
          this.refreshQueueSummary();
          this.createAppointmentConsultationInvoice(mapped);
          if (mapped.type === 'EMERGENCY') {
            this.addToast('success', 'Emergency Queued', `${apt.patientName} was routed to the assigned doctor before payment clearance. The consultation charge was posted for final billing.`);
          } else {
            this.addToast('success', 'Appointment Booked', `Scheduled for ${apt.patientName}.`);
          }
        }
      },
      error: () => {
        this.addToast('error', 'Appointment Not Booked', 'The appointment was not saved. Check the Patient Management API and try again.');
      },
    });
  }

  /**
   * Insurance detection used before processing any payment: consultation fees and
   * laboratory charges are routed through the payer whenever the patient is covered.
   */
  insuranceCoverageFor(patientId: string): { isInsured: boolean; provider: string; policyNumber: string; coveragePercent: number } {
    const patient = this.patientById(patientId);
    if (!patient) return { isInsured: false, provider: '', policyNumber: '', coveragePercent: 0 };

    const company = patient.insuranceCompanyId
      ? this.insuranceCompanies().find(c => c.id === patient.insuranceCompanyId)
      : undefined;
    const selfPay = (patient.insuranceProvider || '').trim().toLowerCase() === 'self pay';
    const provider = patient.insuranceCompanyName
      || (!selfPay ? patient.insuranceProvider || '' : '')
      || company?.name
      || '';

    const spouseNotCovered = patient.insuranceMemberType === 'Spouse' && company && !company.spouseCoverageAllowed;
    const isInsured = (!!patient.insuranceCompanyId || !!provider) && !spouseNotCovered;
    return {
      isInsured,
      provider: company?.name || patient.insuranceCompanyName || (!selfPay ? patient.insuranceProvider || '' : '') || '',
      policyNumber: patient.insurancePolicyNumber || '',
      coveragePercent: isInsured ? (company?.coveragePercent ?? 80) : 0,
    };
  }

  private createAppointmentConsultationInvoice(appointment: Appointment) {
    const coverage = this.insuranceCoverageFor(appointment.patientId);
    const description = `Consultation clearance - ${appointment.department} with ${appointment.doctorName}`;
    this.api.createInvoice({
      patientId: appointment.patientId,
      description,
      amount: 500,
      discount: 0,
      tax: 0,
      paymentType: coverage.isInsured ? 'INSURANCE' : 'CASH',
      insuranceProvider: coverage.isInsured ? coverage.provider : undefined,
      items: [{
        serviceCode: 'CONSULTATION',
        description,
        quantity: 1,
        unitPrice: 500,
        discount: 0,
        referenceType: 'Appointment',
        referenceId: appointment.id,
        serviceDateUtc: appointment.dateTime || new Date().toISOString(),
      }],
    }).subscribe({
      next: (invoice) => {
        if (invoice.data) this.billingInvoices.update(current => [this.mapBackendInvoice(invoice.data), ...current]);
      },
      error: () => this.addToast('warning', 'Invoice Pending', 'Appointment was booked, but billing clearance invoice was not created. Create it from Billing before clinical handoff.'),
    });
  }

  updateAppointmentStatus(id: string, status: string) {
    const backendStatus = this.appointmentStatusToBackend(status);
    this.api.updateAppointmentStatus(id, backendStatus).subscribe({
      next: (res) => {
        this.appointments.update(current =>
          this.sortAppointmentsForQueue(current.map(a => a.id === id
            ? (res.data ? this.mapBackendAppointment(res.data) : { ...a, status: this.mapAppointmentStatus(backendStatus) })
            : a))
        );
        this.refreshQueueSummary();
        this.addToast('info', 'Status Updated', `Appointment marked as ${status}.`);
      },
      error: () => this.addToast('error', 'Status Not Updated', 'The queue status was not saved. Check the Patient Management API and try again.'),
    });
  }

  private refreshQueueSummary() {
    this.api.getQueueSummary().subscribe({
      next: response => {
        if (response.data) this.queueSummary.set(response.data);
      },
      error: () => {},
    });
  }

  addPrescription(rx: Omit<Prescription, 'id' | 'date' | 'status'>) {
    const medicationText = rx.medications.map(item => `${item.name} ${item.dosage}`.trim()).join('; ');
    const payload = {
      patientId: rx.patientId,
      doctorId: rx.doctorId,
      medication: medicationText || 'Medication',
      instructions: this.serializePrescriptionInstructions(rx),
    };
    this.api.createPrescription(payload).subscribe({
      next: (res) => {
        if (res.data) {
          const mapped = this.mapBackendPrescription(res.data);
          this.prescriptions.update(current => [mapped, ...current]);
          this.addToast('success', 'Prescription Created', `Prescription for ${rx.patientName}.`);
        }
      },
      error: (error) => this.addToast('error', 'Prescription Not Created', error?.error?.message || 'The prescription was not saved. Check the Clinical API and try again.'),
    });
  }

  addLabOrder(lab: Omit<LabOrder, 'id' | 'orderedDate' | 'status'>) {
    const payload = {
      patientId: lab.patientId,
      doctorId: lab.doctorId,
      testName: lab.testName,
      testCatalogIds: lab.testCatalogIds,
      category: lab.category,
      priority: lab.priority,
      specimenType: lab.specimenType,
      clinicalNote: lab.clinicalNote,
    };
    const emergencyOrder = (payload.priority || '').toLowerCase().includes('emergency');
    this.api.createLabRequest(payload).subscribe({
      next: (res) => {
        if (res.data) {
          this.labOrders.update(current => [this.mapBackendLabRequest(res.data), ...current]);
          const message = emergencyOrder
            ? `${lab.testName} was released to the laboratory immediately and invoiced for final settlement.`
            : `${lab.testName} was invoiced for ${lab.patientName}. The laboratory will receive it after payment clearance.`;
          this.addToast('success', emergencyOrder ? 'Emergency Diagnostic Released' : 'Sent to Billing', message);
        }
      },
      error: (error) => this.addToast(
        'error',
        'Lab Order Not Created',
        error?.error?.detail || error?.error?.message || 'The lab request or its invoice could not be created.'
      ),
    });
  }

  refreshLabOrders() {
    this.api.getLabRequests().subscribe({
      next: (response) => {
        if (response.data) {
          this.labOrders.set(response.data.map(item => this.mapBackendLabRequest(item)));
          this.refreshResolvedDisplayValues();
        }
      },
      error: () => this.addToast('error', 'Queue Refresh Failed', 'Unable to verify paid laboratory requests with Billing.'),
    });
  }

  refreshBillingInvoices() {
    this.api.getInvoices().subscribe({
      next: (response) => {
        if (response.data) {
          this.billingInvoices.set(response.data.map(item => this.mapBackendInvoice(item)));
          this.refreshResolvedDisplayValues();
        }
      },
      error: () => this.addToast('error', 'Billing Refresh Failed', 'Unable to load the latest laboratory and patient invoices.'),
    });
  }

  saveDiagnosticTest(test: Omit<DiagnosticTest, 'id'> & { id?: string }) {
    const payload = {
      groupName: test.groupName,
      subGroup: test.subGroup,
      testName: test.testName,
      specimenType: test.specimenType,
      unit: test.unit,
      referenceRange: test.referenceRange,
      sortOrder: test.sortOrder,
      price: test.price,
      currency: test.currency,
      isActive: test.isActive,
    };
    const request = test.id
      ? this.api.updateDiagnosticTest(test.id, payload)
      : this.api.createDiagnosticTest(payload);

    request.subscribe({
      next: (res) => {
        if (res.data) {
          const mapped = this.mapBackendDiagnosticTest(res.data);
          this.diagnosticTests.update(current => {
            const exists = current.some(item => item.id === mapped.id);
            const updated = exists
              ? current.map(item => item.id === mapped.id ? mapped : item)
              : [...current, mapped];
            return updated.sort((a, b) =>
              a.groupName.localeCompare(b.groupName) ||
              a.subGroup.localeCompare(b.subGroup) ||
              a.sortOrder - b.sortOrder ||
              a.testName.localeCompare(b.testName));
          });
          this.addToast('success', 'Diagnostic Catalog Saved', `${mapped.testName} is available for clinical ordering.`);
        }
      },
      error: () => this.addToast('error', 'Catalog Save Failed', 'Unable to save the diagnostic catalog item. Please try again.'),
    });
  }

  createBed(payload: { ward: string; room: string; bedNumber: string; isAvailable: boolean; category: string; dailyRate: number; currency: string }) {
    this.api.createBed(payload).subscribe({
      next: (res) => {
        if (res.data) {
          this.beds.update(current => [...current, this.mapBackendBed(res.data!)]);
          this.addToast('success', 'Bed Registered', `Bed ${res.data.bedNumber} has been added to ${res.data.ward}.`);
        }
      },
      error: () => this.addToast('error', 'Bed Registration Failed', 'Unable to register this bed. Check for duplicate bed number and try again.'),
    });
  }

  updateBedAvailability(id: string, isAvailable: boolean) {
    this.api.updateBedStatus(id, isAvailable).subscribe({
      next: (res) => {
        if (res.data) {
          const mapped = this.mapBackendBed(res.data);
          this.beds.update(current => current.map(bed => bed.id === id ? { ...bed, ...mapped } : bed));
          this.refreshResolvedDisplayValues();
          this.addToast('success', isAvailable ? 'Bed Released' : 'Bed Assigned', isAvailable ? 'The bed is now available.' : 'The bed is now marked occupied.');
        }
      },
      error: () => this.addToast('error', 'Bed Update Failed', 'Unable to update this bed status. Please try again.'),
    });
  }

  assignBedToPatient(bed: Bed, patientId: string, notes?: string) {
    this.api.assignBed(bed.id, patientId, notes).subscribe({
      next: (res) => {
        if (!res.data) return;
        const admission = this.mapBackendBedAdmission(res.data);
        this.bedAdmissions.update(current => [admission, ...current.filter(item => item.id !== admission.id)]);
        this.beds.update(current => current.map(item => item.id === bed.id ? {
          ...item,
          isOccupied: true,
          currentAdmissionId: admission.id,
          patientId: admission.patientId,
          patientName: admission.patientName,
          patientMrn: admission.patientMrn,
          admittedAtUtc: admission.admittedAtUtc,
          admittedDate: new Date(admission.admittedAtUtc).toISOString().split('T')[0],
        } : item));
        this.refreshResolvedDisplayValues();
        this.addToast('success', 'Admission Saved', `${admission.patientName} admitted to ${admission.wardName} bed ${admission.bedNumber}.`);
      },
      error: (error) => this.addToast('error', 'Admission Failed', error?.error?.message || 'Unable to assign this bed. Please confirm the patient is not already admitted.'),
    });
  }

  dischargeBedAndInvoice(bed: Bed, notes?: string) {
    this.api.dischargeBed(bed.id, notes).subscribe({
      next: (res) => {
        if (!res.data) return;
        const mappedBed = this.mapBackendBed(res.data.bed);
        const admission = this.mapBackendBedAdmission(res.data.admission);
        this.beds.update(current => current.map(item => item.id === bed.id ? mappedBed : item));
        this.bedAdmissions.update(current => [admission, ...current.filter(item => item.id !== admission.id)]);
        this.patients.update(current => current.map(patient => patient.id === admission.patientId ? {
          ...patient,
          status: 'DISCHARGED' as const,
          assignedBedNumber: undefined,
          assignedWard: undefined,
        } : patient));

        if (admission.bedCharge > 0) {
          this.addBillingInvoice({
            patientId: admission.patientId,
            patientName: admission.patientName,
            patientMrn: admission.patientMrn,
            dueDate: new Date().toISOString().split('T')[0],
            items: [{
              id: `BED-${admission.id.slice(0, 8)}`,
              serviceCode: 'BED-STAY',
              description: `${admission.wardName} bed ${admission.bedNumber} (${admission.bedCategory}) - ${admission.chargeableDays} day(s) x ${admission.dailyRate.toFixed(2)} ${admission.currency}`,
              category: 'Room Charge',
              amount: admission.bedCharge,
              referenceType: 'BED_ADMISSION',
              referenceId: admission.id,
            }],
            totalAmount: admission.bedCharge,
            insuranceCoveredAmount: 0,
            paymentType: this.insuranceCoverageFor(admission.patientId).isInsured ? 'INSURANCE' : 'CASH',
            insuranceProvider: this.insuranceCoverageFor(admission.patientId).provider || undefined,
          });
        }

        this.addToast('success', 'Discharge Completed', `${admission.patientName} discharged. Bed charge: ${admission.currency} ${admission.bedCharge.toFixed(2)}.`);
      },
      error: (error) => this.addToast('error', 'Discharge Failed', error?.error?.message || 'Unable to discharge this patient from the bed.'),
    });
  }
  addClinicalEncounter(payload: {
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    visitType: string;
    chiefComplaint: string;
    assessment: string;
    plan: string;
  }) {
    this.api.createEncounter({
      patientId: payload.patientId,
      doctorId: payload.doctorId,
      visitType: payload.visitType,
      chiefComplaint: payload.chiefComplaint,
      assessment: payload.assessment,
      plan: payload.plan,
    }).subscribe({
      next: (res) => {
        if (res.data) {
          this.medicalRecords.update(current => [this.mapBackendEncounter(res.data), ...current]);
          this.addToast('success', 'Encounter Saved', `Clinical note saved for ${payload.patientName}.`);
        }
      },
      error: (error) => this.addToast('error', 'Encounter Not Saved', error?.error?.message || 'The clinical encounter was not saved. Check the Clinical API and try again.'),
    });
  }

  addVitals(vital: Omit<ClinicalVitalEntry, 'id' | 'recordedAtUtc'>) {
    this.api.createVitals({
      patientId: vital.patientId,
      temperatureC: vital.temperatureC,
      pulse: vital.pulse,
      respiratoryRate: vital.respiratoryRate,
      bloodPressure: vital.bloodPressure,
      weightKg: vital.weightKg,
      heightCm: vital.heightCm,
    }).subscribe({
      next: (res) => {
        if (res.data) {
          this.clinicalVitals.update(current => [this.mapBackendVital(res.data), ...current]);
          this.patients.update(current => current.map(patient => patient.id === vital.patientId ? {
            ...patient,
            vitals: {
              ...patient.vitals,
              bp: vital.bloodPressure,
              hr: vital.pulse,
              temp: vital.temperatureC,
              respiratoryRate: vital.respiratoryRate,
              updatedAt: 'Just now',
            },
          } : patient));
          this.addToast('success', 'Vitals Recorded', `Vitals saved for ${vital.patientName}.`);
        }
      },
      error: (error) => this.addToast('error', 'Vitals Not Saved', error?.error?.message || 'Vitals were not saved. Check the Clinical API and try again.'),
    });
  }

  addDiagnosis(diagnosis: Omit<ClinicalDiagnosis, 'id' | 'diagnosedAtUtc'>) {
    this.api.createDiagnosis({
      patientId: diagnosis.patientId,
      doctorId: diagnosis.doctorId,
      code: diagnosis.code,
      description: diagnosis.description,
      severity: diagnosis.severity,
    }).subscribe({
      next: (res) => {
        if (res.data) {
          this.clinicalDiagnoses.update(current => [this.mapBackendDiagnosis(res.data), ...current]);
          this.addToast('success', 'Diagnosis Added', `${diagnosis.description} added for ${diagnosis.patientName}.`);
        }
      },
      error: (error) => this.addToast('error', 'Diagnosis Not Saved', error?.error?.message || 'Diagnosis was not saved. Check the Clinical API and try again.'),
    });
  }

  dispensePrescription(id: string) {
    this.prescriptions.update(current =>
      current.map(p => p.id === id ? { ...p, status: 'DISPENSED' as const, pharmacyNotes: `Dispensed by ${this.currentUser()?.name}` } : p)
    );
    this.addToast('success', 'Medication Dispensed', 'Prescription order fulfilled.');
  }

  updateLabResult(
    id: string,
    result: string,
    normalRange: string,
    unit: string,
    isAbnormal: boolean,
    resultFlag = isAbnormal ? 'Abnormal' : 'Normal',
    resultNotes = '',
    performedBy = this.currentUser()?.name || '',
    verifiedBy = this.currentUser()?.name || '',
    resultItems: LabResultItem[] = []
  ) {
    this.api.updateLabResult(id, {
      status: 'Completed',
      resultSummary: result,
      resultValue: result,
      referenceRange: normalRange,
      resultFlag,
      resultNotes,
      resultItemsJson: JSON.stringify(resultItems),
      performedBy,
      verifiedBy,
      resultedAtUtc: new Date().toISOString(),
    }).subscribe({
      next: (res) => {
        if (res.data) {
          const mapped = { ...this.mapBackendLabRequest(res.data), unit, resultFlag, resultNotes, performedBy, verifiedBy, resultItems, isAbnormal };
          this.labOrders.update(current => current.map(l => l.id === id ? mapped : l));
          this.addToast('success', 'Lab Result Submitted', 'Results posted to EHR.');
        } else {
          this.addToast('warning', 'Lab Result Not Confirmed', 'The service responded without an updated result. Refresh the queue before continuing.');
        }
      },
      error: () => this.addToast('error', 'Lab Result Not Saved', 'The result was not posted. Check the Clinical API and try again.'),
    });
  }

  /**
   * Advances a laboratory request through the technician workflow: after payment is
   * completed the technician marks the request "In Progress", then confirms the sample
   * was collected before result entry is enabled.
   */
  updateLabStatus(id: string, status: LabOrder['status'], collectedAtUtc?: string) {
    const backendStatus = status === 'SAMPLE_COLLECTED' ? 'Specimen Collected'
      : status === 'IN_ANALYSIS' ? 'In Progress'
      : status;
    const message = status === 'SAMPLE_COLLECTED'
      ? 'Specimen collected. Result entry is now enabled.'
      : status === 'IN_ANALYSIS'
        ? 'Request is now in progress.'
        : `Status updated to ${status}.`;

    const payload: { status: string; collectedAtUtc?: string } = { status: backendStatus };
    if (status === 'SAMPLE_COLLECTED') {
      payload.collectedAtUtc = collectedAtUtc || new Date().toISOString();
    }

    this.api.updateLabResult(id, payload).subscribe({
      next: (res) => {
        if (res.data) {
          const mapped = this.mapBackendLabRequest(res.data);
          this.labOrders.update(current => current.map(l => l.id === id
            ? { ...mapped, collectedDate: mapped.collectedDate ?? l.collectedDate }
            : l));
          this.addToast('success', 'Lab Status Updated', message);
        } else {
          this.addToast('warning', 'Lab Status Not Confirmed', 'The service responded without the updated request. Refresh the queue before continuing.');
        }
      },
      error: () => this.addToast('error', 'Lab Status Not Saved', 'The laboratory status was not saved. Check the Clinical API and try again.'),
    });
  }

  private parseLabResultItems(value?: string): LabResultItem[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value) as LabResultItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  addMedicalRecord(rec: Omit<MedicalRecord, 'id' | 'date'>) {
    const newRecord: MedicalRecord = {
      ...rec,
      id: 'mr-' + Math.floor(100 + Math.random() * 900),
      date: new Date().toISOString().split('T')[0],
    };
    this.medicalRecords.update(current => [newRecord, ...current]);
    this.addToast('success', 'Record Created', `Encounter for ${newRecord.patientName}.`);
  }

  addBillingInvoice(inv: Omit<BillingInvoice, 'id' | 'invoiceNumber' | 'date' | 'status' | 'patientPaidAmount'>) {
        const items = inv.items.map(item => ({
      serviceCode: item.serviceCode || item.id || 'SVC-001',
      description: item.description,
      quantity: 1,
      unitPrice: item.amount,
      discount: 0,
      referenceType: item.referenceType,
      referenceId: item.referenceId,
      serviceDateUtc: new Date().toISOString(),
    }));
    const coverage = this.insuranceCoverageFor(inv.patientId);
    const payload = {
      patientId: inv.patientId,
      description: `Invoice for ${inv.patientName}`,
      amount: inv.totalAmount,
      discount: 0,
      tax: 0,
      paymentType: coverage.isInsured ? 'INSURANCE' : 'CASH',
      insuranceProvider: coverage.isInsured ? coverage.provider : undefined,
      items,
    };
    this.api.createInvoice(payload).subscribe({
      next: (res) => {
        if (res.data) {
          this.billingInvoices.update(current => [this.mapBackendInvoice(res.data), ...current]);
          this.addToast('success', 'Invoice Generated', `Invoice created for ETB ${inv.totalAmount}.`);
        }
      },
      error: () => this.addToast('error', 'Invoice Not Created', 'The invoice was not saved. Check the Billing API and try again.'),
    });
  }

  payInvoice(id: string, amount: number, paymentMethod?: string) {
    this.api.recordPayment({
      invoiceId: id,
      amount,
      method: paymentMethod || 'Cash',
      receivedBy: this.currentUser()?.name || 'Billing Desk',
    }).subscribe({
      next: () => {
        this.api.getInvoice(id).subscribe({
          next: (res) => {
            if (res.data) {
              const mapped = this.mapBackendInvoice(res.data);
              this.billingInvoices.update(current => current.map(inv => inv.id === id ? mapped : inv));
              if ((paymentMethod || '').toLowerCase().includes('insurance') && mapped.status === 'PAID') {
                this.markInsuranceClaimPaid(id, amount);
              }
            } else {
              this.addToast('warning', 'Invoice Refresh Needed', 'Payment was recorded, but the updated invoice could not be confirmed. Refresh Billing before collecting another payment.');
            }
            if (res.data) {
              this.addToast('success', 'Payment Processed', `ETB ${amount} payment recorded.`);
            }
          },
          error: () => {
            this.addToast('warning', 'Payment Recorded', 'The payment request completed, but the invoice refresh failed. Refresh Billing to verify the latest status.');
          },
        });
      },
      error: () => {
        this.addToast('error', 'Payment Not Recorded', 'The payment was not saved. Check the Billing API and try again.');
      },
    });
  }

  prepareInsuranceClaim(invoiceId: string) {
    const inv = this.billingInvoices().find(i => i.id === invoiceId);
    if (!inv) return;
    if (this.claimForInvoice(invoiceId)) {
      this.addToast('info', 'Claim Already Prepared', 'This invoice is already in the insurance claim report.');
      return;
    }
    const patient = this.patients().find(p => p.id === inv.patientId);
    const coverage = this.insuranceCoverageFor(inv.patientId);
    const claimAmount = inv.insuranceCoveredAmount > 0
      ? inv.insuranceCoveredAmount
      : Math.round(inv.totalAmount * (coverage.coveragePercent / 100) * 100) / 100;
    const newClaim: InsuranceClaim = {
      id: 'clm-' + Math.floor(100 + Math.random() * 900),
      claimNumber: 'CLM-' + Math.floor(100000 + Math.random() * 900000),
      invoiceId,
      patientName: inv.patientName,
      patientMrn: inv.patientMrn,
      provider: coverage.provider || patient?.insuranceProvider || 'Primary Insurance',
      policyNumber: coverage.policyNumber || patient?.insurancePolicyNumber || 'POL-9921',
      claimAmount,
      status: 'PREPARED',
      submittedDate: new Date().toISOString().split('T')[0],
      notes: `Prepared from invoice ${inv.invoiceNumber}. Patient portion and insurance portion are managed separately.`,
    };
    this.insuranceClaims.update(current => [newClaim, ...current]);
    this.billingInvoices.update(current =>
      current.map(i => i.id === invoiceId ? { ...i, status: 'INSURANCE_PENDING' as const } : i)
    );
    this.addToast('info', 'Claim Prepared', `Claim prepared for ${newClaim.provider}.`);
  }

  submitInsuranceClaim(invoiceId: string) {
    const claim = this.claimForInvoice(invoiceId);
    if (!claim) {
      this.prepareInsuranceClaim(invoiceId);
      return;
    }
    this.insuranceClaims.update(current => {
      const updated = current.map(item => item.id === claim.id ? {
        ...item,
        status: 'SUBMITTED' as const,
        submittedDate: new Date().toISOString().split('T')[0],
      } : item);
      return updated;
    });
    this.billingInvoices.update(current =>
      current.map(i => i.id === invoiceId ? { ...i, status: 'INSURANCE_PENDING' as const } : i)
    );
    this.addToast('success', 'Claim Sent', `Claim ${claim.claimNumber} was sent to ${claim.provider}.`);
  }

  private markInsuranceClaimPaid(invoiceId: string, paidAmount: number) {
    this.insuranceClaims.update(current =>
      current.map(item => item.invoiceId === invoiceId ? {
        ...item,
        status: 'PAID' as const,
        approvedAmount: item.approvedAmount || paidAmount,
        notes: `Insurance remittance collected on ${new Date().toISOString().split('T')[0]}.`,
      } : item)
    );
  }

  createEnterpriseRecord(payload: Record<string, unknown>): Observable<any> {
    return this.api.createEnterpriseRecord(payload);
  }

  updateEnterpriseRecordStatus(id: string, status: string): Observable<any> {
    return this.api.updateEnterpriseRecordStatus(id, status);
  }

  startService(id: string): Observable<any> {
    return this.api.startService(id);
  }

  addWardConfig(payload: Omit<WardConfig, 'id' | 'isActive'>) {
    const ward: WardConfig = {
      ...payload,
      id: `ward-${Date.now()}`,
      currency: payload.currency || 'ETB',
      isActive: true,
    };
    this.wardConfigs.update(current => {
      const updated = [ward, ...current.filter(item => item.name.toLowerCase() !== ward.name.toLowerCase())];
      this.saveLocalArray('hms.wardConfigs', updated);
      return updated;
    });
    this.addToast('success', 'Ward Saved', `${ward.name} is ready for bed assignment.`);
  }

  saveMedicalCertificate(payload: Omit<MedicalCertificate, 'id' | 'approvedAt'>): MedicalCertificate {
    const certificate: MedicalCertificate = {
      ...payload,
      id: `MC-${Date.now()}`,
      approvedAt: new Date().toISOString(),
    };
    this.medicalCertificates.update(current => {
      const updated = [certificate, ...current];
      this.saveLocalArray('hms.medicalCertificates', updated);
      return updated;
    });
    return certificate;
  }

  certificatesForPatient(patientId: string): MedicalCertificate[] {
    return this.medicalCertificates()
      .filter(item => item.patientId === patientId)
      .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt));
  }

  saveReferralRecord(payload: Omit<ReferralRecord, 'id' | 'createdAt'>): ReferralRecord {
    const record: ReferralRecord = {
      ...payload,
      id: `REF-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.referralRecords.update(current => {
      const updated = [record, ...current];
      this.saveLocalArray('hms.referralRecords', updated);
      return updated;
    });
    return record;
  }

  referralsForPatient(patientId: string): ReferralRecord[] {
    return this.referralRecords()
      .filter(item => item.patientId === patientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  claimForInvoice(invoiceId: string): InsuranceClaim | undefined {
    return this.insuranceClaims().find(claim => claim.invoiceId === invoiceId);
  }

  private loadLocalArray<T>(key: string, fallback: T[]): T[] {
    try {
      if (typeof localStorage === 'undefined') return fallback;
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as T[] : fallback;
    } catch {
      return fallback;
    }
  }

  private saveLocalArray<T>(key: string, value: T[]) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
    }
  }

  private defaultWardConfigs(): WardConfig[] {
    return [
      { id: 'ward-emergency', name: 'Emergency Ward', code: 'ER', floor: 'Ground', nurseStation: 'ER Desk', category: 'VIP', dailyRate: 1800, currency: 'ETB', isActive: true },
      { id: 'ward-medical', name: 'Medical Ward', code: 'MED', floor: 'First', nurseStation: 'Station A', category: 'Normal', dailyRate: 1200, currency: 'ETB', isActive: true },
      { id: 'ward-surgical', name: 'Surgical Ward', code: 'SUR', floor: 'Second', nurseStation: 'Station B', category: 'VIP', dailyRate: 2200, currency: 'ETB', isActive: true },
      { id: 'ward-private', name: 'Private Ward', code: 'PRV', floor: 'Third', nurseStation: 'Station C', category: 'VVIP', dailyRate: 3500, currency: 'ETB', isActive: true },
    ];
  }

  // ── Utils ──
  money(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(value);
  }

  cell(value: unknown): string {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined) return '';
    return String(value);
  }
}
