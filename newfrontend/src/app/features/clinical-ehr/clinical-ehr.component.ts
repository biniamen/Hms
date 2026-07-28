import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-clinical-ehr',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- HEADER BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Clinical EHR & Encounter Documentation</h1>
          <p class="text-xs text-slate-500 mt-1">SOAP notes, diagnostic ICD coding, vital signs logging, and medical history</p>
        </div>

        <button 
          (click)="openRecordModal()" 
          class="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-teal-500/20 flex items-center gap-2 self-start sm:self-auto">
          <span class="material-icons text-base">note_add</span>
          <span>New Encounter Note</span>
        </button>
      </div>

      <!-- SELECT PATIENT SELECTOR STRIP -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200/80 subtle-shadow flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <span class="material-icons text-teal-600 text-xl">folder_shared</span>
          <div>
            <div class="text-xs font-bold text-slate-800">Select Active Patient EHR Chart</div>
            <div class="text-[10px] text-slate-400">View complete clinical chart timeline and diagnoses</div>
          </div>
        </div>

        <select 
          [value]="selectedPatientId()"
          (change)="onPatientSelect($event)"
          class="w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500">
          @for (p of store.patients(); track p.id) {
            <option [value]="p.id">{{ p.name }} (MRN: {{ p.mrn }})</option>
          }
        </select>
      </div>

      <!-- MEDICAL RECORDS TIMELINE CARDS -->
      <div class="space-y-4">
        @for (rec of activePatientRecords(); track rec.id) {
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 subtle-shadow space-y-4">
            
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold text-xs border border-teal-200">
                  Encounter Record
                </span>
                <span class="text-xs text-slate-500">Encounter Date: <strong class="text-slate-800">{{ rec.date }}</strong></span>
              </div>
              <div class="text-xs text-slate-400 font-medium">Attending: {{ rec.doctorName }}</div>
            </div>

            <!-- Diagnosis & Symptoms -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div class="text-[10px] font-bold uppercase text-slate-400 mb-1">Diagnosis / ICD Code</div>
                <div class="text-sm font-bold text-slate-900">{{ rec.diagnosis }}</div>
                @if (rec.icdCode) {
                  <div class="text-xs text-teal-600 font-mono mt-0.5 font-semibold">ICD: {{ rec.icdCode }}</div>
                }
              </div>

              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div class="text-[10px] font-bold uppercase text-slate-400 mb-1">Chief Complaint / Symptoms</div>
                <div class="text-xs text-slate-700">{{ rec.symptoms.join(', ') }}</div>
              </div>
            </div>

            <!-- Clinical SOAP Notes -->
            <div class="space-y-1">
              <div class="text-[10px] font-bold uppercase text-slate-400">Clinical SOAP Notes</div>
              <p class="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">{{ rec.clinicalNotes }}</p>
            </div>

            <!-- Vital Signs -->
            @if (rec.vitalSigns) {
              <div class="pt-3 border-t border-slate-100 font-mono text-[11px] text-slate-500 flex flex-wrap items-center gap-4">
                <span>BP: <strong>{{ rec.vitalSigns.bp }}</strong></span>
                <span>HR: <strong>{{ rec.vitalSigns.hr }} bpm</strong></span>
                <span>Temp: <strong>{{ rec.vitalSigns.temp }}°C</strong></span>
                <span>SpO2: <strong>{{ rec.vitalSigns.spo2 }}%</strong></span>
              </div>
            }

          </div>
        }
      </div>

      <!-- CREATE RECORD MODAL -->
      @if (isRecordModalOpen()) {
        <div class="fixed inset-0 bg-slate-900/30 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scale-up space-y-6">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 class="text-base font-bold text-slate-900 font-display">New Encounter EHR Entry</h3>
              <button (click)="closeRecordModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="recordForm" (ngSubmit)="submitRecord()" class="space-y-4 text-xs">
              
              <div>
                <label for="ehr-patient-id" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Patient Chart *</label>
                <select id="ehr-patient-id" formControlName="patientId" class="w-full px-3 py-2 border rounded-xl text-xs">
                  @for (p of store.patients(); track p.id) {
                    <option [value]="p.id">{{ p.name }} ({{ p.mrn }})</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="ehr-diagnosis" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Diagnosis *</label>
                  <input id="ehr-diagnosis" type="text" formControlName="diagnosis" placeholder="e.g. Acute Coronary Syndrome" class="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
                <div>
                  <label for="ehr-icd" class="block text-xs font-semibold uppercase text-slate-600 mb-1">ICD Code</label>
                  <input id="ehr-icd" type="text" formControlName="icdCode" placeholder="e.g. I20.0" class="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
              </div>

              <div>
                <label for="ehr-notes" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Clinical SOAP Notes *</label>
                <textarea id="ehr-notes" formControlName="clinicalNotes" rows="3" placeholder="Subjective, Objective, Assessment, Plan..." class="w-full px-3 py-2 border rounded-xl text-xs"></textarea>
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" (click)="closeRecordModal()" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl shadow-md shadow-teal-500/20">Save Record</button>
              </div>

            </form>

          </div>
        </div>
      }

    </div>
  `
})
export class ClinicalEhrComponent {
  store = inject(StoreService);

  selectedPatientId = signal('p-1');
  isRecordModalOpen = signal(false);

  recordForm = new FormGroup({
    patientId: new FormControl('p-1', [Validators.required]),
    diagnosis: new FormControl('', [Validators.required]),
    icdCode: new FormControl('I20.0'),
    clinicalNotes: new FormControl('', [Validators.required])
  });

  activePatientRecords = () => {
    return this.store.medicalRecords().filter(r => r.patientId === this.selectedPatientId());
  };

  onPatientSelect(event: Event) {
    const id = (event.target as HTMLSelectElement).value;
    this.selectedPatientId.set(id);
  }

  openRecordModal() {
    this.isRecordModalOpen.set(true);
  }

  closeRecordModal() {
    this.isRecordModalOpen.set(false);
  }

  submitRecord() {
    if (this.recordForm.invalid) {
      this.recordForm.markAllAsTouched();
      return;
    }

    const val = this.recordForm.value;
    const patient = this.store.patients().find(p => p.id === val.patientId);

    if (patient) {
      this.store.addMedicalRecord({
        patientId: patient.id,
        patientName: patient.name,
        doctorId: this.store.currentUser()?.id || 'u-101',
        doctorName: this.store.currentUser()?.name || 'Dr. Sarah Jenkins',
        diagnosis: val.diagnosis!,
        icdCode: val.icdCode || 'I20.0',
        symptoms: ['Patient presenting for follow-up evaluation.'],
        clinicalNotes: val.clinicalNotes!,
        vitalSigns: {
          bp: '120/80',
          hr: 72,
          temp: 37.0,
          spo2: 98,
          respiratoryRate: 16,
          updatedAt: 'Just now'
        }
      });
    }

    this.closeRecordModal();
    this.recordForm.reset();
  }
}
