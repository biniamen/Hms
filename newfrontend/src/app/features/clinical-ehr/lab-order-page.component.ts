import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import type { DiagnosticTest, Patient } from '../../core/models';

@Component({
  selector: 'app-lab-order-page',
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
            class="mb-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black uppercase tracking-widest text-purple-600 transition-colors hover:bg-purple-50">
            <span class="material-icons text-sm">arrow_back</span>
            Clinical Workspace
          </button>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Submit Diagnostic Order</h1>
          <p class="mt-1 text-xs text-slate-500">Laboratory and imaging request from the priced diagnostic catalog.</p>
        </div>
        <span class="hidden rounded-full bg-purple-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-purple-700 sm:inline-flex">
          Diagnostics
        </span>
      </div>

      @if (clinicalPatients().length === 0) {
        <div class="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <span class="material-icons text-4xl text-amber-500">lock_clock</span>
          <h2 class="mt-3 text-sm font-black text-amber-900">No clinically cleared patients</h2>
          <p class="mx-auto mt-2 max-w-md text-xs font-semibold leading-relaxed text-amber-800">
            Diagnostic orders can only be submitted once Billing settles the patient's payment share.
            Cash patients are cleared by full payment; insured patients are cleared as soon as the copay is collected.
          </p>
          <button type="button" (click)="goBack()" class="mt-5 clinical-secondary">Back to Clinical Workspace</button>
        </div>
      } @else {
        <!-- Active patient strip -->
        @if (activePatient(); as patient) {
          <div class="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600 font-black text-white uppercase">{{ patient.name.charAt(0) }}</div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-black text-slate-900">{{ patient.name }}</div>
              <div class="text-[10px] font-mono font-semibold text-slate-400">MRN: {{ patient.mrn }} · {{ patient.gender }} · {{ patient.bloodType }}</div>
            </div>
            <div class="hidden text-right md:block">
              <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">Order basket</div>
              <div class="text-xs font-bold text-slate-700">{{ selectedDiagnostics().length }} selected</div>
            </div>
          </div>
        }

        <form
          [formGroup]="labForm"
          (ngSubmit)="submitLabOrder()"
          class="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
            <div class="space-y-6">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                <label class="clinical-field md:col-span-2">Patient Chart
                  <select formControlName="patientId" (change)="onPatientSelect($event)" [class]="inputClasses">
                    @for (p of clinicalPatients(); track p.id) {
                      <option [value]="p.id">{{ p.name }} - {{ p.mrn }}</option>
                    }
                  </select>
                </label>
                <label class="clinical-field">Priority
                  <select formControlName="priority" [class]="inputClasses">
                    <option>Routine</option>
                    <option>Urgent</option>
                    <option>STAT</option>
                  </select>
                </label>
                <label class="clinical-field">Specimen
                  <select formControlName="specimenType" [class]="inputClasses">
                    <option>Whole blood</option>
                    <option>Serum</option>
                    <option>Plasma</option>
                    <option>Urine</option>
                    <option>Stool</option>
                    <option>Sputum</option>
                    <option>Imaging only</option>
                  </select>
                </label>
              </div>

              @for (group of diagnosticOrderGroups(); track group.category) {
                <section class="clinical-order-section">
                  <div class="mb-3 flex items-center justify-between">
                    <h4>{{ group.category }}</h4>
                    <span class="text-[10px] font-bold uppercase text-slate-400">{{ group.items.length }} options</span>
                  </div>
                  <div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    @for (item of group.items; track item.id) {
                      <button
                        type="button"
                        (click)="toggleDiagnostic(item)"
                        [class]="isDiagnosticSelected(item.id) ? 'border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-100' : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50/40'"
                        class="flex min-h-14 items-start gap-3 rounded-xl border p-3 text-left transition-all">
                        <span class="material-icons mt-0.5 text-base">{{ group.category === 'Radiology' ? 'radiology' : 'check_box' }}</span>
                        <span>
                          <strong class="block text-xs">{{ item.testName }}</strong>
                          <span class="text-[10px] font-semibold opacity-70">{{ item.subGroup }} - {{ item.specimenType || 'Specimen as applicable' }}</span>
                          <span class="mt-1 block text-[10px] font-bold text-slate-400">Ref: {{ item.referenceRange || 'Report based' }} {{ item.unit }}</span>
                        </span>
                      </button>
                    }
                  </div>
                </section>
              }

              <label class="clinical-field">Clinical Note / Reason
                <textarea formControlName="clinicalNote" rows="3" [class]="inputClasses" placeholder="Clinical indication, symptoms, provisional diagnosis, sample note"></textarea>
              </label>
            </div>

            <aside class="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="mb-3 flex items-center justify-between">
                <h4 class="text-sm font-black text-slate-900">Diagnostic basket</h4>
                <span class="rounded-full bg-purple-100 px-2 py-1 text-[10px] font-black text-purple-700">{{ selectedDiagnostics().length }} selected</span>
              </div>
              <div class="space-y-2">
                @for (item of selectedDiagnostics(); track item.id) {
                  <div class="rounded-xl border-l-4 border-purple-500 bg-white p-3 text-xs font-bold text-slate-700 shadow-sm">
                    <div>{{ item.testName }}</div>
                    <div class="mt-1 text-[10px] font-semibold text-slate-400">{{ item.groupName }} / {{ item.subGroup }} - Ref: {{ item.referenceRange || 'Report based' }}</div>
                  </div>
                } @empty {
                  <div class="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-[11px] font-bold text-slate-400">
                    Select at least one laboratory or imaging order.
                  </div>
                }
              </div>
            </aside>
          </div>

          <div class="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-end gap-3 rounded-b-3xl border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:px-8">
            <button type="button" (click)="goBack()" class="clinical-secondary">Discard</button>
            <button type="submit" class="clinical-submit bg-purple-600 hover:bg-purple-700">Submit Diagnostic Order</button>
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
      box-shadow: 0 14px 30px rgba(168, 85, 247, .16);
      transition: all .18s ease;
    }

    .clinical-submit:hover {
      filter: brightness(1.05);
    }
  `]
})
export class LabOrderPageComponent {
  store = inject(StoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  clinicalPatients = computed(() => this.store.clinicalWorklistPatients());
  selectedPatientId = signal('');

  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all';

  diagnosticOrderGroups = computed(() => {
    const groups = new Map<string, DiagnosticTest[]>();
    for (const test of this.store.diagnosticTests().filter(item => item.isActive)) {
      const key = test.groupName || 'Laboratory';
      groups.set(key, [...(groups.get(key) || []), test]);
    }

    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      items: items.sort((a, b) =>
        a.subGroup.localeCompare(b.subGroup) ||
        a.sortOrder - b.sortOrder ||
        a.testName.localeCompare(b.testName)),
    }));
  });

  selectedDiagnosticIds = signal<string[]>([]);

  selectedDiagnostics = computed(() =>
    this.selectedDiagnosticIds()
      .map(id => this.store.diagnosticTests().find(test => test.id === id))
      .filter((test): test is DiagnosticTest => !!test));

  labForm = new FormGroup({
    patientId: new FormControl('', [Validators.required]),
    category: new FormControl('Hematology', [Validators.required]),
    priority: new FormControl('Routine', [Validators.required]),
    specimenType: new FormControl('Whole blood', [Validators.required]),
    clinicalNote: new FormControl(''),
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
          this.labForm.patchValue({ patientId: preferred });
        }
      } else if (this.selectedPatientId()) {
        this.selectedPatientId.set('');
        this.labForm.patchValue({ patientId: '' });
      }
    });
  }

  onPatientSelect(event: Event) {
    const patientId = (event.target as HTMLSelectElement).value;
    this.selectedPatientId.set(patientId);
    this.labForm.patchValue({ patientId });
  }

  goBack() {
    this.router.navigate(['/clinical-ehr'], {
      queryParams: { tab: 'labs', patient: this.selectedPatientId() || undefined },
    });
  }

  toggleDiagnostic(test: DiagnosticTest) {
    this.labForm.patchValue({
      category: test.groupName,
      specimenType: test.specimenType || this.labForm.value.specimenType || 'Whole blood',
    });
    this.selectedDiagnosticIds.update(current =>
      current.includes(test.id) ? current.filter(item => item !== test.id) : [...current, test.id]
    );
  }

  isDiagnosticSelected(id: string): boolean {
    return this.selectedDiagnosticIds().includes(id);
  }

  submitLabOrder() {
    if (this.labForm.invalid) {
      this.labForm.markAllAsTouched();
      return;
    }
    const selectedTests = this.selectedDiagnostics();
    if (selectedTests.length === 0) {
      this.store.addToast('error', 'Diagnostic Order Required', 'Select at least one laboratory or imaging order.');
      return;
    }
    const value = this.labForm.getRawValue();
    const patient = this.requirePatient(value.patientId);
    if (!patient) return;
    this.store.addLabOrder({
      patientId: patient.id,
      patientName: patient.name,
      patientMrn: patient.mrn,
      doctorId: this.currentDoctorId(),
      doctorName: this.currentDoctorName(),
      testName: selectedTests.map(test => test.testName).join(', '),
      testCatalogIds: selectedTests.map(test => test.id),
      category: selectedTests[0]?.groupName || value.category || 'Biochemistry',
      priority: value.priority || 'Routine',
      specimenType: value.specimenType || selectedTests[0]?.specimenType || 'Whole blood',
      clinicalNote: [
        value.clinicalNote || '',
        `Requested panels: ${selectedTests.map(test => `${test.groupName}/${test.subGroup}/${test.testName}`).join('; ')}`
      ].filter(Boolean).join('\n'),
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
