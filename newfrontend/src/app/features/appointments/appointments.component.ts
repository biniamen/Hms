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
    <div class="space-y-6 animate-fade-in">
      
      <!-- TOP HEADER BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Appointments & Outpatient Scheduling</h1>
          <p class="text-xs text-slate-500 mt-1">Calendar slots, consultation queuing, and clinic capacity</p>
        </div>

        <button 
          (click)="openBookModal()" 
          class="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-teal-500/20 flex items-center gap-2 self-start sm:self-auto hover:opacity-95 transition-opacity">
          <span class="material-icons text-base">add_alarm</span>
          <span>Book New Appointment</span>
        </button>
      </div>

      <!-- APPOINTMENTS LIST CONTAINER -->
      <div class="bg-white rounded-2xl border border-slate-200/80 subtle-shadow overflow-hidden space-y-4">
        
        <!-- Filters Strip -->
        <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div class="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button 
              (click)="selectedStatusFilter.set('ALL')"
              [class]="selectedStatusFilter() === 'ALL' ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-xl text-xs transition-all">
              All
            </button>
            <button 
              (click)="selectedStatusFilter.set('SCHEDULED')"
              [class]="selectedStatusFilter() === 'SCHEDULED' ? 'bg-teal-600 text-white font-bold' : 'bg-teal-50 text-teal-800 border border-teal-200'"
              class="px-3 py-1.5 rounded-xl text-xs transition-all">
              Scheduled
            </button>
            <button 
              (click)="selectedStatusFilter.set('IN_PROGRESS')"
              [class]="selectedStatusFilter() === 'IN_PROGRESS' ? 'bg-amber-600 text-white font-bold' : 'bg-amber-50 text-amber-800 border border-amber-200'"
              class="px-3 py-1.5 rounded-xl text-xs transition-all">
              In Progress
            </button>
            <button 
              (click)="selectedStatusFilter.set('COMPLETED')"
              [class]="selectedStatusFilter() === 'COMPLETED' ? 'bg-emerald-600 text-white font-bold' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'"
              class="px-3 py-1.5 rounded-xl text-xs transition-all">
              Completed
            </button>
          </div>

          <div class="text-xs text-slate-500 font-medium self-end sm:self-center">
            Showing {{ filteredAppointments().length }} Bookings
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Time / Slot</th>
                <th class="py-3.5 px-4">Patient Name / MRN</th>
                <th class="py-3.5 px-4">Attending Physician</th>
                <th class="py-3.5 px-4">Specialty Dept</th>
                <th class="py-3.5 px-4">Visit Purpose</th>
                <th class="py-3.5 px-4">Status</th>
                <th class="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (apt of filteredAppointments(); track apt.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  
                  <td class="py-3.5 px-4 font-mono font-bold text-slate-900">
                    <div>{{ apt.timeSlot }}</div>
                    <div class="text-[10px] text-slate-400 font-normal">Today</div>
                  </td>

                  <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-900">{{ apt.patientName }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ apt.patientMrn }}</div>
                  </td>

                  <td class="py-3.5 px-4 font-medium text-slate-800">
                    {{ apt.doctorName }}
                  </td>

                  <td class="py-3.5 px-4">
                    <span class="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold text-[11px] border border-teal-100">
                      {{ apt.department }}
                    </span>
                  </td>

                  <td class="py-3.5 px-4 max-w-xs truncate text-slate-600">
                    {{ apt.reason }}
                  </td>

                  <td class="py-3.5 px-4">
                    <span [class]="getStatusClass(apt.status)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border">
                      {{ apt.status }}
                    </span>
                  </td>

                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      @if (apt.status === 'SCHEDULED') {
                        <button 
                          (click)="updateStatus(apt.id, 'IN_PROGRESS')" 
                          class="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-[10px] shadow-xs">
                          Start Visit
                        </button>
                      }
                      @if (apt.status === 'IN_PROGRESS') {
                        <button 
                          (click)="updateStatus(apt.id, 'COMPLETED')" 
                          class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] shadow-xs">
                          Complete
                        </button>
                      }
                      @if (apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED') {
                        <button 
                          (click)="updateStatus(apt.id, 'CANCELLED')" 
                          class="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-semibold rounded-lg text-[10px] border border-slate-200">
                          Cancel
                        </button>
                      }
                    </div>
                  </td>

                </tr>
              }
            </tbody>
          </table>
        </div>

      </div>

      <!-- BOOK APPOINTMENT MODAL -->
      @if (isBookModalOpen()) {
        <div class="fixed inset-0 bg-slate-900/30 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scale-up space-y-6">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 class="text-base font-bold text-slate-900 font-display">Schedule Outpatient Appointment</h3>
              <button (click)="closeBookModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="aptForm" (ngSubmit)="submitAppointment()" class="space-y-4 text-xs">
              
              <div>
                <label for="apt-patient-id" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Select Patient *</label>
                <select id="apt-patient-id" formControlName="patientId" class="w-full px-3 py-2 border rounded-xl text-xs">
                  @for (p of store.patients(); track p.id) {
                    <option [value]="p.id">{{ p.name }} ({{ p.mrn }})</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="apt-doctor-id" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Attending Physician *</label>
                  <select id="apt-doctor-id" formControlName="doctorId" class="w-full px-3 py-2 border rounded-xl text-xs">
                    @for (doc of doctors(); track doc.id) {
                      <option [value]="doc.id">{{ doc.name }} ({{ doc.department }})</option>
                    }
                  </select>
                </div>

                <div>
                  <label for="apt-dept" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Department *</label>
                  <select id="apt-dept" formControlName="department" class="w-full px-3 py-2 border rounded-xl text-xs">
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Emergency Medicine">Emergency Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="apt-slot" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Time Slot *</label>
                  <select id="apt-slot" formControlName="timeSlot" class="w-full px-3 py-2 border rounded-xl text-xs font-mono">
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="01:15 PM">01:15 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                  </select>
                </div>

                <div>
                  <label for="apt-type" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Visit Type *</label>
                  <select id="apt-type" formControlName="type" class="w-full px-3 py-2 border rounded-xl text-xs">
                    <option value="CONSULTATION">Consultation</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="LAB_TEST">Lab Test</option>
                    <option value="SURGERY">Surgery</option>
                  </select>
                </div>
              </div>

              <div>
                <label for="apt-reason" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Reason for Visit *</label>
                <input id="apt-reason" type="text" formControlName="reason" placeholder="e.g. Chest discomfort follow-up" class="w-full px-3 py-2 border rounded-xl text-xs" />
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" (click)="closeBookModal()" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl shadow-md shadow-teal-500/20">Schedule Appointment</button>
              </div>

            </form>

          </div>
        </div>
      }

    </div>
  `
})
export class AppointmentsComponent {
  store = inject(StoreService);

  isBookModalOpen = signal(false);
  selectedStatusFilter = signal<string>('ALL');

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

  openBookModal() {
    this.isBookModalOpen.set(true);
  }

  closeBookModal() {
    this.isBookModalOpen.set(false);
  }

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

    this.closeBookModal();
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
