import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import type { Patient } from '../../core/models';

@Component({
  selector: 'app-vitals-page',
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
            class="mb-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black uppercase tracking-widest text-sky-600 transition-colors hover:bg-sky-50">
            <span class="material-icons text-sm">arrow_back</span>
            Clinical Workspace
          </button>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Record Patient Vitals</h1>
          <p class="mt-1 text-xs text-slate-500">Nursing and clinical observations — temperature, pulse, respiration, blood pressure, weight, and height.</p>
        </div>
        <span class="hidden rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-700 sm:inline-flex">
          Observations
        </span>
      </div>

      @if (clinicalPatients().length === 0) {
        <div class="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <span class="material-icons text-4xl text-amber-500">lock_clock</span>
          <h2 class="mt-3 text-sm font-black text-amber-900">No clinically cleared patients</h2>
          <p class="mx-auto mt-2 max-w-md text-xs font-semibold leading-relaxed text-amber-800">
            Vitals can only be recorded once Billing settles the patient's payment share.
            Cash patients are cleared by full payment; insured patients are cleared as soon as the copay is collected.
          </p>
          <button type="button" (click)="goBack()" class="mt-5 clinical-secondary">Back to Clinical Workspace</button>
        </div>
      } @else {
        <!-- Active patient strip -->
        @if (activePatient(); as patient) {
          <div class="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 font-black text-white uppercase">{{ patient.name.charAt(0) }}</div>
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
          [formGroup]="vitalsForm"
          (ngSubmit)="submitVitals()"
          class="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <label class="clinical-field md:col-span-2">
              <span class="flex items-center gap-1">Patient Chart <span class="text-rose-500">*</span></span>
              <select formControlName="patientId" (change)="onPatientSelect($event)" [class]="fieldClasses(vitalsForm.controls.patientId)">
                @for (p of clinicalPatients(); track p.id) {
                  <option [value]="p.id">{{ p.name }} - {{ p.mrn }}</option>
                }
              </select>
              @if (vitalsForm.controls.patientId.touched && vitalsForm.controls.patientId.invalid) {
                <span class="mt-1 text-[10px] font-medium text-rose-600">Select the patient chart.</span>
              }
            </label>
            <label class="clinical-field">
              <span class="flex items-center gap-1">Temperature C <span class="text-rose-500">*</span></span>
              <input type="number" step="0.1" formControlName="temperatureC" [class]="fieldClasses(vitalsForm.controls.temperatureC)" placeholder="e.g. 37.0" />
              @if (vitalsForm.controls.temperatureC.touched && vitalsForm.controls.temperatureC.invalid) {
                <span class="mt-1 text-[10px] font-medium text-rose-600">Enter a temperature between 30°C and 45°C.</span>
              }
            </label>
            <label class="clinical-field">
              <span class="flex items-center gap-1">Pulse <span class="text-rose-500">*</span></span>
              <input type="number" formControlName="pulse" [class]="fieldClasses(vitalsForm.controls.pulse)" placeholder="bpm" />
              @if (vitalsForm.controls.pulse.touched && vitalsForm.controls.pulse.invalid) {
                <span class="mt-1 text-[10px] font-medium text-rose-600">Enter a pulse between 20 and 240 bpm.</span>
              }
            </label>
            <label class="clinical-field">
              <span class="flex items-center gap-1">Resp. Rate <span class="text-rose-500">*</span></span>
              <input type="number" formControlName="respiratoryRate" [class]="fieldClasses(vitalsForm.controls.respiratoryRate)" placeholder="breaths/min" />
              @if (vitalsForm.controls.respiratoryRate.touched && vitalsForm.controls.respiratoryRate.invalid) {
                <span class="mt-1 text-[10px] font-medium text-rose-600">Enter a rate between 5 and 80 breaths/min.</span>
              }
            </label>
            <label class="clinical-field">
              <span class="flex items-center gap-1">Blood Pressure <span class="text-rose-500">*</span></span>
              <input formControlName="bloodPressure" [class]="fieldClasses(vitalsForm.controls.bloodPressure)" placeholder="e.g. 120/80" />
              @if (vitalsForm.controls.bloodPressure.touched && vitalsForm.controls.bloodPressure.invalid) {
                <span class="mt-1 text-[10px] font-medium text-rose-600">Enter blood pressure, e.g. 120/80.</span>
              }
            </label>
            <label class="clinical-field">
              <span class="flex items-center gap-1">Weight Kg <span class="text-rose-500">*</span></span>
              <input type="number" step="0.1" formControlName="weightKg" [class]="fieldClasses(vitalsForm.controls.weightKg)" placeholder="e.g. 64" />
              @if (vitalsForm.controls.weightKg.touched && vitalsForm.controls.weightKg.invalid) {
                <span class="mt-1 text-[10px] font-medium text-rose-600">Enter a weight between 1 and 350 kg.</span>
              }
            </label>
            <label class="clinical-field">
              <span class="flex items-center gap-1">Height Cm <span class="text-rose-500">*</span></span>
              <input type="number" step="0.1" formControlName="heightCm" [class]="fieldClasses(vitalsForm.controls.heightCm)" placeholder="e.g. 170" />
              @if (vitalsForm.controls.heightCm.touched && vitalsForm.controls.heightCm.invalid) {
                <span class="mt-1 text-[10px] font-medium text-rose-600">Enter a height between 30 and 250 cm.</span>
              }
            </label>
          </div>

          <div class="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-end gap-3 rounded-b-3xl border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:px-8">
            <button type="button" (click)="goBack()" class="clinical-secondary">Discard</button>
            <button type="submit" class="clinical-submit bg-sky-600 hover:bg-sky-700">Record Vitals</button>
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
      box-shadow: 0 14px 30px rgba(14, 165, 233, .16);
      transition: all .18s ease;
    }

    .clinical-submit:hover {
      filter: brightness(1.05);
    }
  `]
})
export class VitalsPageComponent {
  store = inject(StoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  clinicalPatients = computed(() => this.store.clinicalWorklistPatients());
  selectedPatientId = signal('');

  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/5 transition-all';
  readonly inputClassesError = 'w-full px-4 py-2.5 bg-rose-50/40 border border-rose-300 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all';

  fieldClasses(control: AbstractControl | null): string {
    return control?.touched && control?.invalid ? this.inputClassesError : this.inputClasses;
  }

  vitalsForm = new FormGroup({
    patientId: new FormControl('', [Validators.required]),
    temperatureC: new FormControl<number | null>(null, [Validators.required, Validators.min(30), Validators.max(45)]),
    pulse: new FormControl<number | null>(null, [Validators.required, Validators.min(20), Validators.max(240)]),
    respiratoryRate: new FormControl<number | null>(null, [Validators.required, Validators.min(5), Validators.max(80)]),
    bloodPressure: new FormControl('', [Validators.required]),
    weightKg: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(350)]),
    heightCm: new FormControl<number | null>(null, [Validators.required, Validators.min(30), Validators.max(250)]),
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

    effect(() => {
      const patients = this.clinicalPatients();
      if (patients.length > 0) {
        const current = this.selectedPatientId();
        if (!current || !patients.some(p => p.id === current)) {
          const preferred = queryPatient && patients.some(p => p.id === queryPatient) ? queryPatient : patients[0].id;
          this.selectedPatientId.set(preferred);
          this.vitalsForm.patchValue({ patientId: preferred });
        }
      } else if (this.selectedPatientId()) {
        this.selectedPatientId.set('');
        this.vitalsForm.patchValue({ patientId: '' });
      }
    });
  }

  onPatientSelect(event: Event) {
    const patientId = (event.target as HTMLSelectElement).value;
    this.selectedPatientId.set(patientId);
    this.vitalsForm.patchValue({ patientId });
  }

  goBack() {
    this.router.navigate(['/clinical-ehr'], {
      queryParams: { tab: 'vitals', patient: this.selectedPatientId() || undefined },
    });
  }

  submitVitals() {
    if (this.vitalsForm.invalid) {
      this.vitalsForm.markAllAsTouched();
      this.store.addToast('error', 'Vitals Validation', 'All vital sign fields are required — temperature, pulse, respiratory rate, blood pressure, weight, and height.');
      return;
    }
    const value = this.vitalsForm.getRawValue();
    const patient = this.requirePatient(value.patientId);
    if (!patient) return;
    this.store.addVitals({
      patientId: patient.id,
      patientName: patient.name,
      patientMrn: patient.mrn,
      temperatureC: Number(value.temperatureC),
      pulse: Number(value.pulse),
      respiratoryRate: Number(value.respiratoryRate),
      bloodPressure: value.bloodPressure || '',
      weightKg: Number(value.weightKg),
      heightCm: Number(value.heightCm),
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
}
