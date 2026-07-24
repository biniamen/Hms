import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ApiService } from '../../api.service';
import { ClinicalTab } from '../../core/models';

@Component({
  selector: 'app-clinical',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="grid gap-4">
      <!-- Stats -->
      <section class="grid grid-cols-5 gap-4 max-[1100px]:grid-cols-3 max-[640px]:grid-cols-1">
        <article *ngFor="let stat of store.clinicalStats()" class="enterprise-panel p-5">
          <span class="inline-flex rounded-lg px-3 py-1 text-xs font-black uppercase" [ngClass]="stat.tone">{{ stat.label }}</span>
          <strong class="mt-3 block text-3xl font-black text-slate-900">{{ stat.value }}</strong>
        </article>
      </section>

      <!-- Tab Bar -->
      <div class="enterprise-panel p-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary" [class.bg-brand-50]="clinicalTab() === 'encounters'" (click)="clinicalTab.set('encounters')">Encounters</button>
            <button class="btn-secondary" [class.bg-brand-50]="clinicalTab() === 'vitals'" (click)="clinicalTab.set('vitals')">Vitals</button>
            <button class="btn-secondary" [class.bg-brand-50]="clinicalTab() === 'diagnoses'" (click)="clinicalTab.set('diagnoses')">Diagnoses</button>
            <button class="btn-secondary" [class.bg-brand-50]="clinicalTab() === 'prescriptions'" (click)="clinicalTab.set('prescriptions')">Prescriptions</button>
            <button class="btn-secondary" [class.bg-brand-50]="clinicalTab() === 'labs'" (click)="clinicalTab.set('labs')">Lab Requests</button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-primary" (click)="openModal('encounter')">Encounter</button>
            <button class="btn-primary" (click)="openModal('vitals')">Vitals</button>
            <button class="btn-primary" (click)="openModal('diagnosis')">Diagnosis</button>
            <button class="btn-primary" (click)="openModal('prescription')">Prescription</button>
            <button class="btn-primary" (click)="openModal('lab')">Lab</button>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <div class="enterprise-panel overflow-auto p-4" [ngSwitch]="clinicalTab()">
        <div class="mb-3 flex justify-end gap-2">
          <button class="btn-secondary" (click)="store.exportExcel('clinical-' + clinicalTab(), currentData())">Excel</button>
          <button class="btn-secondary" (click)="store.exportPdf('clinical-' + clinicalTab(), currentData())">PDF</button>
          <button class="btn-secondary" (click)="store.printTable('clinical-' + clinicalTab(), currentData())">Print</button>
        </div>

        <!-- Encounters -->
        <table *ngSwitchCase="'encounters'" class="data-table">
          <thead><tr><th>Patient</th><th>Doctor</th><th>Visit</th><th>Complaint</th><th>Assessment</th><th>Plan</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.encounters())">
              <td>{{ store.patientName(row.patientId) }}</td>
              <td>{{ store.doctorName(row.doctorId) }}</td>
              <td>{{ row.visitType }}</td>
              <td>{{ row.chiefComplaint }}</td>
              <td>{{ row.assessment }}</td>
              <td>{{ row.plan }}</td>
            </tr>
            <tr *ngIf="!store.encounters().length"><td colspan="6" class="text-center text-slate-500 py-8">No encounters recorded</td></tr>
          </tbody>
        </table>

        <!-- Vitals -->
        <table *ngSwitchCase="'vitals'" class="data-table">
          <thead><tr><th>Patient</th><th>Temp</th><th>Pulse</th><th>RR</th><th>BP</th><th>Weight</th><th>Height</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.vitals())">
              <td>{{ store.patientName(row.patientId) }}</td>
              <td>{{ row.temperatureC }} C</td>
              <td>{{ row.pulse }}</td>
              <td>{{ row.respiratoryRate }}</td>
              <td>{{ row.bloodPressure }}</td>
              <td>{{ row.weightKg }} kg</td>
              <td>{{ row.heightCm }} cm</td>
            </tr>
            <tr *ngIf="!store.vitals().length"><td colspan="7" class="text-center text-slate-500 py-8">No vitals recorded</td></tr>
          </tbody>
        </table>

        <!-- Diagnoses -->
        <table *ngSwitchCase="'diagnoses'" class="data-table">
          <thead><tr><th>Patient</th><th>Doctor</th><th>Code</th><th>Description</th><th>Severity</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.diagnoses())">
              <td>{{ store.patientName(row.patientId) }}</td>
              <td>{{ store.doctorName(row.doctorId) }}</td>
              <td>{{ row.code }}</td>
              <td>{{ row.description }}</td>
              <td><span class="badge">{{ row.severity }}</span></td>
            </tr>
            <tr *ngIf="!store.diagnoses().length"><td colspan="5" class="text-center text-slate-500 py-8">No diagnoses recorded</td></tr>
          </tbody>
        </table>

        <!-- Prescriptions -->
        <table *ngSwitchCase="'prescriptions'" class="data-table">
          <thead><tr><th>Patient</th><th>Doctor</th><th>Medication</th><th>Instructions</th><th>Ordered</th><th>Print</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.prescriptions())">
              <td>{{ store.patientName(row.patientId) }}</td>
              <td>{{ store.doctorName(row.doctorId) }}</td>
              <td>{{ row.medication }}</td>
              <td>{{ row.instructions }}</td>
              <td>{{ row.orderedAtUtc | date:'short' }}</td>
              <td><button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" (click)="store.printPrescription(row)">Rx</button></td>
            </tr>
            <tr *ngIf="!store.prescriptions().length"><td colspan="6" class="text-center text-slate-500 py-8">No prescriptions issued</td></tr>
          </tbody>
        </table>

        <!-- Lab Requests -->
        <table *ngSwitchCase="'labs'" class="data-table">
          <thead><tr><th>Patient</th><th>Doctor</th><th>Test</th><th>Status</th><th>Ordered</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.labRequests())">
              <td>{{ store.patientName(row.patientId) }}</td>
              <td>{{ store.doctorName(row.doctorId) }}</td>
              <td>{{ row.testName }}</td>
              <td><span class="badge badge-blue">{{ row.status }}</span></td>
              <td>{{ row.orderedAtUtc | date:'short' }}</td>
            </tr>
            <tr *ngIf="!store.labRequests().length"><td colspan="5" class="text-center text-slate-500 py-8">No lab requests</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Modals -->
      <!-- Encounter Modal -->
      <div *ngIf="modal() === 'encounter'" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">New Encounter</h2>
            <button class="btn-secondary" type="button" (click)="modal.set(null)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createEncounter()">
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Patient<select class="field-control" name="ecp" [(ngModel)]="encounterForm.patientId"><option *ngFor="let p of store.patients()" [value]="p.id">{{ p.mrn }} - {{ p.firstName }} {{ p.lastName }}</option></select></label>
              <label class="field-label">Doctor<select class="field-control" name="ecd" [(ngModel)]="encounterForm.doctorId"><option *ngFor="let d of store.doctors()" [value]="d.id">Dr. {{ d.firstName }} {{ d.lastName }}</option></select></label>
              <label class="field-label">Visit Type<select class="field-control" name="ecvt" [(ngModel)]="encounterForm.visitType"><option>Outpatient</option><option>Inpatient</option><option>Emergency</option></select></label>
              <label class="field-label">Chief Complaint<input class="field-control" name="ecc" [(ngModel)]="encounterForm.chiefComplaint"></label>
              <label class="field-label col-span-2">Assessment<textarea class="field-control min-h-20" name="eca" [(ngModel)]="encounterForm.assessment"></textarea></label>
              <label class="field-label col-span-2">Plan<textarea class="field-control min-h-20" name="ecplan" [(ngModel)]="encounterForm.plan"></textarea></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Save Encounter</button>
          </form>
        </div>
      </div>

      <!-- Vitals Modal -->
      <div *ngIf="modal() === 'vitals'" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">Record Vitals</h2>
            <button class="btn-secondary" type="button" (click)="modal.set(null)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createVitals()">
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Patient<select class="field-control" name="vp" [(ngModel)]="vitalsForm.patientId"><option *ngFor="let p of store.patients()" [value]="p.id">{{ p.mrn }} - {{ p.firstName }} {{ p.lastName }}</option></select></label>
              <label class="field-label">Temp (C)<input class="field-control" name="vt" type="number" step="0.1" [(ngModel)]="vitalsForm.temperatureC"></label>
              <label class="field-label">Pulse<input class="field-control" name="vpulse" type="number" [(ngModel)]="vitalsForm.pulse"></label>
              <label class="field-label">Resp Rate<input class="field-control" name="vrr" type="number" [(ngModel)]="vitalsForm.respiratoryRate"></label>
              <label class="field-label">BP (e.g. 120/80)<input class="field-control" name="vbp" [(ngModel)]="vitalsForm.bloodPressure"></label>
              <label class="field-label">Weight (kg)<input class="field-control" name="vw" type="number" step="0.1" [(ngModel)]="vitalsForm.weightKg"></label>
              <label class="field-label">Height (cm)<input class="field-control" name="vh" type="number" step="0.1" [(ngModel)]="vitalsForm.heightCm"></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Record Vitals</button>
          </form>
        </div>
      </div>

      <!-- Diagnosis Modal -->
      <div *ngIf="modal() === 'diagnosis'" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">Add Diagnosis</h2>
            <button class="btn-secondary" type="button" (click)="modal.set(null)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createDiagnosis()">
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Patient<select class="field-control" name="dgp" [(ngModel)]="diagnosisForm.patientId"><option *ngFor="let p of store.patients()" [value]="p.id">{{ p.mrn }} - {{ p.firstName }} {{ p.lastName }}</option></select></label>
              <label class="field-label">Doctor<select class="field-control" name="dgd" [(ngModel)]="diagnosisForm.doctorId"><option *ngFor="let d of store.doctors()" [value]="d.id">Dr. {{ d.firstName }} {{ d.lastName }}</option></select></label>
              <label class="field-label">Code (ICD)<input class="field-control" name="dgc" [(ngModel)]="diagnosisForm.code" placeholder="A00.0"></label>
              <label class="field-label">Severity<select class="field-control" name="dgs" [(ngModel)]="diagnosisForm.severity"><option>Mild</option><option>Moderate</option><option>Severe</option><option>Critical</option></select></label>
              <label class="field-label col-span-2">Description<input class="field-control" name="dgdsc" [(ngModel)]="diagnosisForm.description"></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Add Diagnosis</button>
          </form>
        </div>
      </div>

      <!-- Prescription Modal -->
      <div *ngIf="modal() === 'prescription'" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">Issue Prescription</h2>
            <button class="btn-secondary" type="button" (click)="modal.set(null)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createPrescription()">
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Patient<select class="field-control" name="rxp" [(ngModel)]="prescriptionForm.patientId"><option *ngFor="let p of store.patients()" [value]="p.id">{{ p.mrn }} - {{ p.firstName }} {{ p.lastName }}</option></select></label>
              <label class="field-label">Doctor<select class="field-control" name="rxd" [(ngModel)]="prescriptionForm.doctorId"><option *ngFor="let d of store.doctors()" [value]="d.id">Dr. {{ d.firstName }} {{ d.lastName }}</option></select></label>
              <label class="field-label col-span-2">Medication<input class="field-control" name="rxm" [(ngModel)]="prescriptionForm.medication" placeholder="Drug name and dosage"></label>
              <label class="field-label col-span-2">Instructions<textarea class="field-control min-h-20" name="rxi" [(ngModel)]="prescriptionForm.instructions"></textarea></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Issue Prescription</button>
          </form>
        </div>
      </div>

      <!-- Lab Request Modal -->
      <div *ngIf="modal() === 'lab'" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">New Lab Request</h2>
            <button class="btn-secondary" type="button" (click)="modal.set(null)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createLabRequest()">
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Patient<select class="field-control" name="lbp" [(ngModel)]="labForm.patientId"><option *ngFor="let p of store.patients()" [value]="p.id">{{ p.mrn }} - {{ p.firstName }} {{ p.lastName }}</option></select></label>
              <label class="field-label">Doctor<select class="field-control" name="lbd" [(ngModel)]="labForm.doctorId"><option *ngFor="let d of store.doctors()" [value]="d.id">Dr. {{ d.firstName }} {{ d.lastName }}</option></select></label>
              <label class="field-label col-span-2">Test Name<input class="field-control" name="lbn" [(ngModel)]="labForm.testName" placeholder="e.g. Complete Blood Count"></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Create Lab Request</button>
          </form>
        </div>
      </div>
    </section>
  `,
})
export class ClinicalComponent {
  clinicalTab = signal<ClinicalTab>('encounters');
  modal = signal<'encounter' | 'vitals' | 'diagnosis' | 'prescription' | 'lab' | null>(null);

  encounterForm = { patientId: '', doctorId: '', visitType: 'Outpatient', chiefComplaint: '', assessment: '', plan: '' };
  vitalsForm = { patientId: '', temperatureC: 37, pulse: 80, respiratoryRate: 18, bloodPressure: '120/80', weightKg: 60, heightCm: 165 };
  diagnosisForm = { patientId: '', doctorId: '', code: '', description: '', severity: 'Mild' };
  prescriptionForm = { patientId: '', doctorId: '', medication: '', instructions: '' };
  labForm = { patientId: '', doctorId: '', testName: '' };

  constructor(
    public store: StoreService,
    private api: ApiService
  ) {}

  currentData() {
    switch (this.clinicalTab()) {
      case 'encounters': return this.store.encounters();
      case 'vitals': return this.store.vitals();
      case 'diagnoses': return this.store.diagnoses();
      case 'prescriptions': return this.store.prescriptions();
      case 'labs': return this.store.labRequests();
    }
  }

  openModal(type: 'encounter' | 'vitals' | 'diagnosis' | 'prescription' | 'lab') {
    this.modal.set(type);
  }

  createEncounter() {
    this.store.saving.set(true);
    this.store.createEncounter(this.encounterForm).subscribe({
      next: () => { this.store.saving.set(false); this.modal.set(null); this.store.toast('success', 'Encounter saved.'); this.store.loadAll(); },
      error: () => { this.store.saving.set(false); this.store.toast('error', 'Failed to save encounter.'); },
    });
  }

  createVitals() {
    this.store.saving.set(true);
    this.store.createVitals(this.vitalsForm).subscribe({
      next: () => { this.store.saving.set(false); this.modal.set(null); this.store.toast('success', 'Vitals recorded.'); this.store.loadAll(); },
      error: () => { this.store.saving.set(false); this.store.toast('error', 'Failed to record vitals.'); },
    });
  }

  createDiagnosis() {
    this.store.saving.set(true);
    this.store.createDiagnosis(this.diagnosisForm).subscribe({
      next: () => { this.store.saving.set(false); this.modal.set(null); this.store.toast('success', 'Diagnosis added.'); this.store.loadAll(); },
      error: () => { this.store.saving.set(false); this.store.toast('error', 'Failed to add diagnosis.'); },
    });
  }

  createPrescription() {
    this.store.saving.set(true);
    this.store.createPrescription(this.prescriptionForm).subscribe({
      next: () => { this.store.saving.set(false); this.modal.set(null); this.store.toast('success', 'Prescription issued.'); this.store.loadAll(); },
      error: () => { this.store.saving.set(false); this.store.toast('error', 'Failed to issue prescription.'); },
    });
  }

  createLabRequest() {
    this.store.saving.set(true);
    this.store.createLabRequest(this.labForm).subscribe({
      next: () => { this.store.saving.set(false); this.modal.set(null); this.store.toast('success', 'Lab request created.'); this.store.loadAll(); },
      error: () => { this.store.saving.set(false); this.store.toast('error', 'Failed to create lab request.'); },
    });
  }
}
