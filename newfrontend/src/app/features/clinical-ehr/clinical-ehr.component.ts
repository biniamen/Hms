import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-clinical-ehr',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in pb-20">
      
      <!-- HEADER BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Clinical EHR & Documentation</h1>
          <p class="text-xs text-slate-500 mt-1">SOAP notes, ICD coding, vitals logging, and clinical history</p>
        </div>

        @if (!isFormVisible()) {
          <button 
            (click)="isFormVisible.set(true)" 
            class="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-2xl text-xs shadow-xl shadow-slate-200 flex items-center gap-2 self-start sm:self-auto hover:bg-slate-800 transition-all active:scale-95">
            <span class="material-icons text-base">note_add</span>
            <span>New Encounter Note</span>
          </button>
        }
      </div>

      <!-- INLINE ENCOUNTER FORM -->
      @if (isFormVisible()) {
        <div class="bg-white rounded-3xl border-2 border-teal-500/20 shadow-2xl shadow-teal-500/5 overflow-hidden animate-slide-down">
          <div class="bg-teal-50/50 px-6 py-4 border-b border-teal-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                <span class="material-icons text-base">history_edu</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">New Clinical Documentation</h3>
                <p class="text-[10px] text-teal-600 font-bold uppercase tracking-widest">SOAP Methodology Entry</p>
              </div>
            </div>
            <button (click)="isFormVisible.set(false)" class="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form [formGroup]="recordForm" (ngSubmit)="submitRecord()" class="p-6 sm:p-8 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <!-- Column 1: Patient & Diagnosis -->
              <div class="space-y-4">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Select Patient Chart *</label>
                  <select formControlName="patientId" [class]="inputClasses">
                    @for (p of store.patients(); track p.id) {
                      <option [value]="p.id">{{ p.name }} ({{ p.mrn }})</option>
                    }
                  </select>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Diagnosis *</label>
                    <input type="text" formControlName="diagnosis" placeholder="e.g. Hypertension" [class]="inputClasses" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">ICD-10 Code</label>
                    <input type="text" formControlName="icdCode" placeholder="e.g. I10" [class]="inputClasses + ' font-mono'" />
                  </div>
                </div>
              </div>

              <!-- Column 2: Documentation -->
              <div class="space-y-4">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Clinical SOAP Notes *</label>
                  <textarea formControlName="clinicalNotes" rows="4" 
                    placeholder="S: Patient reports... O: Vitals stable... A: Chronic condition... P: Renew meds..." 
                    [class]="inputClasses"></textarea>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button type="button" (click)="isFormVisible.set(false)" class="px-6 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Discard</button>
              <button type="submit" class="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-0.5 active:scale-95">
                Commit to Record
              </button>
            </div>
          </form>
        </div>
      }

      <!-- PATIENT SELECTOR STRIP -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <span class="material-icons">folder_shared</span>
          </div>
          <div>
            <div class="text-[11px] font-black text-slate-900 uppercase tracking-wider">Active Patient Chart</div>
            <div class="text-[10px] text-slate-400">Filtering history by selected MRN</div>
          </div>
        </div>

        <select 
          [value]="selectedPatientId()"
          (change)="onPatientSelect($event)"
          class="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500 transition-all">
          @for (p of store.patients(); track p.id) {
            <option [value]="p.id">{{ p.name }} — MRN: {{ p.mrn }}</option>
          }
        </select>
      </div>

      <!-- MEDICAL RECORDS TIMELINE -->
      <div class="space-y-6 relative before:absolute before:left-6 before:top-0 before:bottom-0 before:w-px before:bg-slate-200 ml-4 sm:ml-0">
        @for (rec of activePatientRecords(); track rec.id) {
          <div class="relative pl-12 group">
            <!-- Timeline Dot -->
            <div class="absolute left-[20px] top-6 w-3 h-3 rounded-full bg-white border-2 border-teal-500 shadow-sm z-10 group-hover:scale-125 transition-transform"></div>
            
            <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div class="flex items-center gap-3">
                  <span class="text-xs font-black text-slate-900">{{ rec.date }}</span>
                  <span class="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 font-bold text-[10px] border border-teal-100 uppercase">Encounter</span>
                </div>
                <div class="text-[11px] text-slate-400 font-medium italic">Documented by {{ rec.doctorName }}</div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <p class="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Primary Diagnosis</p>
                  <div class="text-sm font-bold text-slate-900">{{ rec.diagnosis }}</div>
                  @if (rec.icdCode) {
                    <div class="text-[10px] text-teal-600 font-mono mt-1 font-bold">ICD-10: {{ rec.icdCode }}</div>
                  }
                </div>

                <div class="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <p class="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Vitals at Encounter</p>
                  @if (rec.vitalSigns) {
                    <div class="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>BP: <strong class="text-slate-800">{{ rec.vitalSigns.bp }}</strong></div>
                      <div>HR: <strong class="text-slate-800">{{ rec.vitalSigns.hr }} bpm</strong></div>
                      <div>SpO2: <strong class="text-slate-800">{{ rec.vitalSigns.spo2 }}%</strong></div>
                      <div>Temp: <strong class="text-slate-800">{{ rec.vitalSigns.temp }}°C</strong></div>
                    </div>
                  }
                </div>
              </div>

              <div class="space-y-2">
                <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Clinical Narrative (SOAP)</p>
                <div class="text-xs text-slate-600 leading-relaxed bg-white p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                  {{ rec.clinicalNotes }}
                </div>
              </div>
            </div>
          </div>
        } @empty {
          <div class="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
             <span class="material-icons text-slate-200 text-6xl mb-4">history</span>
             <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">No Records Found for this Chart</p>
          </div>
        }
      </div>
    </div>
  `
})
export class ClinicalEhrComponent {
  store = inject(StoreService);

  selectedPatientId = signal('p-1');
  isFormVisible = signal(false);

  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all';

  recordForm = new FormGroup({
    patientId: new FormControl('p-1', [Validators.required]),
    diagnosis: new FormControl('', [Validators.required]),
    icdCode: new FormControl(''),
    clinicalNotes: new FormControl('', [Validators.required])
  });

  activePatientRecords = computed(() => {
    return this.store.medicalRecords().filter(r => r.patientId === this.selectedPatientId());
  });

  onPatientSelect(event: Event) {
    this.selectedPatientId.set((event.target as HTMLSelectElement).value);
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

    this.isFormVisible.set(false);
    this.recordForm.reset({ patientId: this.selectedPatientId() });
  }
}