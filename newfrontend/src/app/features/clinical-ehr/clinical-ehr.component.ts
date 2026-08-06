import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { StoreService } from '../../core/services/store.service';
import type { ClinicalDiagnosis, ClinicalVitalEntry, LabOrder, MedicalRecord, Prescription, UserRole } from '../../core/models';

type ClinicalTab = 'encounters' | 'vitals' | 'diagnoses' | 'prescriptions' | 'labs';

@Component({
  selector: 'app-clinical-ehr',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Always mounted so child form pages can render into it reliably; it renders nothing when no child route is active. -->
    <router-outlet></router-outlet>

    @if (!isFormRoute()) {
      <div class="space-y-6 animate-fade-in pb-20">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.24em] text-teal-600">Clinical Workspace</p>
            <h1 class="mt-1 text-xl sm:text-2xl font-bold text-slate-900 font-display">Clinical EHR & Care Orders</h1>
            <p class="mt-1 max-w-3xl text-xs text-slate-500">
              Patient history, SOAP encounters, vitals, diagnoses, prescriptions, and diagnostic orders in one doctor workspace.
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            @if (canCreate('encounters')) {
              <button (click)="openFormPage('encounters')" class="clinical-action bg-slate-900 text-white shadow-slate-200 hover:bg-slate-800">
                <span class="material-icons text-base">note_add</span>
                Encounter
              </button>
            }
            @if (canCreate('vitals')) {
              <button (click)="openFormPage('vitals')" class="clinical-action bg-sky-600 text-white shadow-sky-100 hover:bg-sky-700">
                <span class="material-icons text-base">monitor_heart</span>
                Vitals
              </button>
            }
            @if (canCreate('diagnoses')) {
              <button (click)="openFormPage('diagnoses')" class="clinical-action bg-violet-600 text-white shadow-violet-100 hover:bg-violet-700">
                <span class="material-icons text-base">diagnosis</span>
                Diagnosis
              </button>
            }
            @if (canCreate('prescriptions')) {
              <button (click)="openFormPage('prescriptions')" class="clinical-action bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700">
                <span class="material-icons text-base">medication</span>
                Prescription
              </button>
            }
            @if (canCreate('labs')) {
              <button (click)="openFormPage('labs')" class="clinical-action bg-purple-600 text-white shadow-purple-100 hover:bg-purple-700">
                <span class="material-icons text-base">biotech</span>
                Diagnostic Order
              </button>
            }
            @if (canCreate('encounters')) {
              <button (click)="printMedicalCertificate()" class="clinical-action bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                <span class="material-icons text-base">assignment</span>
                Medical Certificate
              </button>
            }
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          @for (metric of clinicalMetrics(); track metric.label) {
            <button
              type="button"
              (click)="activeTab.set(metric.tab)"
              [class]="activeTab() === metric.tab ? metric.activeClass : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'"
              class="rounded-3xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5">
              <div class="flex items-center justify-between gap-3">
                <span class="text-[10px] font-black uppercase tracking-widest">{{ metric.label }}</span>
                <span class="material-icons text-base">{{ metric.icon }}</span>
              </div>
              <strong class="mt-3 block text-3xl font-black">{{ metric.value }}</strong>
              <span class="mt-1 block text-[10px] font-semibold opacity-70">{{ metric.hint }}</span>
            </button>
          }
        </div>

        @if (clinicalPatients().length === 0) {
          <div class="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm shadow-sm">
            <div class="flex items-start gap-3">
              <span class="material-icons text-amber-600">lock_clock</span>
              <div>
                <div class="font-black text-amber-900">No clinically cleared patients</div>
                <p class="mt-1 text-xs font-semibold leading-relaxed text-amber-800">
                  Assigned patients appear here after Billing settles the patient's payment share. Cash patients are cleared by full payment; insured patients are cleared as soon as the copay is collected, while the insurer's portion is settled by claim.
                </p>
              </div>
            </div>
          </div>
        }

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
          <div class="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                <span class="material-icons">folder_shared</span>
              </div>
              <div>
                <div class="text-[11px] font-black uppercase tracking-wider text-slate-900">Active Patient Chart</div>
                <div class="text-[10px] text-slate-400">History and orders filter by selected MRN</div>
              </div>
            </div>
            <select
              [value]="selectedPatientId()"
              (change)="onPatientSelect($event)"
              class="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-800 transition-all focus:border-teal-500 focus:outline-none">
              @for (p of clinicalPatients(); track p.id) {
                <option [value]="p.id">{{ p.name }} - {{ p.mrn }}</option>
              }
            </select>

            @if (activePatient(); as patient) {
              <div class="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div class="text-sm font-black text-slate-900">{{ patient.name }}</div>
                <div class="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                  <span>Blood: {{ patient.bloodType }}</span>
                  <span>{{ patient.gender }}</span>
                  <span>{{ patient.phone }}</span>
                  <span>{{ patient.status }}</span>
                </div>
                <div class="rounded-xl bg-white p-3 text-[10px] text-slate-500">
                  <strong class="block text-slate-700">Current vitals</strong>
                  @if (latestVitals(); as vitals) {
                    BP {{ vitals.bloodPressure }} / HR {{ vitals.pulse }} / Temp {{ vitals.temperatureC }} C
                  } @else {
                    <span class="italic text-slate-400">No vitals recorded yet.</span>
                  }
                </div>
              </div>
            }
          </div>

          <div class="rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <div class="flex flex-col gap-4 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
              <div class="flex flex-wrap gap-2">
                @for (tab of tabs; track tab.id) {
                  <button
                    type="button"
                    (click)="activeTab.set(tab.id)"
                    [class]="activeTab() === tab.id ? tab.activeClass : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'"
                    class="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all">
                    {{ tab.label }}
                  </button>
                }
              </div>
              <div class="flex flex-wrap gap-2">
                <button (click)="exportCurrentTab()" class="clinical-secondary">Excel</button>
                <button (click)="printCurrentTab(true)" class="clinical-secondary">PDF</button>
                <button (click)="printCurrentTab(false)" class="clinical-secondary">Print</button>
              </div>
            </div>

            <div class="overflow-x-auto p-4">
              @switch (activeTab()) {
                @case ('encounters') {
                  <table class="clinical-table">
                    <thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Diagnosis</th><th>Clinical Note</th><th>Action</th></tr></thead>
                    <tbody>
                      @for (rec of visibleEncounters(); track rec.id) {
                        <tr>
                          <td>{{ rec.date }}</td>
                          <td>{{ store.patientDisplayName(rec.patientId) }}</td>
                          <td>{{ store.doctorDisplayName(rec.doctorId) }}</td>
                          <td>{{ rec.diagnosis }}</td>
                          <td class="max-w-md whitespace-pre-wrap">{{ rec.clinicalNotes }}</td>
                          <td><button (click)="focusPatient(rec.patientId)" class="clinical-row-btn">Detail</button></td>
                        </tr>
                      } @empty {
                        <tr><td colspan="6" class="empty-cell">No encounters found for this patient.</td></tr>
                      }
                    </tbody>
                  </table>
                }

                @case ('vitals') {
                  <table class="clinical-table">
                    <thead><tr><th>Recorded</th><th>Patient</th><th>Temp</th><th>Pulse</th><th>RR</th><th>BP</th><th>Weight</th><th>Height</th><th>Action</th></tr></thead>
                    <tbody>
                      @for (row of visibleVitals(); track row.id) {
                        <tr>
                          <td>{{ row.recordedAtUtc | date: 'short' }}</td>
                          <td>{{ store.patientDisplayName(row.patientId) }}</td>
                          <td>{{ row.temperatureC }} C</td>
                          <td>{{ row.pulse }}</td>
                          <td>{{ row.respiratoryRate }}</td>
                          <td>{{ row.bloodPressure }}</td>
                          <td>{{ row.weightKg }} kg</td>
                          <td>{{ row.heightCm }} cm</td>
                          <td><button (click)="focusPatient(row.patientId)" class="clinical-row-btn">Detail</button></td>
                        </tr>
                      } @empty {
                        <tr><td colspan="9" class="empty-cell">No vitals found for this patient.</td></tr>
                      }
                    </tbody>
                  </table>
                }

                @case ('diagnoses') {
                  <table class="clinical-table">
                    <thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Code</th><th>Description</th><th>Severity</th><th>Action</th></tr></thead>
                    <tbody>
                      @for (row of visibleDiagnoses(); track row.id) {
                        <tr>
                          <td>{{ row.diagnosedAtUtc | date: 'short' }}</td>
                          <td>{{ store.patientDisplayName(row.patientId) }}</td>
                          <td>{{ store.doctorDisplayName(row.doctorId) }}</td>
                          <td class="font-mono font-bold">{{ row.code }}</td>
                          <td>{{ row.description }}</td>
                          <td><span class="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase text-violet-700">{{ row.severity }}</span></td>
                          <td><button (click)="focusPatient(row.patientId)" class="clinical-row-btn">Detail</button></td>
                        </tr>
                      } @empty {
                        <tr><td colspan="7" class="empty-cell">No diagnoses found for this patient.</td></tr>
                      }
                    </tbody>
                  </table>
                }

                @case ('prescriptions') {
                  <table class="clinical-table">
                    <thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Medication</th><th>Instructions</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      @for (rx of visiblePrescriptions(); track rx.id) {
                        <tr>
                          <td>{{ rx.date }}</td>
                          <td>{{ store.patientDisplayName(rx.patientId) }}</td>
                          <td>{{ store.doctorDisplayName(rx.doctorId) }}</td>
                          <td>{{ medicationSummary(rx) }}</td>
                          <td>{{ instructionSummary(rx) }}</td>
                          <td><span class="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">{{ rx.status }}</span></td>
                          <td><button (click)="printPrescription(rx)" class="clinical-row-btn">Rx</button></td>
                        </tr>
                      } @empty {
                        <tr><td colspan="7" class="empty-cell">No prescriptions found for this patient.</td></tr>
                      }
                    </tbody>
                  </table>
                }

                @case ('labs') {
                  <table class="clinical-table">
                    <thead><tr><th>Ordered</th><th>Patient</th><th>Doctor</th><th>Category</th><th>Order</th><th>Status</th><th>Result</th><th>Action</th></tr></thead>
                    <tbody>
                      @for (lab of visibleLabs(); track lab.id) {
                        <tr>
                          <td>{{ lab.orderedDate }}</td>
                          <td>{{ store.patientDisplayName(lab.patientId) }}</td>
                          <td>{{ store.doctorDisplayName(lab.doctorId) }}</td>
                          <td>{{ lab.category }}</td>
                          <td>{{ lab.testName }}</td>
                          <td><span class="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase text-purple-700">{{ lab.status }}</span></td>
                          <td>{{ lab.result || 'Pending result' }}</td>
                          <td class="space-x-1">
                            <button (click)="printLabOrder(lab)" class="clinical-row-btn">Print</button>
                            <button (click)="openLabDesk()" class="clinical-row-btn">Result</button>
                          </td>
                        </tr>
                      } @empty {
                        <tr><td colspan="8" class="empty-cell">No diagnostic orders found for this patient.</td></tr>
                      }
                    </tbody>
                  </table>
                }
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .clinical-action {
      display: inline-flex;
      min-height: 2.5rem;
      align-items: center;
      gap: .5rem;
      border-radius: 1rem;
      padding: .625rem 1rem;
      font-size: .75rem;
      font-weight: 800;
      transition: all .18s ease;
      box-shadow: 0 12px 28px rgba(15, 23, 42, .08);
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

    .clinical-table {
      width: 100%;
      min-width: 980px;
      text-align: left;
      font-size: .75rem;
    }

    .clinical-table th {
      background: rgb(248 250 252);
      padding: .75rem 1rem;
      font-size: .625rem;
      font-weight: 900;
      color: rgb(100 116 139);
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .clinical-table td {
      border-top: 1px solid rgb(241 245 249);
      padding: .9rem 1rem;
      color: rgb(51 65 85);
      vertical-align: top;
    }

    .clinical-row-btn {
      border-radius: .65rem;
      border: 1px solid rgb(226 232 240);
      background: white;
      padding: .4rem .7rem;
      font-size: .65rem;
      font-weight: 900;
      color: rgb(15 118 110);
    }

    .empty-cell {
      padding: 2.5rem 1rem !important;
      text-align: center;
      font-weight: 800;
      color: rgb(148 163 184) !important;
    }
  `]
})
export class ClinicalEhrComponent {
  store = inject(StoreService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  activeTab = signal<ClinicalTab>('encounters');
  selectedPatientId = signal('');
  isFormRoute = signal(false);

  clinicalPatients = computed(() => this.store.clinicalWorklistPatients());
  private clinicalPatientIds = computed(() => new Set(this.clinicalPatients().map(patient => patient.id)));

  readonly tabs: Array<{ id: ClinicalTab; label: string; activeClass: string }> = [
    { id: 'encounters', label: 'Encounters', activeClass: 'bg-slate-900 text-white font-black' },
    { id: 'vitals', label: 'Vitals', activeClass: 'bg-sky-600 text-white font-black' },
    { id: 'diagnoses', label: 'Diagnoses', activeClass: 'bg-violet-600 text-white font-black' },
    { id: 'prescriptions', label: 'Prescriptions', activeClass: 'bg-emerald-600 text-white font-black' },
    { id: 'labs', label: 'Lab Requests', activeClass: 'bg-purple-600 text-white font-black' },
  ];

  activePatient = computed(() => this.clinicalPatients().find(p => p.id === this.selectedPatientId()));
  latestVitals = computed(() => {
    const patient = this.activePatient();
    if (!patient) return undefined;
    return this.store.clinicalVitals()
      .filter(v => v.patientId === patient.id)
      .sort((a, b) => b.recordedAtUtc.localeCompare(a.recordedAtUtc))[0];
  });
  visibleEncounters = computed(() => this.store.medicalRecords().filter(row => row.patientId === this.selectedPatientId()));
  visibleVitals = computed(() => this.store.clinicalVitals().filter(row => row.patientId === this.selectedPatientId()));
  visibleDiagnoses = computed(() => this.store.clinicalDiagnoses().filter(row => row.patientId === this.selectedPatientId()));
  visiblePrescriptions = computed(() => this.store.prescriptions().filter(row => row.patientId === this.selectedPatientId()));
  visibleLabs = computed(() => this.store.labOrders().filter(row => row.patientId === this.selectedPatientId()));

  clinicalMetrics = computed(() => {
    const patientIds = this.clinicalPatientIds();
    return [
      { tab: 'encounters' as ClinicalTab, label: 'Encounters', value: this.store.medicalRecords().filter(row => patientIds.has(row.patientId)).length, hint: 'SOAP notes', icon: 'history_edu', activeClass: 'bg-slate-900 border-slate-900 text-white' },
      { tab: 'vitals' as ClinicalTab, label: 'Vitals', value: this.store.clinicalVitals().filter(row => patientIds.has(row.patientId)).length, hint: 'Recorded observations', icon: 'monitor_heart', activeClass: 'bg-sky-600 border-sky-600 text-white' },
      { tab: 'diagnoses' as ClinicalTab, label: 'Diagnoses', value: this.store.clinicalDiagnoses().filter(row => patientIds.has(row.patientId)).length, hint: 'Problem list', icon: 'diagnosis', activeClass: 'bg-violet-600 border-violet-600 text-white' },
      { tab: 'prescriptions' as ClinicalTab, label: 'Prescriptions', value: this.store.prescriptions().filter(row => patientIds.has(row.patientId)).length, hint: 'Medication orders', icon: 'medication', activeClass: 'bg-emerald-600 border-emerald-600 text-white' },
      { tab: 'labs' as ClinicalTab, label: 'Lab Requests', value: this.store.labOrders().filter(row => patientIds.has(row.patientId)).length, hint: 'Diagnostics', icon: 'biotech', activeClass: 'bg-purple-600 border-purple-600 text-white' },
    ];
  });

  constructor() {
    // Set from the current URL synchronously so a deep link straight into a form
    // page never flashes the workspace before NavigationEnd fires.
    this.isFormRoute.set(this.isClinicalFormUrl(this.router.url));

    effect(() => {
      const patients = this.clinicalPatients();
      if (patients.length > 0 && (!this.selectedPatientId() || !patients.some(patient => patient.id === this.selectedPatientId()))) {
        this.selectedPatientId.set(patients[0].id);
      } else if (patients.length === 0 && this.selectedPatientId()) {
        this.selectedPatientId.set('');
      }
    });

    // Track when a child form page is open (hide the workspace behind the page) and
    // restore the tab + patient chart when the clinician returns from a form page.
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      const url = this.router.url;
      this.isFormRoute.set(this.isClinicalFormUrl(url));

      if (!this.isClinicalFormUrl(url)) {
        const params = this.router.parseUrl(url).queryParamMap;
        const tab = params.get('tab');
        const patient = params.get('patient');
        if (tab && this.tabs.some(item => item.id === tab)) {
          this.activeTab.set(tab as ClinicalTab);
        }
        if (patient && this.clinicalPatients().some(item => item.id === patient)) {
          this.selectedPatientId.set(patient);
        }
      }
    });
  }

  onPatientSelect(event: Event) {
    this.selectedPatientId.set((event.target as HTMLSelectElement).value);
  }

  focusPatient(patientId: string) {
    this.selectedPatientId.set(patientId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  canCreate(tab: ClinicalTab): boolean {
    const role = this.store.currentUser()?.role as UserRole | undefined;
    if (!role) return false;
    if (role === 'ADMIN') return true;
    if (tab === 'vitals') return role === 'DOCTOR' || role === 'NURSE';
    return role === 'DOCTOR';
  }

  openFormPage(tab: ClinicalTab) {
    if (this.clinicalPatients().length === 0) {
      this.store.addToast('warning', 'Billing Clearance Required', 'The patient\'s payment share must be settled before clinical documentation, vitals, prescription, or diagnostic order entry.');
      return;
    }
    const patientId = this.selectedPatientId() || this.clinicalPatients()[0]?.id || '';
    const routes: Record<ClinicalTab, string> = {
      encounters: '/clinical-ehr/encounter',
      vitals: '/clinical-ehr/vitals',
      diagnoses: '/clinical-ehr/diagnosis',
      prescriptions: '/clinical-ehr/prescription',
      labs: '/clinical-ehr/lab-order',
    };
    this.router.navigate([routes[tab]], { queryParams: { patient: patientId } });
  }

  private isClinicalFormUrl(url: string): boolean {
    const path = url.split('?')[0];
    return ['/clinical-ehr/encounter', '/clinical-ehr/vitals', '/clinical-ehr/diagnosis', '/clinical-ehr/prescription', '/clinical-ehr/lab-order']
      .some(prefix => path === prefix || path.startsWith(prefix + '/'));
  }

  openLabDesk() {
    this.router.navigate(['/laboratory']);
  }

  medicationSummary(rx: Prescription): string {
    return rx.medications.map(item => `${item.name} ${item.dosage}`.trim()).join(', ');
  }

  instructionSummary(rx: Prescription): string {
    return rx.medications.map(item => `${item.frequency}, ${item.duration}. ${item.instructions}`.trim()).join(' | ');
  }

  printPrescription(rx: Prescription) {
    const patientName = this.store.patientDisplayName(rx.patientId);
    const patientMrn = this.store.patientMrn(rx.patientId);
    const doctorName = this.store.doctorDisplayName(rx.doctorId);
    const rows = rx.medications.map((med, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.escapeHtml(med.name)}</td>
        <td>${this.escapeHtml(med.dosage)}</td>
        <td>${this.escapeHtml(med.frequency)}</td>
        <td>${this.escapeHtml(med.duration)}</td>
        <td>${this.escapeHtml(med.instructions)}</td>
      </tr>
    `).join('');
    const html = `
      <h1>Prescription Order</h1>
      <table>
        <tr><th>Patient</th><td>${this.escapeHtml(patientName)} (${this.escapeHtml(patientMrn)})</td><th>Doctor</th><td>${this.escapeHtml(doctorName)}</td></tr>
        <tr><th>Date</th><td>${this.escapeHtml(rx.date)}</td><th>Status</th><td>${this.escapeHtml(rx.status)}</td></tr>
      </table>
      <h1 style="font-size:16px;text-align:left;margin-top:22px;">Medication Orders</h1>
      <table>
        <thead><tr><th>No</th><th>Medication</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    this.openPrintableHtml(html, 'Prescription Order', patientName, patientMrn);
  }

  printLabOrder(lab: LabOrder) {
    const patientName = this.store.patientDisplayName(lab.patientId);
    const patientMrn = this.store.patientMrn(lab.patientId);
    const doctorName = this.store.doctorDisplayName(lab.doctorId);
    this.openPrintWindow('Diagnostic Order', [
      ['Patient', `${patientName} (${patientMrn})`],
      ['Doctor', doctorName],
      ['Category', lab.category],
      ['Priority', lab.priority || 'Routine'],
      ['Specimen', lab.specimenType || 'As applicable'],
      ['Order', lab.testName],
      ['Clinical Note', lab.clinicalNote || 'Not specified'],
      ['Status', lab.status],
      ['Result', lab.result || 'Pending'],
    ], patientName, patientMrn);
  }

  printMedicalCertificate() {
    const patient = this.activePatient();
    if (!patient) {
      this.store.addToast('error', 'Patient Required', 'Select a patient before printing a medical certificate.');
      return;
    }
    const latestDiagnosis = this.visibleDiagnoses()[0]?.description || this.visibleEncounters()[0]?.diagnosis || 'Medical evaluation completed';
    const html = `
      <h1>Medical Certificate</h1>
      <p class="lead">This is to certify that <strong>${this.escapeHtml(patient.name)}</strong>, MRN <strong>${this.escapeHtml(patient.mrn)}</strong>, was evaluated at Bethzatha General Hospital.</p>
      <table>
        <tr><th>Patient Name</th><td>${this.escapeHtml(patient.name)}</td><th>MRN</th><td>${this.escapeHtml(patient.mrn)}</td></tr>
        <tr><th>Gender</th><td>${this.escapeHtml(patient.gender)}</td><th>Blood Type</th><td>${this.escapeHtml(patient.bloodType)}</td></tr>
        <tr><th>Diagnosis / Assessment</th><td colspan="3">${this.escapeHtml(latestDiagnosis)}</td></tr>
        <tr><th>Recommended Rest</th><td colspan="3">As clinically indicated by the attending physician.</td></tr>
      </table>
      <p class="note">This certificate is issued based on the clinical record available at the time of consultation.</p>
    `;
    this.openPrintableHtml(html, 'Medical Certificate', patient.name, patient.mrn);
  }

  exportCurrentTab() {
    const rows = this.currentRows();
    if (!rows.length) {
      this.store.addToast('info', 'No Rows', 'There is no clinical data to export for this tab.');
      return;
    }
    const columns = Object.keys(rows[0]);
    const csv = [columns.join(','), ...rows.map(row => columns.map(column => `"${this.csvCell((row as Record<string, unknown>)[column])}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinical-${this.activeTab()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  printCurrentTab(saveAsPdf: boolean) {
    const rows = this.currentRows();
    if (!rows.length) {
      this.store.addToast('info', 'No Rows', 'There is no clinical data to print for this tab.');
      return;
    }
    const columns = Object.keys(rows[0]);
    const html = `
      <h1>Clinical ${this.activeTab()}</h1>
      <table><thead><tr>${columns.map(column => `<th>${column}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(row => `<tr>${columns.map(column => `<td>${this.csvCell((row as Record<string, unknown>)[column])}</td>`).join('')}</tr>`).join('')}</tbody></table>
      ${saveAsPdf ? '<p>Choose "Save as PDF" in the print dialog.</p>' : ''}
    `;
    const patient = this.activePatient();
    this.openPrintableHtml(html, `Clinical ${this.activeTab()}`, patient?.name, patient?.mrn);
  }

  private currentRows(): Array<Record<string, unknown>> {
    switch (this.activeTab()) {
      case 'encounters':
        return this.visibleEncounters().map(row => this.encounterRow(row));
      case 'vitals':
        return this.visibleVitals().map(row => this.vitalsRow(row));
      case 'diagnoses':
        return this.visibleDiagnoses().map(row => this.diagnosisRow(row));
      case 'prescriptions':
        return this.visiblePrescriptions().map(row => this.prescriptionRow(row));
      case 'labs':
        return this.visibleLabs().map(row => this.labRow(row));
    }
  }

  private encounterRow(row: MedicalRecord): Record<string, unknown> {
    return { date: row.date, patient: this.store.patientDisplayName(row.patientId), doctor: this.store.doctorDisplayName(row.doctorId), diagnosis: row.diagnosis, notes: row.clinicalNotes };
  }

  private vitalsRow(row: ClinicalVitalEntry): Record<string, unknown> {
    return {
      recorded: row.recordedAtUtc,
      patient: this.store.patientDisplayName(row.patientId),
      temperatureC: row.temperatureC,
      pulse: row.pulse,
      respiratoryRate: row.respiratoryRate,
      bloodPressure: row.bloodPressure,
      weightKg: row.weightKg,
      heightCm: row.heightCm,
    };
  }

  private diagnosisRow(row: ClinicalDiagnosis): Record<string, unknown> {
    return { diagnosedAt: row.diagnosedAtUtc, patient: this.store.patientDisplayName(row.patientId), doctor: this.store.doctorDisplayName(row.doctorId), code: row.code, description: row.description, severity: row.severity };
  }

  private prescriptionRow(row: Prescription): Record<string, unknown> {
    return { date: row.date, patient: this.store.patientDisplayName(row.patientId), doctor: this.store.doctorDisplayName(row.doctorId), medication: this.medicationSummary(row), instructions: this.instructionSummary(row), status: row.status };
  }

  private labRow(row: LabOrder): Record<string, unknown> {
    return { ordered: row.orderedDate, patient: this.store.patientDisplayName(row.patientId), doctor: this.store.doctorDisplayName(row.doctorId), category: row.category, order: row.testName, status: row.status, result: row.result || 'Pending' };
  }

  private csvCell(value: unknown): string {
    if (Array.isArray(value)) return value.join('; ');
    if (value === null || value === undefined) return '';
    return String(value).replace(/"/g, '""');
  }

  private openPrintWindow(title: string, rows: Array<[string, string]>, patientName?: string, patientMrn?: string) {
    const html = `
      <h1>${title}</h1>
      <table>${rows.map(([label, value]) => `<tr><th>${this.escapeHtml(label)}</th><td>${this.escapeHtml(value)}</td></tr>`).join('')}</table>
    `;
    this.openPrintableHtml(html, title, patientName, patientMrn);
  }

  private openPrintableHtml(content: string, title = 'Clinical Document', patientName = '', patientMrn = '') {
    const popup = window.open('', '_blank', 'width=980,height=760');
    if (!popup) return;
    const documentNo = `HMS-${Date.now().toString().slice(-8)}`;
    const printedAt = new Date().toLocaleString();
    popup.document.write(`
      <html>
        <head>
          <title>${this.escapeHtml(title)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; background: #e5e7eb; font-family: Arial, sans-serif; color: #111827; }
            .page { position: relative; width: 210mm; min-height: 297mm; margin: 18px auto; background: white; padding: 18mm 16mm; box-shadow: 0 18px 50px rgba(15, 23, 42, .18); overflow: hidden; }
            .watermark { position: absolute; inset: 35% auto auto 9%; transform: rotate(-34deg); font-size: 92px; font-weight: 900; color: rgba(15, 118, 110, .06); letter-spacing: .18em; }
            .doc-header { position: relative; display: grid; grid-template-columns: 1fr 150px; border: 2px solid #111827; }
            .hospital { padding: 12px 14px; text-align: center; border-right: 2px solid #111827; }
            .hospital h2 { margin: 0; font-size: 17px; letter-spacing: .08em; }
            .hospital p { margin: 4px 0 0; font-size: 10px; color: #475569; }
            .doc-box { padding: 10px; text-align: center; font-size: 10px; }
            .barcode { margin: 6px auto 2px; height: 28px; width: 96px; background: repeating-linear-gradient(90deg, #111827 0 2px, transparent 2px 5px, #111827 5px 6px, transparent 6px 9px); }
            .title-row { display: grid; grid-template-columns: 1fr 160px; border: 2px solid #111827; border-top: 0; }
            .title-row div { padding: 8px 12px; font-size: 12px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 14px 0; font-size: 12px; }
            .meta-box { border-top: 1px solid #94a3b8; padding-top: 6px; }
            h1 { margin: 18px 0 14px; font-size: 20px; text-align: center; text-transform: uppercase; letter-spacing: .08em; }
            .lead { font-size: 13px; line-height: 1.7; }
            .note { margin-top: 18px; font-size: 12px; color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; position: relative; z-index: 1; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
            th { width: 150px; background: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: .06em; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 72px; font-size: 12px; }
            .sign-line { border-top: 1px solid #111827; padding-top: 8px; }
            @media print {
              body { background: white; }
              .page { margin: 0; box-shadow: none; width: auto; min-height: auto; }
            }
          </style>
        </head>
        <body>
          <section class="page">
            <div class="watermark">BETHZATHA</div>
            <div class="doc-header">
              <div class="hospital">
                <h2>BETHZATHA GENERAL HOSPITAL</h2>
                <p>Addis Ababa, Ethiopia | Tel: +251-115-535980 | info@bethzatha.com</p>
              </div>
              <div class="doc-box">
                Document No
                <div class="barcode"></div>
                <strong>${documentNo}</strong>
              </div>
            </div>
            <div class="title-row">
              <div><strong>Document Title:</strong> ${this.escapeHtml(title)}</div>
              <div><strong>Revision:</strong> 0<br><strong>Page:</strong> 1 of 1</div>
            </div>
            <div class="meta">
              <div class="meta-box"><strong>Patient:</strong> ${this.escapeHtml(patientName || 'N/A')}<br><strong>MRN:</strong> ${this.escapeHtml(patientMrn || 'N/A')}</div>
              <div class="meta-box"><strong>Printed:</strong> ${this.escapeHtml(printedAt)}<br><strong>Prepared By:</strong> ${this.escapeHtml(this.currentDoctorName())}</div>
            </div>
            ${content}
            <div class="signatures">
              <div class="sign-line">Authorized Clinician</div>
              <div class="sign-line">Patient / Receiver</div>
            </div>
          </section>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private currentDoctorName(): string {
    return this.store.currentUser()?.name || 'Current Clinician';
  }
}
