import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import type { Patient } from '../../core/models';

@Component({
  selector: 'app-encounter-page',
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
            class="mb-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black uppercase tracking-widest text-teal-600 transition-colors hover:bg-teal-50">
            <span class="material-icons text-sm">arrow_back</span>
            Clinical Workspace
          </button>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">New Clinical Encounter</h1>
          <p class="mt-1 text-xs text-slate-500">SOAP documentation — chief complaint, assessment, and plan for the selected patient chart.</p>
        </div>
        <span class="hidden rounded-full bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-teal-700 sm:inline-flex">
          SOAP Note
        </span>
      </div>

      @if (clinicalPatients().length === 0) {
        <div class="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <span class="material-icons text-4xl text-amber-500">lock_clock</span>
          <h2 class="mt-3 text-sm font-black text-amber-900">No clinically cleared patients</h2>
          <p class="mx-auto mt-2 max-w-md text-xs font-semibold leading-relaxed text-amber-800">
            Encounters can only be documented once Billing settles the patient's payment share.
            Cash patients are cleared by full payment; insured patients are cleared as soon as the copay is collected.
          </p>
          <button type="button" (click)="goBack()" class="mt-5 clinical-secondary">Back to Clinical Workspace</button>
        </div>
      } @else {
        <!-- Active patient strip -->
        @if (activePatient(); as patient) {
          <div class="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 font-black text-white uppercase">{{ patient.name.charAt(0) }}</div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-black text-slate-900">{{ patient.name }}</div>
              <div class="text-[10px] font-mono font-semibold text-slate-400">MRN: {{ patient.mrn }} · {{ patient.gender }} · {{ patient.bloodType }}</div>
            </div>
            <div class="hidden text-right md:block">
              <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">Latest vitals</div>
              @if (latestVitals(); as vitals) {
                <div class="text-xs font-bold text-slate-700">BP {{ vitals.bloodPressure }} · HR {{ vitals.pulse }} · Temp {{ vitals.temperatureC }}°C</div>
              } @else {
                <div class="text-xs italic text-slate-400">No vitals recorded yet.</div>
              }
            </div>
          </div>
        }

        <form
          [formGroup]="encounterForm"
          (ngSubmit)="submitEncounter()"
          class="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          @if (encounterSubmitAttempted()) {
            <div class="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <span class="material-icons text-rose-500">error_outline</span>
              <div class="text-[11px] font-semibold leading-relaxed text-rose-700">
                <strong class="block font-black">Encounter details incomplete</strong>
                Chief complaint, assessment, and plan are required before saving the encounter.
              </div>
            </div>
          }

          <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <label class="clinical-field">
              <span class="flex items-center gap-1">Patient Chart <span class="text-rose-500">*</span></span>
              <select formControlName="patientId" (change)="onPatientSelect($event)" [class]="fieldClasses(encounterForm.controls.patientId)">
                @for (p of clinicalPatients(); track p.id) {
                  <option [value]="p.id">{{ p.name }} - {{ p.mrn }}</option>
                }
              </select>
              @if (encounterForm.controls.patientId.touched && encounterForm.controls.patientId.invalid) {
                <span class="mt-1 text-[10px] font-medium text-rose-600">Select the patient chart.</span>
              }
            </label>
            <label class="clinical-field">
              <span class="flex items-center gap-1">Visit Type <span class="text-rose-500">*</span></span>
              <select formControlName="visitType" [class]="fieldClasses(encounterForm.controls.visitType)">
                @for (type of visitTypes; track type) {
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </label>
            <label class="clinical-field">
              <span class="flex items-center gap-1">Chief Complaint <span class="text-rose-500">*</span></span>
              <input formControlName="chiefComplaint" [class]="fieldClasses(encounterForm.controls.chiefComplaint)" placeholder="Main reason for visit" />
              @if (encounterForm.controls.chiefComplaint.touched && encounterForm.controls.chiefComplaint.invalid) {
                <span class="mt-1 text-[10px] font-medium text-rose-600">Chief complaint is required.</span>
              }
            </label>
            <label class="clinical-field lg:col-span-3">
              <span class="flex items-center gap-1">Assessment <span class="text-rose-500">*</span></span>
              <textarea formControlName="assessment" rows="4" [class]="fieldClasses(encounterForm.controls.assessment)" placeholder="Clinical findings, working impression, and diagnosis"></textarea>
              @if (encounterForm.controls.assessment.touched && encounterForm.controls.assessment.invalid) {
                <span class="mt-1 text-[10px] font-medium text-rose-600">Assessment is required.</span>
              }
            </label>
            <label class="clinical-field lg:col-span-3">
              <span class="flex items-center gap-1">Plan <span class="text-rose-500">*</span></span>
              <textarea formControlName="plan" rows="4" [class]="fieldClasses(encounterForm.controls.plan)" placeholder="Treatment plan, orders, follow-up, and care instructions"></textarea>
              @if (encounterForm.controls.plan.touched && encounterForm.controls.plan.invalid) {
                <span class="mt-1 text-[10px] font-medium text-rose-600">Plan is required.</span>
              }
            </label>
          </div>

          <div class="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-end gap-3 rounded-b-3xl border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:px-8">
            <button type="button" (click)="goBack()" class="clinical-secondary">Discard</button>
            <button type="submit" class="clinical-submit bg-teal-600 hover:bg-teal-700">Save Encounter</button>
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
      box-shadow: 0 14px 30px rgba(20, 184, 166, .14);
      transition: all .18s ease;
    }

    .clinical-submit:hover {
      filter: brightness(1.05);
    }
  `]
})
export class EncounterPageComponent {
  store = inject(StoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  clinicalPatients = computed(() => this.store.clinicalWorklistPatients());
  selectedPatientId = signal('');
  encounterSubmitAttempted = signal(false);

  readonly visitTypes = ['Outpatient', 'Follow-up', 'Emergency', 'Inpatient Review', 'Procedure Review', 'Teleconsultation'];

  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all';
  readonly inputClassesError = 'w-full px-4 py-2.5 bg-rose-50/40 border border-rose-300 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all';

  fieldClasses(control: AbstractControl | null): string {
    return control?.touched && control?.invalid ? this.inputClassesError : this.inputClasses;
  }

  encounterForm = new FormGroup({
    patientId: new FormControl('', [Validators.required]),
    visitType: new FormControl('Outpatient', [Validators.required]),
    chiefComplaint: new FormControl('', [Validators.required]),
    assessment: new FormControl('', [Validators.required]),
    plan: new FormControl('', [Validators.required]),
  });

  activePatient = computed(() => this.clinicalPatients().find(p => p.id === this.selectedPatientId()));

  latestVitals = computed(() => {
    const patient = this.activePatient();
    if (!patient) return undefined;
    return this.store.clinicalVitals()
      .filter(v => v.patientId === patient.id)
      .sort((a, b) => b.recordedAtUtc.localeCompare(a.recordedAtUtc))[0];
  });

  constructor() {
    const queryPatient = this.route.snapshot.queryParamMap.get('patient') || '';

    // Default the chart to the patient that was selected in the workspace (query
    // param) or the first clinically cleared patient once the data is available.
    effect(() => {
      const patients = this.clinicalPatients();
      if (patients.length > 0) {
        const current = this.selectedPatientId();
        if (!current || !patients.some(p => p.id === current)) {
          const preferred = queryPatient && patients.some(p => p.id === queryPatient) ? queryPatient : patients[0].id;
          this.selectedPatientId.set(preferred);
          this.encounterForm.patchValue({ patientId: preferred });
        }
      } else if (this.selectedPatientId()) {
        this.selectedPatientId.set('');
        this.encounterForm.patchValue({ patientId: '' });
      }
    });
  }

  onPatientSelect(event: Event) {
    const patientId = (event.target as HTMLSelectElement).value;
    this.selectedPatientId.set(patientId);
    this.encounterForm.patchValue({ patientId });
  }

  goBack() {
    this.router.navigate(['/clinical-ehr'], {
      queryParams: { tab: 'encounters', patient: this.selectedPatientId() || undefined },
    });
  }

  submitEncounter() {
    if (this.encounterForm.invalid) {
      this.encounterSubmitAttempted.set(true);
      this.encounterForm.markAllAsTouched();
      this.store.addToast('error', 'Encounter Validation', 'Chief complaint, assessment, and plan are required to save the encounter.');
      return;
    }
    const value = this.encounterForm.getRawValue();
    const patient = this.requirePatient(value.patientId);
    if (!patient) return;
    this.store.addClinicalEncounter({
      patientId: patient.id,
      patientName: patient.name,
      doctorId: this.currentDoctorId(),
      doctorName: this.currentDoctorName(),
      visitType: value.visitType || 'Outpatient',
      chiefComplaint: value.chiefComplaint || '',
      assessment: value.assessment || '',
      plan: value.plan || '',
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

  private currentDoctorId(): string {
    return this.store.currentUser()?.id || 'current-doctor';
  }

  private currentDoctorName(): string {
    return this.store.currentUser()?.name || 'Current Clinician';
  }
}
