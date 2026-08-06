import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import type { Medication, Patient } from '../../core/models';

@Component({
  selector: 'app-prescription-page',
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
            class="mb-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-600 transition-colors hover:bg-emerald-50">
            <span class="material-icons text-sm">arrow_back</span>
            Clinical Workspace
          </button>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Issue Prescription Order</h1>
          <p class="mt-1 text-xs text-slate-500">Medication order entry with dosage, frequency, duration, and dispensing information.</p>
        </div>
        <span class="hidden rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 sm:inline-flex">
          Medication Order
        </span>
      </div>

      @if (clinicalPatients().length === 0) {
        <div class="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <span class="material-icons text-4xl text-amber-500">lock_clock</span>
          <h2 class="mt-3 text-sm font-black text-amber-900">No clinically cleared patients</h2>
          <p class="mx-auto mt-2 max-w-md text-xs font-semibold leading-relaxed text-amber-800">
            Prescriptions can only be issued once Billing settles the patient's payment share.
            Cash patients are cleared by full payment; insured patients are cleared as soon as the copay is collected.
          </p>
          <button type="button" (click)="goBack()" class="mt-5 clinical-secondary">Back to Clinical Workspace</button>
        </div>
      } @else {
        <!-- Active patient strip -->
        @if (activePatient(); as patient) {
          <div class="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 font-black text-white uppercase">{{ patient.name.charAt(0) }}</div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-black text-slate-900">{{ patient.name }}</div>
              <div class="text-[10px] font-mono font-semibold text-slate-400">MRN: {{ patient.mrn }} · {{ patient.gender }} · {{ patient.bloodType }}</div>
            </div>
            <div class="hidden text-right md:block">
              <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">Order basket</div>
              <div class="text-xs font-bold text-slate-700">{{ prescriptionBasket().length || 1 }} Rx</div>
            </div>
          </div>
        }

        <form
          [formGroup]="prescriptionForm"
          (ngSubmit)="submitPrescription()"
          class="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
            <div class="space-y-6">
              <div class="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label class="clinical-field md:col-span-2">Patient Chart
                    <select formControlName="patientId" (change)="onPatientSelect($event)" [class]="inputClasses">
                      @for (p of clinicalPatients(); track p.id) {
                        <option [value]="p.id">{{ p.name }} - {{ p.mrn }}</option>
                      }
                    </select>
                  </label>
                  <label class="clinical-field">Start Date
                    <input type="date" formControlName="startDate" [class]="inputClasses" />
                  </label>
                </div>
              </div>

              <section class="clinical-order-section">
                <h4>1. Dosage instructions</h4>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label class="clinical-field md:col-span-3">Medication
                    <input formControlName="medName" list="medication-catalog" [class]="inputClasses" placeholder="Type medication name" />
                    <datalist id="medication-catalog">
                      @for (item of medicationCatalog; track item) {
                        <option [value]="item"></option>
                      }
                    </datalist>
                  </label>
                  <label class="clinical-field">Dose
                    <input formControlName="dosage" [class]="inputClasses" placeholder="500" />
                  </label>
                  <label class="clinical-field">Dose Unit
                    <select formControlName="doseUnit" [class]="inputClasses">
                      @for (unit of doseUnits; track unit) {
                        <option [value]="unit">{{ unit }}</option>
                      }
                    </select>
                  </label>
                  <label class="clinical-field">Route
                    <select formControlName="route" [class]="inputClasses">
                      @for (route of medicationRoutes; track route) {
                        <option [value]="route">{{ route }}</option>
                      }
                    </select>
                  </label>
                  <label class="clinical-field md:col-span-3">Frequency
                    <select formControlName="frequency" [class]="inputClasses">
                      @for (item of frequencies; track item) {
                        <option [value]="item">{{ item }}</option>
                      }
                    </select>
                  </label>
                  <label class="clinical-field md:col-span-3">Patient Instructions
                    <textarea formControlName="instructions" rows="3" [class]="inputClasses" placeholder="Additional dosing instructions, timing, food relation, safety advice"></textarea>
                  </label>
                  <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-600">
                    <input type="checkbox" formControlName="prn" class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    Take as needed
                  </label>
                  <label class="clinical-field md:col-span-2">PRN Reason
                    <input formControlName="prnReason" [class]="inputClasses" placeholder="e.g. Fever, pain, nausea" />
                  </label>
                </div>
              </section>

              <section class="clinical-order-section">
                <h4>2. Prescription duration</h4>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label class="clinical-field">Duration
                    <input type="number" formControlName="duration" [class]="inputClasses" placeholder="5" />
                  </label>
                  <label class="clinical-field">Duration Unit
                    <select formControlName="durationUnit" [class]="inputClasses">
                      <option>Days</option>
                      <option>Weeks</option>
                      <option>Months</option>
                    </select>
                  </label>
                  <label class="clinical-field">Indication
                    <input formControlName="indication" [class]="inputClasses" placeholder="Reason for treatment" />
                  </label>
                </div>
              </section>

              <section class="clinical-order-section">
                <h4>3. Dispensing information</h4>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label class="clinical-field">Quantity
                    <input type="number" formControlName="quantity" [class]="inputClasses" />
                  </label>
                  <label class="clinical-field">Refills
                    <input type="number" formControlName="refills" [class]="inputClasses" />
                  </label>
                  <label class="clinical-field">Urgency
                    <select formControlName="urgency" [class]="inputClasses">
                      <option>Routine</option>
                      <option>Urgent</option>
                      <option>Emergency</option>
                    </select>
                  </label>
                </div>
              </section>

              <div class="flex justify-end">
                <button type="button" (click)="addMedicationToPrescriptionBasket()" class="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-700 hover:bg-emerald-100">
                  <span class="material-icons text-sm">add_circle</span>
                  Add Medication
                </button>
              </div>
            </div>

            <aside class="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="mb-3 flex items-center justify-between">
                <h4 class="text-sm font-black text-slate-900">Order basket</h4>
                <span class="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">{{ prescriptionBasket().length || 1 }} Rx</span>
              </div>
              <div class="space-y-3">
                @for (med of prescriptionBasket(); track med.name + med.dosage; let i = $index) {
                  <div class="rounded-xl border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="text-xs font-black text-slate-900">{{ med.name }}</div>
                        <div class="mt-2 text-[11px] font-semibold text-slate-500">{{ med.dosage }} - {{ med.frequency }} - {{ med.duration }}</div>
                      </div>
                      <button type="button" (click)="removeMedicationFromPrescriptionBasket(i)" class="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <span class="material-icons text-sm">delete</span>
                      </button>
                    </div>
                    <div class="mt-3 rounded-lg bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-800">{{ med.instructions || 'No patient instruction entered.' }}</div>
                  </div>
                } @empty {
                  <div class="rounded-xl border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
                    <div class="text-xs font-black text-slate-900">{{ prescriptionForm.value.medName || 'Medication draft' }}</div>
                    <div class="mt-2 text-[11px] font-semibold text-slate-500">
                      Dose {{ prescriptionForm.value.dosage }} {{ prescriptionForm.value.doseUnit }} - {{ prescriptionForm.value.route }} - {{ prescriptionForm.value.frequency }}
                    </div>
                    <div class="mt-2 text-[11px] text-slate-500">
                      Duration {{ prescriptionForm.value.duration }} {{ prescriptionForm.value.durationUnit }} - Qty {{ prescriptionForm.value.quantity }} - Refills {{ prescriptionForm.value.refills }}
                    </div>
                    <div class="mt-3 rounded-lg bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-800">
                      {{ prescriptionForm.value.instructions || 'No patient instruction entered yet.' }}
                    </div>
                  </div>
                }
              </div>
            </aside>
          </div>

          <div class="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-end gap-3 rounded-b-3xl border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:px-8">
            <button type="button" (click)="goBack()" class="clinical-secondary">Discard</button>
            <button type="submit" class="clinical-submit bg-emerald-600 hover:bg-emerald-700">Issue Prescription</button>
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
      box-shadow: 0 14px 30px rgba(16, 185, 129, .16);
      transition: all .18s ease;
    }

    .clinical-submit:hover {
      filter: brightness(1.05);
    }
  `]
})
export class PrescriptionPageComponent {
  store = inject(StoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  clinicalPatients = computed(() => this.store.clinicalWorklistPatients());
  selectedPatientId = signal('');
  prescriptionBasket = signal<Medication[]>([]);

  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all';

  readonly medicationCatalog = ['Paracetamol', 'Amoxicillin', 'Azithromycin', 'Ceftriaxone', 'Metformin', 'Amlodipine', 'Omeprazole', 'Salbutamol', 'Losartan', 'Hydrochlorothiazide', 'ORS Sachet'];
  readonly doseUnits = ['mg', 'g', 'mcg', 'mL', 'tablet', 'capsule', 'puff', 'drop', 'sachet'];
  readonly medicationRoutes = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhalation', 'Ophthalmic', 'Otic'];
  readonly frequencies = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'As needed', 'Stat'];

  prescriptionForm = new FormGroup({
    patientId: new FormControl('', [Validators.required]),
    medName: new FormControl('Paracetamol', [Validators.required]),
    dosage: new FormControl('500', [Validators.required]),
    doseUnit: new FormControl('mg', [Validators.required]),
    route: new FormControl('Oral', [Validators.required]),
    frequency: new FormControl('Twice daily', [Validators.required]),
    duration: new FormControl(5, [Validators.required, Validators.min(1)]),
    durationUnit: new FormControl('Days', [Validators.required]),
    startDate: new FormControl(new Date().toISOString().split('T')[0], [Validators.required]),
    quantity: new FormControl(10, [Validators.required, Validators.min(1)]),
    refills: new FormControl(0, [Validators.required, Validators.min(0)]),
    indication: new FormControl(''),
    urgency: new FormControl('Routine', [Validators.required]),
    prn: new FormControl(false),
    prnReason: new FormControl(''),
    instructions: new FormControl('Take after meals'),
  });

  activePatient = computed(() => this.clinicalPatients().find(p => p.id === this.selectedPatientId()));

  constructor() {
    const queryPatient = this.route.snapshot.queryParamMap.get('patient') || '';

    effect(() => {
      const patients = this.clinicalPatients();
      if (patients.length > 0) {
        const current = this.selectedPatientId();
        if (!current || !patients.some(p => p.id === current)) {
          const preferred = queryPatient && patients.some(p => p.id === queryPatient) ? queryPatient : patients[0].id;
          this.selectedPatientId.set(preferred);
          this.prescriptionForm.patchValue({ patientId: preferred });
        }
      } else if (this.selectedPatientId()) {
        this.selectedPatientId.set('');
        this.prescriptionForm.patchValue({ patientId: '' });
      }
    });
  }

  onPatientSelect(event: Event) {
    const patientId = (event.target as HTMLSelectElement).value;
    this.selectedPatientId.set(patientId);
    this.prescriptionForm.patchValue({ patientId });
  }

  goBack() {
    this.router.navigate(['/clinical-ehr'], {
      queryParams: { tab: 'prescriptions', patient: this.selectedPatientId() || undefined },
    });
  }

  submitPrescription() {
    const medications = this.prescriptionBasket().length > 0
      ? this.prescriptionBasket()
      : [this.medicationFromPrescriptionForm()];

    if (this.prescriptionForm.invalid || medications.some(item => !item.name.trim())) {
      this.prescriptionForm.markAllAsTouched();
      this.store.addToast('error', 'Prescription Validation', 'Patient, medication name, dose, frequency, duration, and quantity are required.');
      return;
    }
    const value = this.prescriptionForm.getRawValue();
    const patient = this.requirePatient(value.patientId);
    if (!patient) return;
    this.store.addPrescription({
      patientId: patient.id,
      patientName: patient.name,
      patientMrn: patient.mrn,
      doctorId: this.currentDoctorId(),
      doctorName: this.currentDoctorName(),
      medications,
    });
    this.goBack();
  }

  addMedicationToPrescriptionBasket() {
    if (this.prescriptionForm.controls.medName.invalid ||
        this.prescriptionForm.controls.dosage.invalid ||
        this.prescriptionForm.controls.frequency.invalid ||
        this.prescriptionForm.controls.duration.invalid ||
        this.prescriptionForm.controls.quantity.invalid) {
      this.prescriptionForm.markAllAsTouched();
      this.store.addToast('error', 'Medication Validation', 'Medication name, dose, frequency, duration, and quantity are required before adding to the basket.');
      return;
    }

    const medication = this.medicationFromPrescriptionForm();
    if (!medication.name.trim()) {
      this.store.addToast('error', 'Medication Required', 'Type the medication name before adding it to the basket.');
      return;
    }

    this.prescriptionBasket.update(current => [...current, medication]);
    this.resetPrescriptionDraft(false);
  }

  removeMedicationFromPrescriptionBasket(index: number) {
    this.prescriptionBasket.update(current => current.filter((_, itemIndex) => itemIndex !== index));
  }

  private medicationFromPrescriptionForm(): Medication {
    const value = this.prescriptionForm.getRawValue();
    return {
      name: value.medName || '',
      dosage: `${value.dosage || ''} ${value.doseUnit || ''}`.trim(),
      frequency: value.frequency || '',
      duration: `${value.duration || ''} ${value.durationUnit || ''}`.trim(),
      instructions: [
        `${value.route || 'Oral'} route`,
        value.instructions || 'As directed',
        value.indication ? `Indication: ${value.indication}` : '',
        value.prn ? `PRN: ${value.prnReason || 'As needed'}` : '',
        `Qty ${value.quantity || 0}, Refills ${value.refills || 0}, ${value.urgency || 'Routine'}`,
      ].filter(Boolean).join('. '),
    };
  }

  private resetPrescriptionDraft(clearPatient = true) {
    const patientId = clearPatient ? this.selectedPatientId() : this.prescriptionForm.value.patientId;
    this.prescriptionForm.patchValue({
      patientId: patientId || '',
      medName: '',
      dosage: '',
      doseUnit: 'mg',
      route: 'Oral',
      frequency: 'Twice daily',
      duration: 5,
      durationUnit: 'Days',
      startDate: new Date().toISOString().split('T')[0],
      quantity: 10,
      refills: 0,
      indication: '',
      urgency: 'Routine',
      prn: false,
      prnReason: '',
      instructions: '',
    });
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
