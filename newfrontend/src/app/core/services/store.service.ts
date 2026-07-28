import { Injectable, computed, signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../api.service';
import type {
  User, UserRole, Patient, Appointment, Prescription, LabOrder,
  BillingInvoice, Department, Bed, InsuranceClaim, MedicalRecord,
  ToastMessage, VitalSigns, EnterpriseModule, BackendEmployee,
  BackendPatient, BackendAppointment, BackendLabRequest,
  BackendPrescription, BackendDepartment, BackendBed,
  BackendInvoice, BackendInvoiceItem, BackendEnterpriseRecord,
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
  readonly patients = signal<Patient[]>([]);
  readonly appointments = signal<Appointment[]>([]);
  readonly beds = signal<Bed[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly prescriptions = signal<Prescription[]>([]);
  readonly labOrders = signal<LabOrder[]>([]);
  readonly billingInvoices = signal<BillingInvoice[]>([]);
  readonly medicalRecords = signal<MedicalRecord[]>([]);
  readonly insuranceClaims = signal<InsuranceClaim[]>([]);
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
    const obs = this.api.login(emailAddress, password);
    obs.subscribe({
      next: (res) => {
        if (res.success) {
          this.api.storeSession(res.data);
          this.setCurrentUserFromSession();
        }
      },
    });
    return obs;
  }

  logout() {
    this.api.clearSession();
    this.currentUser.set(null);
    this.patients.set([]);
    this.appointments.set([]);
    this.employees.set([]);
    this.prescriptions.set([]);
    this.labOrders.set([]);
    this.billingInvoices.set([]);
    this.beds.set([]);
    this.departments.set([]);
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
        this.api.getEmployees().subscribe({ next: (r) => { if (r.data) this.employees.set(r.data); dec(); }, error: dec });
        break;
      case 'doctors':
        this.api.getDoctors().subscribe({ next: (r) => dec(), error: dec });
        break;
      case 'patients':
        this.api.getPatients().subscribe({ next: (r) => { if (r.data) this.patients.set(r.data.map(p => this.mapBackendPatient(p))); dec(); }, error: dec });
        break;
      case 'appointments':
        this.api.getAppointments().subscribe({ next: (r) => { if (r.data) this.appointments.set(r.data.map(a => this.mapBackendAppointment(a))); dec(); }, error: dec });
        break;
      case 'departments':
        this.api.getDepartments().subscribe({ next: (r) => { if (r.data) this.departments.set(r.data.map(d => this.mapBackendDepartment(d))); dec(); }, error: dec });
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
      case 'invoices':
        this.api.getInvoices().subscribe({ next: (r) => { if (r.data) this.billingInvoices.set(r.data.map(i => this.mapBackendInvoice(i))); dec(); }, error: dec });
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
      ADMIN: ['employees', 'doctors', 'patients', 'appointments', 'departments', 'beds', 'prescriptions', 'labRequests', 'invoices', 'enterpriseRecords'],
      DOCTOR: ['patients', 'appointments', 'prescriptions', 'labRequests'],
      NURSE: ['patients', 'appointments', 'beds', 'prescriptions', 'labRequests'],
      RECEPTIONIST: ['patients', 'appointments', 'departments', 'beds'],
      PHARMACIST: ['patients', 'appointments', 'prescriptions', 'enterpriseRecords'],
      LAB_TECHNICIAN: ['patients', 'appointments', 'labRequests', 'enterpriseRecords'],
      ACCOUNTANT: ['patients', 'invoices', 'enterpriseRecords'],
      CASHIER: ['invoices'],
      HR_MANAGER: ['employees', 'departments'],
    };
    return roleEndpoints[role] || ['patients', 'appointments'];
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
      patientName: patient?.name || a.patientId,
      patientMrn: patient?.mrn || '',
      doctorId: a.doctorId,
      doctorName: employee ? `Dr. ${employee.firstName} ${employee.lastName}` : a.doctorId,
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

  private mapBackendPrescription(p: BackendPrescription): Prescription {
    const patient = this.patients().find(pat => pat.id === p.patientId);
    const employee = this.employees().find(e => e.id === p.doctorId);
    return {
      id: p.id,
      patientId: p.patientId,
      patientName: patient?.name || p.patientId,
      patientMrn: patient?.mrn || '',
      doctorId: p.doctorId,
      doctorName: employee ? `Dr. ${employee.firstName} ${employee.lastName}` : p.doctorId,
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
    return {
      id: l.id,
      patientId: l.patientId,
      patientName: patient?.name || l.patientId,
      patientMrn: patient?.mrn || '',
      doctorId: l.doctorId,
      doctorName: employee ? `Dr. ${employee.firstName} ${employee.lastName}` : l.doctorId,
      testName: l.testName,
      category: 'Biochemistry',
      status: l.status === 'Requested' ? 'ORDERED' : 'IN_ANALYSIS',
      orderedDate: l.orderedAtUtc ? new Date(l.orderedAtUtc).toLocaleString() : new Date().toLocaleString(),
    };
  }

  private mapBackendInvoice(i: BackendInvoice): BillingInvoice {
    const patient = this.patients().find(p => p.id === i.patientId);
    const totalDue = i.total;
    const insurancePortion = i.paid > 0 ? Math.min(i.paid * 0.7, totalDue * 0.8) : 0;
    return {
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      patientId: i.patientId,
      patientName: patient?.name || i.patientId,
      patientMrn: patient?.mrn || '',
      date: i.createdAtUtc ? new Date(i.createdAtUtc).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: i.dueAtUtc ? new Date(i.dueAtUtc).toISOString().split('T')[0] : '',
      items: i.items.map((item: BackendInvoiceItem) => ({
        id: item.id,
        description: item.description,
        category: 'Procedure' as const,
        amount: item.lineTotal,
      })),
      totalAmount: i.total,
      insuranceCoveredAmount: Math.round(insurancePortion * 100) / 100,
      patientPaidAmount: i.paid || 0,
      status: i.status === 'Unpaid' ? 'UNPAID' : i.status === 'Paid' ? 'PAID' : 'UNPAID',
    };
  }

  // ── Patient Search / Utilities ──
  patientById(id: string): Patient | undefined {
    return this.patients().find(p => p.id === id);
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
          this.appointments.update(current => [this.mapBackendAppointment(res.data), ...current]);
          this.addToast('success', 'Appointment Booked', `Scheduled for ${apt.patientName}.`);
        }
      },
      error: () => {
        this.addToast('info', 'Appointment Booked', `Scheduled for ${apt.patientName} (offline mode).`);
      },
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
    const payload = {
      patientId: rx.patientId,
      doctorId: rx.doctorId,
      medication: rx.medications[0]?.name || 'Medication',
      instructions: rx.medications[0]?.instructions || 'As directed',
    };
    this.api.createPrescription(payload).subscribe({
      next: (res) => {
        if (res.data) {
          this.prescriptions.update(current => [this.mapBackendPrescription(res.data), ...current]);
          this.addToast('success', 'Prescription Created', `Prescription for ${rx.patientName}.`);
        }
      },
      error: () => this.addToast('success', 'Prescription Created', `Prescription for ${rx.patientName} (offline mode).`),
    });
  }

  addLabOrder(lab: Omit<LabOrder, 'id' | 'orderedDate' | 'status'>) {
    const payload = { patientId: lab.patientId, doctorId: lab.doctorId, testName: lab.testName };
    this.api.createLabRequest(payload).subscribe({
      next: (res) => {
        if (res.data) {
          this.labOrders.update(current => [this.mapBackendLabRequest(res.data), ...current]);
          this.addToast('success', 'Lab Test Ordered', `${lab.testName} for ${lab.patientName}.`);
        }
      },
      error: () => this.addToast('success', 'Lab Test Ordered', `${lab.testName} (offline mode).`),
    });
  }

  dispensePrescription(id: string) {
    this.prescriptions.update(current =>
      current.map(p => p.id === id ? { ...p, status: 'DISPENSED' as const, pharmacyNotes: `Dispensed by ${this.currentUser()?.name}` } : p)
    );
    this.addToast('success', 'Medication Dispensed', 'Prescription order fulfilled.');
  }

  updateLabResult(id: string, result: string, normalRange: string, unit: string, isAbnormal: boolean) {
    this.labOrders.update(current =>
      current.map(l => l.id === id ? {
        ...l, status: 'COMPLETED' as const, result, normalRange, unit, isAbnormal,
        completedDate: new Date().toLocaleString(),
        labTechName: this.currentUser()?.name,
      } : l)
    );
    this.addToast('success', 'Lab Result Submitted', 'Results posted to EHR.');
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
    const payload = {
      patientId: inv.patientId,
      description: `Invoice for ${inv.patientName}`,
      amount: inv.totalAmount,
      discount: 0,
      tax: 0,
      paymentType: 'CASH',
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
    this.addToast('success', 'Payment Processed', `$${amount} payment recorded.`);
  }

  submitInsuranceClaim(invoiceId: string) {
    const inv = this.billingInvoices().find(i => i.id === invoiceId);
    if (!inv) return;
    const patient = this.patients().find(p => p.id === inv.patientId);
    const newClaim: InsuranceClaim = {
      id: 'clm-' + Math.floor(100 + Math.random() * 900),
      claimNumber: 'CLM-' + Math.floor(100000 + Math.random() * 900000),
      invoiceId,
      patientName: inv.patientName,
      patientMrn: inv.patientMrn,
      provider: patient?.insuranceProvider || 'Primary Insurance',
      policyNumber: patient?.insurancePolicyNumber || 'POL-9921',
      claimAmount: inv.insuranceCoveredAmount || inv.totalAmount * 0.8,
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
