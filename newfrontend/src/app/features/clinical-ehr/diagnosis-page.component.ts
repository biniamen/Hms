import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import type { Patient } from '../../core/models';

@Component({
  selector: 'app-diagnosis-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in pb-20">
      <!-- Page header -->
      <div class="flex items-center justify-between gap-4">
        <div>
          <button
            type="button"
            (click)="goBack()"
            class="mb-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black uppercase tracking-widest text-violet-600 transition-colors hover:bg-violet-50">
            <span class="material-icons text-sm">arrow_back</span>
            Clinical Workspace
          </button>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Add Clinical Diagnosis</h1>
          <p class="mt-1 text-xs text-slate-500">ICD and local diagnosis coding with certainty, severity, and follow-up plan.</p>
        </div>
        <span class="hidden rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-700 sm:inline-flex">
          Problem List
        </span>
      </div>

      @if (clinicalPatients().length === 0) {
        <div class="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <span class="material-icons text-4xl text-amber-500">lock_clock</span>
          <h2 class="mt-3 text-sm font-black text-amber-900">No clinically cleared patients</h2>
          <p class="mx-auto mt-2 max-w-md text-xs font-semibold leading-relaxed text-amber-800">
            Diagnoses can only be added once Billing settles the patient's payment share.
            Cash patients are cleared by full payment; insured patients are cleared as soon as the copay is collected.
          </p>
          <button type="button" (click)="goBack()" class="mt-5 clinical-secondary">Back to Clinical Workspace</button>
        </div>
      } @else {
        <!-- Active patient strip -->
        @if (activePatient(); as patient) {
          <div class="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 font-black text-white uppercase">{{ patient.name.charAt(0) }}</div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-black text-slate-900">{{ patient.name }}</div>
              <div class="text-[10px] font-mono font-semibold text-slate-400">MRN: {{ patient.mrn }} · {{ patient.gender }} · {{ patient.bloodType }}</div>
            </div>
            <div class="hidden text-right md:block">
              <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">Active problems</div>
              <div class="text-xs font-bold text-slate-700">{{ visibleDiagnoses().length }} on record</div>
            </div>
          </div>
        }

        <form
          [formGroup]="diagnosisForm"
          (ngSubmit)="submitDiagnosis()"
          class="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
            <div class="space-y-6">
              <section class="clinical-order-section">
                <h4>1. Diagnosis classification</h4>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <label class="clinical-field md:col-span-2">Patient Chart
                    <select formControlName="patientId" (change)="onPatientSelect($event)" [class]="fieldClasses(diagnosisForm.controls.patientId)">
                      @for (p of clinicalPatients(); track p.id) {
                        <option [value]="p.id">{{ p.name }} - {{ p.mrn }}</option>
                      }
                    </select>
                  </label>
                  <label class="clinical-field">Code System
                    <select formControlName="codeSystem" [class]="inputClasses">
                      <option>ICD-10</option>
                      <option>SNOMED CT</option>
                      <option>Local</option>
                    </select>
                  </label>
                  <label class="clinical-field">Code
                    <input formControlName="code" [class]="fieldClasses(diagnosisForm.controls.code)" placeholder="e.g. J02.9" />
                  </label>
                  <label class="clinical-field">Diagnosis Type
                    <select formControlName="diagnosisType" [class]="inputClasses">
                      <option>Primary</option>
                      <option>Secondary</option>
                      <option>Differential</option>
                      <option>Rule out</option>
                    </select>
                  </label>
                  <label class="clinical-field">Certainty
                    <select formControlName="certainty" [class]="inputClasses">
                      <option>Confirmed</option>
                      <option>Presumed</option>
                      <option>Suspected</option>
                    </select>
                  </label>
                  <label class="clinical-field">Severity
                    <select formControlName="severity" [class]="inputClasses">
                      <option>Low</option>
                      <option>Moderate</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </label>
                  <label class="clinical-field">Onset Date
                    <input type="date" formControlName="onsetDate" [class]="inputClasses" />
                  </label>
                </div>
              </section>

              <section class="clinical-order-section">
                <h4>2. Clinical impression</h4>
                <div class="grid grid-cols-1 gap-4">
                  <label class="clinical-field">Diagnosis Description
                    <textarea formControlName="description" rows="3" [class]="fieldClasses(diagnosisForm.controls.description)" placeholder="Write the working or confirmed diagnosis"></textarea>
                  </label>
                  <label class="clinical-field">Supporting Notes
                    <textarea formControlName="notes" rows="3" [class]="inputClasses" placeholder="Key symptoms, exam findings, investigation basis, exclusions"></textarea>
                  </label>
                  <label class="clinical-field">Follow-up Plan
                    <textarea formControlName="followUpPlan" rows="3" [class]="inputClasses" placeholder="Review date, referral, monitoring, escalation instruction"></textarea>
                  </label>
                </div>
              </section>
            </div>

            <aside class="h-fit rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
              <div class="mb-3 flex items-center justify-between">
                <h4 class="text-sm font-black text-slate-900">Problem list preview</h4>
                <span class="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-700">{{ visibleDiagnoses().length }} active</span>
              </div>
              <div class="rounded-xl border-l-4 border-violet-500 bg-white p-4 shadow-sm">
                <div class="text-xs font-black text-slate-900">{{ diagnosisForm.value.description || 'Diagnosis not entered yet' }}</div>
                <div class="mt-2 text-[11px] font-semibold text-slate-500">
                  {{ diagnosisForm.value.codeSystem }} {{ diagnosisForm.value.code || 'No code' }} - {{ diagnosisForm.value.diagnosisType }} - {{ diagnosisForm.value.certainty }}
                </div>
                <div class="mt-3 rounded-lg bg-violet-50 p-3 text-[11px] font-semibold text-violet-800">
                  {{ diagnosisForm.value.followUpPlan || 'Follow-up plan will appear here.' }}
                </div>
              </div>
              <div class="mt-4 space-y-2">
                @for (dx of visibleDiagnoses().slice(0, 3); track dx.id) {
                  <div class="rounded-xl bg-white p-3 text-[11px] font-semibold text-slate-600 ring-1 ring-violet-100">
                    <span class="font-black text-slate-900">{{ dx.code }}</span> - {{ dx.description }}
                  </div>
                }
              </div>
            </aside>
          </div>

          <div class="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-end gap-3 rounded-b-3xl border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:px-8">
            <button type="button" (click)="goBack()" class="clinical-secondary">Discard</button>
            <button type="submit" class="clinical-submit bg-violet-600 hover:bg-violet-700">Add Diagnosis</button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .clinical-field {
      display: grid;
      gap: .375rem;
      margin-left: .25rem;
      font-size: .625rem;
      font-weight: 800;
      color: rgb(100 116 139);
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .clinical-order-section {
      border-radius: 1rem;
      border: 1px solid rgb(226 232 240);
      background: rgb(248 250 252 / .65);
      padding: 1rem;
    }

    .clinical-order-section h4 {
      margin-bottom: .85rem;
      font-size: .85rem;
      font-weight: 900;
      color: rgb(15 23 42);
    }

    .clinical-secondary {
      border-radius: .75rem;
      border: 1px solid rgb(226 232 240);
      background: white;
      padding: .625rem 1rem;
      font-size: .75rem;
      font-weight: 800;
      color: rgb(71 85 105);
      transition: background .18s ease;
    }

    .clinical-secondary:hover {
      background: rgb(248 250 252);
    }

    .clinical-submit {
      border-radius: .75rem;
      padding: .625rem 1.5rem;
      font-size: .75rem;
      font-weight: 900;
      color: white;
      box-shadow: 0 14px 30px rgba(139, 92, 246, .16);
      transition: all .18s ease;
    }

    .clinical-submit:hover {
      filter: brightness(1.05);
    }
  `]
})
export class DiagnosisPageComponent {
  store = inject(StoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  clinicalPatients = computed(() => this.store.clinicalWorklistPatients());
  selectedPatientId = signal('');

  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 transition-all';
  readonly inputClassesError = 'w-full px-4 py-2.5 bg-rose-50/40 border border-rose-300 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all';

  fieldClasses(control: AbstractControl | null): string {
    return control?.touched && control?.invalid ? this.inputClassesError : this.inputClasses;
  }

  diagnosisForm = new FormGroup({
    patientId: new FormControl('', [Validators.required]),
    code: new FormControl('', [Validators.required]),
    codeSystem: new FormControl('ICD-10', [Validators.required]),
    diagnosisType: new FormControl('Primary', [Validators.required]),
    certainty: new FormControl('Confirmed', [Validators.required]),
    description: new FormControl('', [Validators.required]),
    severity: new FormControl('Moderate', [Validators.required]),
    onsetDate: new FormControl(new Date().toISOString().split('T')[0]),
    notes: new FormControl(''),
    followUpPlan: new FormControl(''),
  });

  activePatient = computed(() => this.clinicalPatients().find(p => p.id === this.selectedPatientId()));
  visibleDiagnoses = computed(() => this.store.clinicalDiagnoses().filter(row => row.patientId === this.selectedPatientId()));

  constructor() {
    const queryPatient = this.route.snapshot.queryParamMap.get('patient') || '';

    effect(() => {
      const patients = this.clinicalPatients();
      if (patients.length > 0) {
        const current = this.selectedPatientId();
        if (!current || !patients.some(p => p.id === current)) {
          const preferred = queryPatient && patients.some(p => p.id === queryPatient) ? queryPatient : patients[0].id;
          this.selectedPatientId.set(preferred);
          this.diagnosisForm.patchValue({ patientId: preferred });
        }
      } else if (this.selectedPatientId()) {
        this.selectedPatientId.set('');
        this.diagnosisForm.patchValue({ patientId: '' });
      }
    });
  }

  onPatientSelect(event: Event) {
    const patientId = (event.target as HTMLSelectElement).value;
    this.selectedPatientId.set(patientId);
    this.diagnosisForm.patchValue({ patientId });
  }

  goBack() {
    this.router.navigate(['/clinical-ehr'], {
      queryParams: { tab: 'diagnoses', patient: this.selectedPatientId() || undefined },
    });
  }

  submitDiagnosis() {
    if (!this.ensureDoctorRole()) return;

    if (this.diagnosisForm.invalid) {
      this.diagnosisForm.markAllAsTouched();
      this.store.addToast('error', 'Diagnosis Validation', 'Patient chart, diagnosis code, and description are required to add the diagnosis.');
      return;
    }
    const value = this.diagnosisForm.getRawValue();
    const patient = this.requirePatient(value.patientId);
    if (!patient) return;
    this.store.addDiagnosis({
      patientId: patient.id,
      patientName: patient.name,
      patientMrn: patient.mrn,
      doctorId: this.currentDoctorId(),
      doctorName: this.currentDoctorName(),
      code: `${value.codeSystem || 'ICD-10'} ${value.code || ''}`.trim(),
      description: [
        value.description || '',
        `Type: ${value.diagnosisType || 'Primary'}`,
        `Certainty: ${value.certainty || 'Confirmed'}`,
        value.onsetDate ? `Onset: ${value.onsetDate}` : '',
        value.notes ? `Clinical basis: ${value.notes}` : '',
        value.followUpPlan ? `Follow-up: ${value.followUpPlan}` : '',
      ].filter(Boolean).join('\n'),
      severity: value.severity || 'Moderate',
    });
    this.goBack();
  }

  private requirePatient(patientId: string | null): Patient | undefined {
    const patient = this.clinicalPatients().find(item => item.id === patientId);
    if (!patient) {
      this.store.addToast('error', 'Billing Clearance Required', 'Select a patient whose payment share is settled before saving the clinical record.');
    }
    return patient;
  }

  private ensureDoctorRole(): boolean {
    if (this.store.currentUser()?.role !== 'DOCTOR') {
      this.store.addToast('error', 'Doctor Role Required', 'Only the assigned doctor can add a diagnosis.');
      return false;
    }
    return true;
  }

  private currentDoctorId(): string {
    const user = this.store.currentUser();
    return user?.role === 'DOCTOR' ? user.id : '';
  }

  private currentDoctorName(): string {
    const user = this.store.currentUser();
    return user?.role === 'DOCTOR' ? user.name : 'Assigned Doctor';
  }
}
