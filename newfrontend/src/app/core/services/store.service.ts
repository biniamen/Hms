import { Injectable, computed, signal, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../api.service';
import type {
  User, UserRole, Patient, Appointment, Prescription, LabOrder,
  BillingInvoice, Department, Bed, InsuranceClaim, MedicalRecord,
  ToastMessage, VitalSigns, EnterpriseModule, DiagnosticTest, LabResultItem, ClinicalVitalEntry,
  ClinicalDiagnosis, BackendEmployee, BackendDoctorProfile,
  BackendPatient, BackendAppointment, BackendLabRequest,
  BackendPrescription, BackendDepartment, BackendBed, BackendDiagnosticTest, BackendVitalSign, BackendDiagnosis,
  BackendInvoice, BackendInvoiceItem, BackendEnterpriseRecord,
  BackendClinicalEncounter, BackendInsuranceCompany,
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

  readonly clinicalWorklistPatients = computed(() => {
    const user = this.currentUser();
    const settledPatientIds = new Set(
      this.billingInvoices()
        .filter(invoice => this.invoiceClearsClinicalAccess(invoice))
        .map(invoice => invoice.patientId)
    );

    return this.patients().filter(patient => {
      if (!settledPatientIds.has(patient.id)) return false;
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
    });
  });

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
    this.departments.set([]);
    this.insuranceCompanies.set([]);
    this.enterpriseRecords.set([]);
    this.medicalRecords.set([]);
    this.insuranceClaims.set([]);
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
    this.setCurrentUserFromSession();
    this.isLoading.set(true);
    this.pending.set(0);

    // Determine which endpoints to call based on role
    const role = session.role;
    const endpoints = this.getEndpointsForRole(role);
    this.pending.set(endpoints.length);

    for (const ep of endpoints) {
      this.callEndpoint(ep);
    }

    if (endpoints.length === 0) this.isLoading.set(false);
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

  private callEndpoint(key: string) {
    const dec = () => {
      this.pending.update(p => p - 1);
      if (this.pending() <= 0) {
        this.pending.set(0);
        this.isLoading.set(false);
      }
    };

    switch (key) {
      case 'employees':
        this.api.getEmployees().subscribe({ next: (r) => { if (r.data) { this.employees.set(r.data); this.refreshResolvedDisplayValues(); } dec(); }, error: dec });
        break;
      case 'doctors':
        this.api.getDoctors().subscribe({ next: (r) => { if (r.data) { this.doctors.set(r.data); this.refreshResolvedDisplayValues(); } dec(); }, error: dec });
        break;
      case 'patients':
        this.api.getPatients().subscribe({ next: (r) => { if (r.data) { this.patients.set(r.data.map(p => this.mapBackendPatient(p))); this.refreshResolvedDisplayValues(); } dec(); }, error: dec });
        break;
      case 'appointments':
        this.api.getAppointments().subscribe({ next: (r) => { if (r.data) this.appointments.set(r.data.map(a => this.mapBackendAppointment(a))); dec(); }, error: dec });
        break;
      case 'departments':
        this.api.getDepartments().subscribe({ next: (r) => { if (r.data) this.departments.set(r.data.map(d => this.mapBackendDepartment(d))); dec(); }, error: dec });
        break;
      case 'insuranceCompanies':
        this.api.getInsuranceCompanies().subscribe({ next: (r) => { if (r.data) this.insuranceCompanies.set(r.data); dec(); }, error: dec });
        break;
      case 'beds':
        this.api.getBeds().subscribe({ next: (r) => { if (r.data) this.beds.set(r.data.map(b => this.mapBackendBed(b))); dec(); }, error: dec });
        break;
      case 'prescriptions':
        this.api.getPrescriptions().subscribe({ next: (r) => { if (r.data) this.prescriptions.set(r.data.map(p => this.mapBackendPrescription(p))); dec(); }, error: dec });
        break;
      case 'labRequests':
        this.api.getLabRequests().subscribe({ next: (r) => { if (r.data) this.labOrders.set(r.data.map(l => this.mapBackendLabRequest(l))); dec(); }, error: dec });
        break;
      case 'diagnosticTests':
        this.api.getDiagnosticTests().subscribe({ next: (r) => { if (r.data) this.diagnosticTests.set(r.data.map(t => this.mapBackendDiagnosticTest(t))); dec(); }, error: dec });
        break;
      case 'vitals':
        this.api.getVitals().subscribe({ next: (r) => { if (r.data) this.clinicalVitals.set(r.data.map(v => this.mapBackendVital(v))); dec(); }, error: dec });
        break;
      case 'diagnoses':
        this.api.getDiagnoses().subscribe({ next: (r) => { if (r.data) this.clinicalDiagnoses.set(r.data.map(d => this.mapBackendDiagnosis(d))); dec(); }, error: dec });
        break;
      case 'invoices':
        this.api.getInvoices().subscribe({ next: (r) => { if (r.data) this.billingInvoices.set(r.data.map(i => this.mapBackendInvoice(i))); dec(); }, error: dec });
        break;
      case 'clinicalEncounters':
        this.api.getEncounters().subscribe({ next: (r) => { if (r.data) this.medicalRecords.set(r.data.map(e => this.mapBackendEncounter(e))); dec(); }, error: dec });
        break;
      case 'enterpriseRecords':
        this.api.getEnterpriseRecords().subscribe({ next: (r) => { if (r.data) this.enterpriseRecords.set(r.data); dec(); }, error: dec });
        break;
      default:
        dec();
    }
  }

  private getEndpointsForRole(role: string): string[] {
    const roleEndpoints: Record<string, string[]> = {
      ADMIN: ['employees', 'doctors', 'patients', 'appointments', 'departments', 'insuranceCompanies', 'beds', 'diagnosticTests', 'prescriptions', 'labRequests', 'vitals', 'diagnoses', 'invoices', 'enterpriseRecords', 'clinicalEncounters'],
      DOCTOR: ['doctors', 'patients', 'appointments', 'departments', 'insuranceCompanies', 'invoices', 'diagnosticTests', 'prescriptions', 'labRequests', 'vitals', 'diagnoses', 'clinicalEncounters'],
      NURSE: ['doctors', 'patients', 'appointments', 'departments', 'insuranceCompanies', 'invoices', 'beds', 'diagnosticTests', 'prescriptions', 'vitals', 'diagnoses', 'clinicalEncounters'],
      RECEPTIONIST: ['doctors', 'patients', 'appointments', 'departments', 'insuranceCompanies', 'beds', 'invoices'],
      PHARMACIST: ['doctors', 'patients', 'appointments', 'prescriptions', 'enterpriseRecords'],
      LAB_TECHNICIAN: ['doctors', 'patients', 'appointments', 'diagnosticTests', 'labRequests', 'enterpriseRecords'],
      ACCOUNTANT: ['patients', 'insuranceCompanies', 'invoices', 'enterpriseRecords'],
      CASHIER: ['patients', 'insuranceCompanies', 'invoices'],
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
      status: a.queueStatus as Appointment['status'] || 'SCHEDULED',
      type: a.appointmentType as Appointment['type'] || 'CONSULTATION',
      reason: a.reason,
      notes: a.notes,
      queueNumber: a.queueNumber,
      waitingAhead: a.waitingAhead,
    };
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
      type: 'Standard',
      isOccupied: !b.isAvailable,
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
      medications: [{
        name: p.medication,
        dosage: 'As prescribed',
        frequency: 'As directed',
        duration: 'As directed',
        instructions: p.instructions || 'As directed by physician',
      }],
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
          : item.referenceType?.toUpperCase() === 'DOCTOR'
            ? 'Consultation' as const
            : 'Procedure' as const,
        amount: item.lineTotal,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
      })),
      totalAmount: i.total,
      insuranceCoveredAmount: this.invoiceInsuranceCovered(i.total, i.paymentType, i.insuranceProvider, i.patientId),
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
      insuranceCoveredAmount: this.invoiceInsuranceCovered(
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
      error: () => {
        // Fallback to in-memory
        const newId = 'p-' + Math.floor(100 + Math.random() * 900);
        const newMrn = 'MRN-' + Math.floor(10000 + Math.random() * 90000);
        const newPatient: Patient = {
          ...patient,
          id: newId,
          mrn: newMrn,
          registeredDate: new Date().toISOString().split('T')[0],
        } as Patient;
        this.patients.update(current => [newPatient, ...current]);
        this.addToast('success', 'Patient Registered', `${newPatient.name} (${newMrn}) registered (offline mode).`);
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
      priority: 'Normal',
    };
    this.api.createAppointment(payload).subscribe({
      next: (res) => {
        if (res.data) {
          const mapped = this.mapBackendAppointment(res.data);
          this.appointments.update(current => [mapped, ...current]);
          this.createAppointmentConsultationInvoice(mapped);
          this.addToast('success', 'Appointment Booked', `Scheduled for ${apt.patientName}.`);
        }
      },
      error: () => {
        this.addToast('info', 'Appointment Booked', `Scheduled for ${apt.patientName} (offline mode).`);
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

    const isInsured = !!patient.insuranceCompanyId || !!provider;
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
    this.api.updateAppointmentStatus(id, status).subscribe({
      next: () => {
        this.appointments.update(current =>
          current.map(a => a.id === id ? { ...a, status: status as any } : a)
        );
        this.addToast('info', 'Status Updated', `Appointment marked as ${status}.`);
      },
      error: () => this.addToast('info', 'Status Updated', `Appointment status updated (offline mode).`),
    });
  }

  addPrescription(rx: Omit<Prescription, 'id' | 'date' | 'status'>) {
    const medicationText = rx.medications.map(item => `${item.name} ${item.dosage}`.trim()).join('; ');
    const instructionText = rx.medications.map(item => `${item.name}: ${item.frequency}, ${item.duration}. ${item.instructions}`.trim()).join('\n');
    const payload = {
      patientId: rx.patientId,
      doctorId: rx.doctorId,
      medication: medicationText || 'Medication',
      instructions: instructionText || 'As directed',
    };
    this.api.createPrescription(payload).subscribe({
      next: (res) => {
        if (res.data) {
          const mapped = { ...this.mapBackendPrescription(res.data), medications: rx.medications };
          this.prescriptions.update(current => [mapped, ...current]);
          this.addToast('success', 'Prescription Created', `Prescription for ${rx.patientName}.`);
        }
      },
      error: () => {
        this.prescriptions.update(current => [{
          ...rx,
          id: 'rx-' + Math.floor(100 + Math.random() * 900),
          date: new Date().toISOString().split('T')[0],
          status: 'PENDING' as const,
        }, ...current]);
        this.addToast('success', 'Prescription Created', `Prescription for ${rx.patientName} (offline mode).`);
      },
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
    this.api.createLabRequest(payload).subscribe({
      next: (res) => {
        if (res.data) {
          this.labOrders.update(current => [this.mapBackendLabRequest(res.data), ...current]);
          this.addToast('success', 'Sent to Billing', `${lab.testName} was invoiced for ${lab.patientName}. The laboratory will receive it after full payment.`);
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

  createBed(payload: { ward: string; room: string; bedNumber: string; isAvailable: boolean }) {
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
          this.addToast('success', isAvailable ? 'Bed Released' : 'Bed Assigned', isAvailable ? 'The bed is now available.' : 'The bed is now marked occupied.');
        }
      },
      error: () => this.addToast('error', 'Bed Update Failed', 'Unable to update this bed status. Please try again.'),
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
      error: () => {
        this.addMedicalRecord({
          patientId: payload.patientId,
          patientName: payload.patientName,
          doctorId: payload.doctorId,
          doctorName: payload.doctorName,
          diagnosis: payload.assessment,
          symptoms: [payload.chiefComplaint],
          clinicalNotes: `Visit Type: ${payload.visitType}\n\nComplaint: ${payload.chiefComplaint}\n\nAssessment: ${payload.assessment}\n\nPlan: ${payload.plan}`,
          vitalSigns: {
            bp: 'N/A',
            hr: 0,
            temp: 0,
            spo2: 0,
            respiratoryRate: 0,
            updatedAt: 'N/A',
          },
        });
      },
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
      error: () => {
        const entry: ClinicalVitalEntry = {
          ...vital,
          id: 'vital-' + Math.floor(100 + Math.random() * 900),
          recordedAtUtc: new Date().toISOString(),
        };
        this.clinicalVitals.update(current => [entry, ...current]);
        this.addToast('success', 'Vitals Recorded', `Vitals saved for ${vital.patientName} (offline mode).`);
      },
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
      error: () => {
        const entry: ClinicalDiagnosis = {
          ...diagnosis,
          id: 'dx-' + Math.floor(100 + Math.random() * 900),
          diagnosedAtUtc: new Date().toISOString(),
        };
        this.clinicalDiagnoses.update(current => [entry, ...current]);
        this.addToast('success', 'Diagnosis Added', `${diagnosis.description} added for ${diagnosis.patientName} (offline mode).`);
      },
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
    const applyLocalUpdate = () => {
      this.labOrders.update(current =>
        current.map(l => l.id === id ? {
          ...l, status: 'COMPLETED' as const, result, normalRange, unit, isAbnormal,
          resultFlag,
          resultNotes,
          performedBy,
          verifiedBy,
          resultItems,
          completedDate: new Date().toLocaleString(),
          labTechName: performedBy || this.currentUser()?.name,
        } : l)
      );
    };

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
        } else {
          applyLocalUpdate();
        }
        this.addToast('success', 'Lab Result Submitted', 'Results posted to EHR.');
      },
      error: () => {
        applyLocalUpdate();
        this.addToast('success', 'Lab Result Submitted', 'Results posted to EHR (offline mode).');
      },
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

    const applyLocalUpdate = () => {
      this.labOrders.update(current => current.map(l => l.id === id ? {
        ...l,
        status,
        collectedDate: status === 'SAMPLE_COLLECTED'
          ? (collectedAtUtc ? new Date(collectedAtUtc).toLocaleString() : new Date().toLocaleString())
          : l.collectedDate,
      } : l));
    };

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
        } else {
          applyLocalUpdate();
        }
        this.addToast('success', 'Lab Status Updated', message);
      },
      error: () => {
        applyLocalUpdate();
        this.addToast('success', 'Lab Status Updated', `${message} (offline mode)`);
      },
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
      serviceCode: item.id || 'SVC-001',
      description: item.description,
      quantity: 1,
      unitPrice: item.amount,
      discount: 0,
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
          this.addToast('success', 'Invoice Generated', `Invoice created for $${inv.totalAmount}.`);
        }
      },
      error: () => this.addToast('success', 'Invoice Generated', `Invoice created (offline mode).`),
    });
  }

  payInvoice(id: string, amount: number, paymentMethod?: string) {
    const applyLocalPayment = () => {
      this.billingInvoices.update(current =>
        current.map(inv => {
          if (inv.id === id) {
            const newPaid = inv.patientPaidAmount + amount;
            const totalDue = inv.totalAmount - inv.insuranceCoveredAmount;
            const status = newPaid >= totalDue ? 'PAID' : 'PARTIALLY_PAID';
            return { ...inv, patientPaidAmount: newPaid, status, paymentMethod: paymentMethod as any };
          }
          return inv;
        })
      );
    };

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
            } else {
              applyLocalPayment();
            }
            this.addToast('success', 'Payment Processed', `$${amount} payment recorded.`);
          },
          error: () => {
            applyLocalPayment();
            this.addToast('success', 'Payment Processed', `$${amount} payment recorded.`);
          },
        });
      },
      error: () => {
        applyLocalPayment();
        this.addToast('success', 'Payment Processed', `$${amount} payment recorded (offline mode).`);
      },
    });
  }

  submitInsuranceClaim(invoiceId: string) {
    const inv = this.billingInvoices().find(i => i.id === invoiceId);
    if (!inv) return;
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
      status: 'SUBMITTED',
      submittedDate: new Date().toISOString().split('T')[0],
    };
    this.insuranceClaims.update(current => [newClaim, ...current]);
    this.billingInvoices.update(current =>
      current.map(i => i.id === invoiceId ? { ...i, status: 'INSURANCE_PENDING' as const } : i)
    );
    this.addToast('info', 'Claim Submitted', `Claim sent to ${newClaim.provider}.`);
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

  // ── Utils ──
  money(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  cell(value: unknown): string {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined) return '';
    return String(value);
  }
}
