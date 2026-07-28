import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { AppointmentStatus, AppointmentType } from '../../core/models';

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
            (click)="isFormVisible.set(true)" 
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
                  <select formControlName="patientId" [class]="inputClasses">
                    @for (p of store.patients(); track p.id) {
                      <option [value]="p.id">{{ p.name }} ({{ p.mrn }})</option>
                    }
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Attending Physician *</label>
                  <select formControlName="doctorId" [class]="inputClasses">
                    @for (doc of doctors(); track doc.id) {
                      <option [value]="doc.id">{{ doc.name }} ({{ doc.department }})</option>
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
                  <select formControlName="department" [class]="inputClasses">
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="General Medicine">General Medicine</option>
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
                    <div class="font-bold text-slate-900">{{ apt.patientName }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ apt.patientMrn }}</div>
                  </td>
                  <td class="py-4 px-4 font-medium text-slate-700">{{ apt.doctorName }}</td>
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

  // Unified input classes to avoid @apply bug
  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all';

  filteredAppointments = computed(() => {
    const filter = this.selectedStatusFilter();
    if (filter === 'ALL') return this.store.appointments();
    return this.store.appointments().filter(a => a.status === filter);
  });

  doctors = computed(() => {
    return this.store.employeesAsUsers().filter(e => e.role === 'DOCTOR');
  });

  aptForm = new FormGroup({
    patientId: new FormControl('p-1', [Validators.required]),
    doctorId: new FormControl('u-101', [Validators.required]),
    department: new FormControl('Cardiology', [Validators.required]),
    timeSlot: new FormControl('09:00 AM', [Validators.required]),
    type: new FormControl<AppointmentType>('CONSULTATION', [Validators.required]),
    reason: new FormControl('', [Validators.required])
  });

  updateStatus(id: string, status: AppointmentStatus) {
    this.store.updateAppointmentStatus(id, status);
  }

  submitAppointment() {
    if (this.aptForm.invalid) {
      this.aptForm.markAllAsTouched();
      return;
    }

    const val = this.aptForm.value;
    const patient = this.store.patients().find(p => p.id === val.patientId);
    const doctor = this.store.employeesAsUsers().find(e => e.id === val.doctorId);

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
    this.aptForm.reset();
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
}