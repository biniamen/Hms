import { ChangeDetectionStrategy, Component, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { AppointmentStatus, AppointmentType, Department } from '../../core/models';

type AppointmentDoctor = {
  id: string;
  name: string;
  department: string;
  specialization?: string;
};

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in pb-20">
      
      <!-- TOP HEADER BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Appointments & Outpatient Scheduling</h1>
          <p class="text-xs text-slate-500 mt-1">Calendar slots, consultation queuing, and clinic capacity</p>
        </div>

        @if (!isFormVisible()) {
          <button 
            (click)="openBookingForm()"
            class="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-2xl text-xs shadow-xl shadow-slate-200 flex items-center gap-2 self-start sm:self-auto hover:bg-slate-800 transition-all active:scale-95">
            <span class="material-icons text-base">add_alarm</span>
            <span>Book New Appointment</span>
          </button>
        }
      </div>

      <!-- INLINE BOOKING FORM -->
      @if (isFormVisible()) {
        <div class="bg-white rounded-3xl border-2 border-teal-500/20 shadow-2xl shadow-teal-500/5 overflow-hidden animate-slide-down">
          <div class="bg-teal-50/50 px-6 py-4 border-b border-teal-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                <span class="material-icons text-base">event_available</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">New Appointment Slot</h3>
                <p class="text-[10px] text-teal-600 font-bold uppercase tracking-widest">Reserve consultant time</p>
              </div>
            </div>
            <button (click)="isFormVisible.set(false)" class="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form [formGroup]="aptForm" (ngSubmit)="submitAppointment()" class="p-6 sm:p-8 space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <!-- Column 1: Patient & Doctor -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-teal-500 rounded-full"></span> Assignment
                </h4>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Select Patient *</label>
                  <select formControlName="patientId" (change)="onBookingPatientChange($event)" [class]="inputClasses">
                    @for (p of store.patients(); track p.id) {
                      <option [value]="p.id">{{ p.name }} ({{ p.mrn }})</option>
                    }
                  </select>
                </div>

                <!-- Insurance detection before the consultation fee is processed for payment -->
                @if (bookingPatientInsurance()?.isInsured) {
                  <div class="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-[11px] font-semibold text-blue-900">
                    <span class="material-icons text-sm text-blue-600">verified_user</span>
                    <span>Insurance detected — {{ bookingPatientInsurance()?.provider }} ({{ bookingPatientInsurance()?.coveragePercent }}% covered). The consultation fee will be routed through insurance; only the patient's copay is collected at the desk.</span>
                  </div>
                } @else {
                  <div class="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-semibold text-slate-500">
                    <span class="material-icons text-sm text-slate-400">payments</span>
                    <span>No insurance on file — the consultation fee will be billed as a cash charge.</span>
                  </div>
                }
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Attending Physician *</label>
                  <select formControlName="doctorId" [class]="inputClasses">
                    @for (doc of filteredDoctors(); track doc.id) {
                      <option [value]="doc.id">{{ doc.name }} ({{ doc.department }})</option>
                    } @empty {
                      <option value="">No doctor available in selected department</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Column 2: Dept & Time -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-blue-500 rounded-full"></span> Schedule
                </h4>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Department *</label>
                  <select formControlName="department" (change)="onDepartmentChange($event)" [class]="inputClasses">
                    @for (dept of departmentOptions(); track dept.name) {
                      <option [value]="dept.name">{{ dept.name }}</option>
                    }
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Time Slot *</label>
                  <select formControlName="timeSlot" [class]="inputClasses + ' font-mono'">
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="01:15 PM">01:15 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                  </select>
                </div>
              </div>

              <!-- Column 3: Type & Reason -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-amber-500 rounded-full"></span> Visit Details
                </h4>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Visit Type *</label>
                  <select formControlName="type" [class]="inputClasses">
                    <option value="CONSULTATION">Consultation</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="LAB_TEST">Lab Test</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Reason for Visit *</label>
                  <input type="text" formControlName="reason" placeholder="e.g. Annual Checkup" [class]="inputClasses" />
                </div>
              </div>

            </div>

            <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button type="button" (click)="isFormVisible.set(false)" class="px-6 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                Discard
              </button>
              <button type="submit" class="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-0.5 active:scale-95">
                Schedule Appointment
              </button>
            </div>
          </form>
        </div>
      }

      <!-- APPOINTMENTS LIST -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div class="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <button 
              (click)="selectedStatusFilter.set('ALL')"
              [class]="selectedStatusFilter() === 'ALL' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200'"
              class="px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap">
              All Bookings
            </button>
            <button 
              (click)="selectedStatusFilter.set('SCHEDULED')"
              [class]="selectedStatusFilter() === 'SCHEDULED' ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200'"
              class="px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap">
              Scheduled
            </button>
            <button 
              (click)="selectedStatusFilter.set('IN_PROGRESS')"
              [class]="selectedStatusFilter() === 'IN_PROGRESS' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200'"
              class="px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap">
              In Progress
            </button>
          </div>

          <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {{ filteredAppointments().length }} Total Records
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th class="py-4 px-4">Time Slot</th>
                <th class="py-4 px-4">Patient Profile</th>
                <th class="py-4 px-4">Assigned Doctor</th>
                <th class="py-4 px-4">Department</th>
                <th class="py-4 px-4">Status</th>
                <th class="py-4 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (apt of filteredAppointments(); track apt.id) {
                <tr class="hover:bg-slate-50/50 transition-colors group">
                  <td class="py-4 px-4">
                    <div class="font-mono font-black text-slate-900">{{ apt.timeSlot }}</div>
                    <div class="text-[10px] text-slate-400">Today</div>
                  </td>
                  <td class="py-4 px-4">
                    <div class="font-bold text-slate-900">{{ store.patientDisplayName(apt.patientId) }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ store.patientMrn(apt.patientId) }}</div>
                  </td>
                  <td class="py-4 px-4 font-medium text-slate-700">{{ store.doctorDisplayName(apt.doctorId) }}</td>
                  <td class="py-4 px-4">
                    <span class="px-2 py-1 rounded bg-teal-50 text-teal-700 font-bold text-[10px] border border-teal-100">
                      {{ apt.department }}
                    </span>
                  </td>
                  <td class="py-4 px-4">
                    <span [class]="getStatusClass(apt.status)" class="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border">
                      {{ apt.status }}
                    </span>
                  </td>
                  <td class="py-4 px-4 text-right">
                    <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      @if (apt.status === 'SCHEDULED') {
                        <button (click)="updateStatus(apt.id, 'IN_PROGRESS')" class="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-[10px] font-bold">Start</button>
                      }
                      @if (apt.status === 'IN_PROGRESS') {
                        <button (click)="updateStatus(apt.id, 'COMPLETED')" class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold">Done</button>
                      }
                      <button (click)="updateStatus(apt.id, 'CANCELLED')" class="p-1.5 text-slate-400 hover:text-rose-600"><span class="material-icons text-sm">block</span></button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `
})
export class AppointmentsComponent {
  store = inject(StoreService);

  isFormVisible = signal(false);
  selectedStatusFilter = signal<string>('ALL');
  selectedDepartment = signal<string>('Outpatient');
  bookingPatientInsurance = signal<{ isInsured: boolean; provider: string; coveragePercent: number } | null>(null);

  // Unified input classes to avoid @apply bug
  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all';

  filteredAppointments = computed(() => {
    const filter = this.selectedStatusFilter();
    if (filter === 'ALL') return this.store.appointments();
    return this.store.appointments().filter(a => a.status === filter);
  });

  doctors = computed(() => {
    const profiles = this.store.doctors().map(doctor => ({
      id: doctor.id,
      name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      department: this.resolveDepartmentName(doctor.department, doctor.specialization),
      specialization: doctor.specialization || '',
    }));
    if (profiles.length > 0) return profiles;
    return this.store.employeesAsUsers()
      .filter(employee => employee.role === 'DOCTOR')
      .map(employee => ({
        id: employee.id,
        name: employee.name,
        department: this.resolveDepartmentName(employee.department, employee.specialization),
        specialization: employee.specialization || '',
      }));
  });

  departmentOptions = computed(() => {
    const options = new Map<string, Department>();
    const add = (dept: Department) => {
      const key = this.departmentKey(dept.name || dept.code);
      if (key && this.isAppointmentDepartment(dept)) options.set(key, dept);
    };

    this.store.departments().forEach(add);
    this.doctors().forEach(doctor => {
      const key = this.departmentKey(doctor.department);
      if (!key || options.has(key)) return;
      options.set(key, this.fallbackDepartment(doctor.department, doctor.specialization));
    });

    if (options.size > 0) {
      return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    return this.defaultAppointmentDepartments();
  });

  filteredDoctors = computed(() => {
    const department = this.selectedDepartment();
    const selected = this.departmentOptions().find(dept => this.sameDepartment(dept, department));
    return this.doctors().filter(doctor => this.doctorBelongsToDepartment(doctor, selected, department));
  });

  aptForm = new FormGroup({
    patientId: new FormControl('', [Validators.required]),
    doctorId: new FormControl('', [Validators.required]),
    department: new FormControl('Outpatient', [Validators.required]),
    timeSlot: new FormControl('09:00 AM', [Validators.required]),
    type: new FormControl<AppointmentType>('CONSULTATION', [Validators.required]),
    reason: new FormControl('', [Validators.required])
  });

  constructor() {
    this.store.loadDepartments();
    this.store.loadDoctors();

    effect(() => {
      if (!this.isFormVisible()) return;

      const doctors = this.filteredDoctors();
      const currentDoctorId = this.aptForm.controls.doctorId.value || '';
      if (!doctors.some(doctor => doctor.id === currentDoctorId)) {
        this.aptForm.patchValue({ doctorId: doctors[0]?.id || '' }, { emitEvent: false });
      }
    });
  }

  updateStatus(id: string, status: AppointmentStatus) {
    this.store.updateAppointmentStatus(id, status);
  }

  openBookingForm() {
    const department = this.departmentOptions()[0]?.name || 'Outpatient';
    this.setSelectedDepartment(department);
    const doctor = this.filteredDoctors()[0] || this.doctors()[0];
    this.aptForm.patchValue({
      patientId: this.store.patients()[0]?.id || '',
      doctorId: doctor?.id || '',
    });
    this.bookingPatientInsurance.set(this.insuranceOf(this.store.patients()[0]?.id));
    this.isFormVisible.set(true);
  }

  onBookingPatientChange(event: Event) {
    const patientId = (event.target as HTMLSelectElement).value;
    this.bookingPatientInsurance.set(this.insuranceOf(patientId));
  }

  /** Detects the patient's insurance before the consultation fee is processed for payment. */
  private insuranceOf(patientId?: string): { isInsured: boolean; provider: string; coveragePercent: number } | null {
    if (!patientId) return null;
    const coverage = this.store.insuranceCoverageFor(patientId);
    return coverage.isInsured
      ? { isInsured: true, provider: coverage.provider, coveragePercent: coverage.coveragePercent }
      : { isInsured: false, provider: '', coveragePercent: 0 };
  }

  onDepartmentChange(event: Event) {
    const department = (event.target as HTMLSelectElement).value;
    this.setSelectedDepartment(department);
    const doctor = this.filteredDoctors()[0];
    this.aptForm.patchValue({ doctorId: doctor?.id || '' });
  }

  submitAppointment() {
    if (this.aptForm.invalid) {
      this.aptForm.markAllAsTouched();
      return;
    }

    const val = this.aptForm.value;
    const patient = this.store.patients().find(p => p.id === val.patientId);
    const doctor = this.filteredDoctors().find(item => item.id === val.doctorId);

    if (patient && doctor) {
      this.store.addAppointment({
        patientId: patient.id,
        patientName: patient.name,
        patientMrn: patient.mrn,
        doctorId: doctor.id,
        doctorName: doctor.name,
        department: val.department!,
        dateTime: new Date().toISOString(),
        timeSlot: val.timeSlot!,
        type: val.type!,
        reason: val.reason!
      });
    }

    this.isFormVisible.set(false);
    this.bookingPatientInsurance.set(null);
    this.setSelectedDepartment(this.departmentOptions()[0]?.name || 'Outpatient');
    this.aptForm.reset({
      patientId: this.store.patients()[0]?.id || '',
      doctorId: this.filteredDoctors()[0]?.id || '',
      department: this.selectedDepartment(),
      timeSlot: '09:00 AM',
      type: 'CONSULTATION',
      reason: '',
    });
  }

  getStatusClass(status: AppointmentStatus): string {
    switch (status) {
      case 'SCHEDULED': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'IN_PROGRESS': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  private setSelectedDepartment(department: string) {
    this.selectedDepartment.set(department);
    this.aptForm.patchValue({ department }, { emitEvent: false });
  }

  private resolveDepartmentName(department?: string, specialization?: string): string {
    const raw = (department || '').trim();
    const byDepartment = this.store.departments().find(dept => this.sameDepartment(dept, raw));
    if (byDepartment) return byDepartment.name;

    const bySpecialization = this.store.departments().find(dept =>
      dept.specializations.some(item => this.cleanText(item) === this.cleanText(specialization || '')));
    if (bySpecialization) return bySpecialization.name;

    return raw || 'Outpatient';
  }

  private doctorBelongsToDepartment(doctor: AppointmentDoctor, department?: Department, selectedDepartment = ''): boolean {
    if (!selectedDepartment) return true;
    if (department && this.sameDepartment(department, doctor.department)) return true;
    if (department && doctor.specialization) {
      return department.specializations.some(item => this.cleanText(item) === this.cleanText(doctor.specialization || ''));
    }
    return this.departmentKey(doctor.department) === this.departmentKey(selectedDepartment);
  }

  private sameDepartment(department: Department, value?: string): boolean {
    const key = this.departmentKey(value);
    if (!key) return false;
    return key === this.departmentKey(department.name) || key === this.departmentKey(department.code);
  }

  private departmentKey(value?: string): string {
    const key = this.cleanText(value || '');
    const aliases: Record<string, string> = {
      opd: 'outpatient',
      outpatientdepartment: 'outpatient',
      er: 'emergency',
      emergencyroom: 'emergency',
      ped: 'pediatrics',
      paediatrics: 'pediatrics',
      mat: 'maternity',
      obs: 'maternity',
      obgyn: 'maternity',
      card: 'cardiology',
      surg: 'surgery',
      generalsurgery: 'surgery',
      ortho: 'orthopedics',
      orthopaedics: 'orthopedics',
      radio: 'radiology',
    };
    return aliases[key] || key;
  }

  private cleanText(value: string): string {
    return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '').trim();
  }

  private isAppointmentDepartment(dept: Department): boolean {
    const key = this.departmentKey(`${dept.name} ${dept.code} ${dept.type}`);
    const excluded = ['finance', 'administration', 'billing', 'pharmacy', 'laboratory', 'lab', 'frontdesk', 'ward'];
    return !excluded.some(item => key.includes(item));
  }

  private fallbackDepartment(name: string, specialization = ''): Department {
    const cleanName = name || 'Outpatient';
    return {
      id: `dept-${this.departmentKey(cleanName)}`,
      name: cleanName,
      code: this.departmentKey(cleanName).slice(0, 6).toUpperCase(),
      type: 'Clinical',
      location: 'Main Campus',
      specializations: specialization ? [specialization] : ['General Practice'],
      headDoctorName: '',
      totalBeds: 0,
      occupiedBeds: 0,
      activeStaffCount: 0,
      icon: 'local_hospital',
    };
  }

  private defaultAppointmentDepartments(): Department[] {
    return [
      { id: 'opd', name: 'Outpatient', code: 'OPD', type: 'Clinical', location: 'Block A', specializations: ['Internal Medicine', 'General Practice'], headDoctorName: '', totalBeds: 0, occupiedBeds: 0, activeStaffCount: 0, icon: 'local_hospital' },
      { id: 'er', name: 'Emergency', code: 'ER', type: 'Clinical', location: 'Ground Floor', specializations: ['Emergency Medicine', 'Trauma Care'], headDoctorName: '', totalBeds: 0, occupiedBeds: 0, activeStaffCount: 0, icon: 'emergency' },
      { id: 'ped', name: 'Pediatrics', code: 'PED', type: 'Clinical', location: 'Block B', specializations: ['Pediatrics', 'Neonatology'], headDoctorName: '', totalBeds: 0, occupiedBeds: 0, activeStaffCount: 0, icon: 'child_care' },
      { id: 'mat', name: 'Maternity', code: 'MAT', type: 'Clinical', location: 'Block C', specializations: ['Obstetrics', 'Gynecology'], headDoctorName: '', totalBeds: 0, occupiedBeds: 0, activeStaffCount: 0, icon: 'pregnant_woman' },
    ];
  }
}
