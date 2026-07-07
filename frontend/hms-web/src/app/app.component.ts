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
  Employee,
  Invoice,
  LabRequest,
  LoginResponse,
  Patient,
  Prescription,
  RolePermission,
  VitalSign,
} from './api.service';

type Section = 'dashboard' | 'admin' | 'employees' | 'patients' | 'appointments' | 'clinical' | 'billing';
type Modal = 'role' | 'employee' | 'patient' | 'appointment' | 'encounter' | 'vitals' | 'diagnosis' | 'prescription' | 'lab' | 'invoice' | 'payment' | null;
type ClinicalTab = 'encounters' | 'vitals' | 'diagnoses' | 'prescriptions' | 'labs';
type ToastKind = 'success' | 'error' | 'info';

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
  clinicalTab = signal<ClinicalTab>('encounters');
  loading = signal(false);
  saving = signal(false);
  search = signal('');
  cameraOn = signal(false);
  toasts = signal<Toast[]>([]);

  employees = signal<Employee[]>([]);
  roles = signal<RolePermission[]>([]);
  patients = signal<Patient[]>([]);
  appointments = signal<Appointment[]>([]);
  beds = signal<Bed[]>([]);
  encounters = signal<ClinicalEncounter[]>([]);
  vitals = signal<VitalSign[]>([]);
  diagnoses = signal<Diagnosis[]>([]);
  prescriptions = signal<Prescription[]>([]);
  labRequests = signal<LabRequest[]>([]);
  invoices = signal<Invoice[]>([]);

  employeeForm = { firstName: '', lastName: '', emailAddress: '', role: 'DOCTOR' };
  roleForm = { role: '', description: '', permissionsText: '' };
  patientForm: Omit<Patient, 'id' | 'mrn'> = this.emptyPatient();
  appointmentForm = { patientId: '', doctorId: '', startsAtUtc: this.localDateTimeValue(1), reason: '' };
  encounterForm = { patientId: '', doctorId: '', visitType: 'Outpatient', chiefComplaint: '', assessment: '', plan: '' };
  vitalsForm = { patientId: '', temperatureC: 37, pulse: 80, respiratoryRate: 18, bloodPressure: '120/80', weightKg: 60, heightCm: 165 };
  diagnosisForm = { patientId: '', doctorId: '', code: '', description: '', severity: 'Mild' };
  prescriptionForm = { patientId: '', doctorId: '', medication: '', instructions: '' };
  labForm = { patientId: '', doctorId: '', testName: '' };
  invoiceForm = { patientId: '', description: '', amount: 0 };
  paymentForm = { invoiceId: '', amount: 0, method: 'Cash' };

  readonly session = computed(() => this.api.session());
  readonly doctors = computed(() => this.employees().filter((employee) => employee.role === 'DOCTOR'));
  readonly activeTitle = computed(() => this.active() === 'admin' ? 'Administration' : this.title(this.active()));
  readonly stats = computed(() => [
    { label: 'Employees', value: this.employees().length, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Patients', value: this.patients().length, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Clinical Orders', value: this.prescriptions().length + this.labRequests().length, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Open Invoices', value: this.invoices().filter((invoice) => invoice.status !== 'Paid').length, tone: 'bg-amber-50 text-amber-700' },
  ]);

  readonly nav: Array<{ id: Section; label: string; roles: string[] }> = [
    { id: 'dashboard', label: 'Dashboard', roles: ['ALL'] },
    { id: 'admin', label: 'Administration', roles: ['ADMIN'] },
    { id: 'employees', label: 'Employees', roles: ['ADMIN', 'HR_MANAGER'] },
    { id: 'patients', label: 'Patients', roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'] },
    { id: 'appointments', label: 'Appointments', roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR'] },
    { id: 'clinical', label: 'Clinical', roles: ['ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'PHARMACIST'] },
    { id: 'billing', label: 'Billing', roles: ['ADMIN', 'ACCOUNTANT', 'CASHIER'] },
  ];

  constructor(private api: ApiService) {}

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
        this.toast('error', 'Login failed. Check gateway and seeded credentials.');
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
    let pending = 11;
    const done = () => {
      pending -= 1;
      if (pending === 0) {
        this.loading.set(false);
        this.syncDefaultSelections();
      }
    };
    const fail = () => {
      this.toast('error', 'Some data could not load. Check service containers.');
      done();
    };

    this.api.getEmployees().subscribe({ next: (res) => { this.employees.set(res.data ?? []); done(); }, error: fail });
    this.api.getRoles().subscribe({ next: (res) => { this.roles.set(res.data ?? []); done(); }, error: fail });
    this.api.getPatients().subscribe({ next: (res) => { this.patients.set(res.data ?? []); done(); }, error: fail });
    this.api.getAppointments().subscribe({ next: (res) => { this.appointments.set(res.data ?? []); done(); }, error: fail });
    this.api.getBeds().subscribe({ next: (res) => { this.beds.set(res.data ?? []); done(); }, error: fail });
    this.api.getEncounters().subscribe({ next: (res) => { this.encounters.set(res.data ?? []); done(); }, error: fail });
    this.api.getVitals().subscribe({ next: (res) => { this.vitals.set(res.data ?? []); done(); }, error: fail });
    this.api.getDiagnoses().subscribe({ next: (res) => { this.diagnoses.set(res.data ?? []); done(); }, error: fail });
    this.api.getPrescriptions().subscribe({ next: (res) => { this.prescriptions.set(res.data ?? []); done(); }, error: fail });
    this.api.getLabRequests().subscribe({ next: (res) => { this.labRequests.set(res.data ?? []); done(); }, error: fail });
    this.api.getInvoices().subscribe({ next: (res) => { this.invoices.set(res.data ?? []); done(); }, error: fail });
  }

  createEmployee() {
    this.save(this.api.createEmployee(this.employeeForm), 'Employee created.', () => {
      this.employeeForm = { firstName: '', lastName: '', emailAddress: '', role: 'DOCTOR' };
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

  createPatient() {
    this.save(this.api.createPatient(this.patientForm), 'Patient registered and RabbitMQ event published.', () => {
      this.patientForm = this.emptyPatient();
    });
  }

  createAppointment() {
    this.save(this.api.createAppointment({ ...this.appointmentForm, startsAtUtc: new Date(this.appointmentForm.startsAtUtc).toISOString() }), 'Appointment booked.', () => {
      this.appointmentForm.reason = '';
      this.appointmentForm.startsAtUtc = this.localDateTimeValue(1);
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
    this.save(this.api.createInvoice(this.invoiceForm), 'Invoice created.', () => {
      this.invoiceForm.description = '';
      this.invoiceForm.amount = 0;
    });
  }

  recordPayment() {
    this.save(this.api.recordPayment(this.paymentForm), 'Payment recorded.', () => {
      this.paymentForm.amount = 0;
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
    this.toast('success', 'Excel export generated.');
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
    this.paymentForm.amount ||= firstInvoice?.amount ?? 0;
  }

  private emptyPatient(): Omit<Patient, 'id' | 'mrn'> {
    return {
      firstName: '',
      lastName: '',
      phone: '',
      gender: 'Female',
      dateOfBirth: '1995-01-01',
      address: '',
      bloodType: 'O+',
      emergencyContactName: '',
      emergencyContactPhone: '',
      photoDataUrl: '',
    };
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

  private localDateTimeValue(daysFromNow: number) {
    const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  private title(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
