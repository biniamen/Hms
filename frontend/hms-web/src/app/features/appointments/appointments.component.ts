import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="grid gap-4">
      <!-- Stats -->
      <section class="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
        <article *ngFor="let stat of store.appointmentStats()" class="enterprise-panel p-5">
          <span class="inline-flex rounded-lg px-3 py-1 text-xs font-black uppercase" [ngClass]="stat.tone">{{ stat.label }}</span>
          <strong class="mt-3 block text-3xl font-black text-slate-900">{{ stat.value }}</strong>
        </article>
      </section>

      <!-- Doctor Queue Cards -->
      <div class="grid grid-cols-4 gap-4 max-[1200px]:grid-cols-2 max-[720px]:grid-cols-1">
        <article *ngFor="let doctor of store.doctors()" class="enterprise-panel p-4">
          <span class="badge badge-blue">{{ doctor.department || 'Clinical' }}</span>
          <h3 class="mt-3 text-base font-black text-slate-900">Dr. {{ doctor.firstName }} {{ doctor.lastName }}</h3>
          <p class="text-sm text-slate-500">{{ doctor.specialization || 'General Practice' }}</p>
          <strong class="mt-3 block text-3xl text-slate-900">{{ store.doctorQueueCount(doctor.id) }}</strong>
          <span class="text-xs font-bold uppercase text-slate-500">active queue</span>
        </article>
      </div>

      <!-- Search + Actions -->
      <div class="enterprise-panel p-4">
        <div class="flex items-center justify-between gap-3 max-[900px]:flex-col max-[900px]:items-stretch">
          <label class="field-label max-w-sm flex-1">Search
            <input class="field-control" [ngModel]="store.search()" (ngModelChange)="store.search.set($event)" placeholder="Filter appointments..." [ngModelOptions]="{standalone: true}">
          </label>
          <div class="flex flex-wrap gap-2">
            <button class="btn-primary" type="button" (click)="showModal.set(true)">Book Appointment</button>
            <button class="btn-secondary" (click)="store.exportExcel('appointments', store.appointments())">Excel</button>
            <button class="btn-secondary" (click)="store.exportPdf('appointments', store.appointments())">PDF</button>
            <button class="btn-secondary" (click)="store.printTable('appointments', store.appointments())">Print</button>
          </div>
        </div>
      </div>

      <!-- Appointments Table -->
      <div class="enterprise-panel overflow-auto p-4">
        <table class="data-table">
          <thead><tr><th>Queue</th><th>Patient</th><th>Doctor</th><th>Starts</th><th>Department</th><th>Type</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.appointments())">
              <td><span class="badge badge-blue">#{{ row.queueNumber }}</span><br><span class="text-xs text-slate-500">{{ row.waitingAhead }} ahead</span></td>
              <td>{{ store.patientName(row.patientId) }}<br><span class="text-xs text-slate-500">{{ store.patientById(row.patientId)?.phone }}</span></td>
              <td>{{ store.doctorName(row.doctorId) }}<br><span class="text-xs text-slate-500">{{ store.employeeById(row.doctorId)?.specialization }}</span></td>
              <td>{{ row.startsAtUtc | date:'medium' }}</td>
              <td>{{ row.department }}</td>
              <td>{{ row.appointmentType }}</td>
              <td><span class="badge">{{ row.priority }}</span></td>
              <td><span class="badge" [class.badge-green]="row.queueStatus === 'Completed'">{{ row.queueStatus }}</span></td>
              <td>
                <div class="flex flex-wrap gap-1">
                  <button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" (click)="setStatus(row.id, 'In Service')">Call</button>
                  <button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" (click)="setStatus(row.id, 'Completed')">Done</button>
                  <button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" (click)="setStatus(row.id, 'No Show')">No Show</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="!store.appointments().length"><td colspan="9" class="text-center text-slate-500 py-8">No appointments booked</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Bed Board -->
      <div class="enterprise-panel overflow-auto p-4">
        <h3 class="mb-3 text-base font-black text-slate-900">Bed Board</h3>
        <table class="data-table">
          <thead><tr><th>Ward</th><th>Room</th><th>Bed</th><th>Status</th></tr></thead>
          <tbody>
            <tr *ngFor="let bed of store.beds()">
              <td>{{ bed.ward }}</td>
              <td>{{ bed.room }}</td>
              <td>{{ bed.bedNumber }}</td>
              <td><span class="badge" [class.badge-green]="bed.isAvailable">{{ bed.isAvailable ? 'Available' : 'Occupied' }}</span></td>
            </tr>
            <tr *ngIf="!store.beds().length"><td colspan="4" class="text-center text-slate-500 py-8">No beds configured</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Book Appointment Modal -->
      <div *ngIf="showModal()" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">Book Appointment</h2>
            <button class="btn-secondary" type="button" (click)="showModal.set(false)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createAppointment()">
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Patient<select class="field-control" name="ap" [(ngModel)]="form.patientId"><option *ngFor="let patient of store.patients()" [value]="patient.id">{{ patient.mrn }} - {{ patient.firstName }} {{ patient.lastName }} - {{ patient.phone }}</option></select></label>
              <label class="field-label">Department<select class="field-control" name="adept" [(ngModel)]="form.department" (ngModelChange)="onDeptChange()"><option *ngFor="let dept of store.departments()" [value]="dept.name">{{ dept.name }}</option><option>Outpatient</option><option>Emergency</option><option>General Ward</option><option>Maternity</option><option>Pediatrics</option></select></label>
              <label class="field-label">Doctor<select class="field-control" name="adoc" [(ngModel)]="form.doctorId"><option *ngFor="let doctor of availableDoctors()" [value]="doctor.id">Dr. {{ doctor.firstName }} {{ doctor.lastName }}</option></select></label>
              <label class="field-label">Starts At<input class="field-control" name="astarts" type="datetime-local" [(ngModel)]="form.startsAtUtc"></label>
              <label class="field-label">Type<select class="field-control" name="atype" [(ngModel)]="form.appointmentType"><option>Consultation</option><option>Follow-up</option><option>Procedure</option><option>Emergency</option></select></label>
              <label class="field-label">Priority<select class="field-control" name="aprio" [(ngModel)]="form.priority"><option>Normal</option><option>High</option><option>Urgent</option></select></label>
              <label class="field-label col-span-2">Reason<input class="field-control" name="areason" [(ngModel)]="form.reason"></label>
              <label class="field-label col-span-2">Notes<textarea class="field-control min-h-20" name="anotes" [(ngModel)]="form.notes"></textarea></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Book Appointment</button>
          </form>
        </div>
      </div>
    </section>
  `,
})
export class AppointmentsComponent {
  showModal = signal(false);
  form = {
    patientId: '', doctorId: '', startsAtUtc: this.localDateTimeValue(1),
    reason: '', department: 'Outpatient', appointmentType: 'Consultation',
    priority: 'Normal', notes: '',
  };

  constructor(
    public store: StoreService,
    private api: ApiService
  ) {}

  availableDoctors() {
    const department = this.form.department;
    const filtered = this.store.doctors().filter((d) => !department || d.department === department);
    return filtered.length ? filtered : this.store.doctors();
  }

  onDeptChange() {
    const first = this.availableDoctors()[0];
    this.form.doctorId = first?.id ?? '';
  }

  createAppointment() {
    this.store.saving.set(true);
    this.store.createAppointment({ ...this.form, startsAtUtc: new Date(this.form.startsAtUtc).toISOString() }).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.showModal.set(false);
        this.store.toast('success', 'Appointment booked.');
        this.store.loadAll();
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'Booking failed.');
      },
    });
  }

  setStatus(id: string, status: string) {
    this.store.updateAppointmentStatus(id, status).subscribe({
      next: () => {
        this.store.toast('success', `Queue moved to ${status}.`);
        this.store.loadAll();
      },
      error: () => this.store.toast('error', 'Status update failed.'),
    });
  }

  private localDateTimeValue(daysFromNow: number) {
    const d = new Date(Date.now() + daysFromNow * 86400000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
}
