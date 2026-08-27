import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { StoreService } from '../../core/services/store.service';
import type { ClinicalDiagnosis, ClinicalVitalEntry, LabOrder, MedicalRecord, Prescription, UserRole } from '../../core/models';

type ClinicalTab = 'encounters' | 'vitals' | 'diagnoses' | 'prescriptions' | 'labs';

type CertificateForm = {
  reason: string;
  fitnessStatus: string;
  diagnosis: string;
  startDate: string;
  endDate: string;
  restDays: number;
  reviewDate: string;
  restrictions: string;
};

type ReferralForm = {
  facilityName: string;
  department: string;
  consultant: string;
  urgency: string;
  reason: string;
  clinicalSummary: string;
  investigations: string;
  treatmentGiven: string;
  transportMode: string;
  contactPhone: string;
};

@Component({
  selector: 'app-clinical-ehr',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet],
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
              <button (click)="openMedicalCertificate()" class="clinical-action bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                <span class="material-icons text-base">assignment</span>
                Medical Certificate
              </button>
              <button (click)="openReferralDesk()" class="clinical-action bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                <span class="material-icons text-base">forward_to_inbox</span>
                Referral
              </button>
              <button (click)="openAdmissionBoard()" class="clinical-action bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                <span class="material-icons text-base">king_bed</span>
                Admit / Discharge
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

        @if (isCertificateOpen()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <section class="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div class="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.24em] text-teal-600">Doctor Approval</p>
                  <h2 class="mt-1 text-lg font-black text-slate-900">Medical Certificate</h2>
                  @if (activePatient(); as patient) {
                    <p class="mt-1 text-xs font-bold text-slate-500">{{ patient.name }} | {{ patient.mrn }}</p>
                  }
                </div>
                <button type="button" (click)="closeMedicalCertificate()" class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">Close</button>
              </div>

              <div class="grid gap-4 p-5 md:grid-cols-2">
                <label class="doc-field">
                  <span>Reason for Certificate *</span>
                  <input [(ngModel)]="certificateForm.reason" name="certificateReason" class="doc-input" placeholder="Sick leave, fitness, follow-up clearance" />
                </label>
                <label class="doc-field">
                  <span>Fitness Status *</span>
                  <select [(ngModel)]="certificateForm.fitnessStatus" name="fitnessStatus" class="doc-input">
                    <option value="Temporarily unfit for duty">Temporarily unfit for duty</option>
                    <option value="Fit to resume duty">Fit to resume duty</option>
                    <option value="Fit with restriction">Fit with restriction</option>
                    <option value="Requires specialist review">Requires specialist review</option>
                  </select>
                </label>
                <label class="doc-field md:col-span-2">
                  <span>Diagnosis / Assessment *</span>
                  <textarea [(ngModel)]="certificateForm.diagnosis" name="certificateDiagnosis" class="doc-input min-h-24" placeholder="Clinical diagnosis or assessment supporting the certificate"></textarea>
                </label>
                <label class="doc-field">
                  <span>Start Date *</span>
                  <input [(ngModel)]="certificateForm.startDate" name="certificateStartDate" type="date" class="doc-input" />
                </label>
                <label class="doc-field">
                  <span>End Date *</span>
                  <input [(ngModel)]="certificateForm.endDate" name="certificateEndDate" type="date" class="doc-input" />
                </label>
                <label class="doc-field">
                  <span>Rest Days *</span>
                  <input [(ngModel)]="certificateForm.restDays" name="certificateRestDays" type="number" min="0" class="doc-input" />
                </label>
                <label class="doc-field">
                  <span>Review Date</span>
                  <input [(ngModel)]="certificateForm.reviewDate" name="certificateReviewDate" type="date" class="doc-input" />
                </label>
                <label class="doc-field md:col-span-2">
                  <span>Restrictions / Advice</span>
                  <textarea [(ngModel)]="certificateForm.restrictions" name="certificateRestrictions" class="doc-input min-h-20" placeholder="Work restriction, rest advice, medication precautions, or follow-up instruction"></textarea>
                </label>
              </div>

              @if (certificateErrors().length) {
                <div class="mx-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  @for (error of certificateErrors(); track error) {
                    <div>{{ error }}</div>
                  }
                </div>
              }

              <div class="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div class="rounded-2xl px-3 py-2 text-xs font-black"
                  [class]="certificateApproved() ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'">
                  {{ certificateApproved() ? 'Approved by clinician' : 'Pending clinician approval' }}
                </div>
                <div class="flex flex-wrap gap-2">
                  <button type="button" (click)="approveMedicalCertificate()" class="clinical-action bg-slate-900 text-white">Approve</button>
                  <button type="button" (click)="printMedicalCertificate()" [disabled]="!certificateApproved()" class="clinical-action bg-teal-600 text-white disabled:cursor-not-allowed disabled:opacity-40">Print Certificate</button>
                </div>
              </div>
            </section>
          </div>
        }

        @if (isReferralOpen()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <section class="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div class="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.24em] text-sky-600">Continuity of Care</p>
                  <h2 class="mt-1 text-lg font-black text-slate-900">Referral Letter</h2>
                  @if (activePatient(); as patient) {
                    <p class="mt-1 text-xs font-bold text-slate-500">{{ patient.name }} | {{ patient.mrn }}</p>
                  }
                </div>
                <button type="button" (click)="closeReferralLetter()" class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">Close</button>
              </div>

              <div class="grid gap-4 p-5 md:grid-cols-2">
                <label class="doc-field">
                  <span>Receiving Facility *</span>
                  <input [(ngModel)]="referralForm.facilityName" name="referralFacility" class="doc-input" placeholder="Hospital or medical center name" />
                </label>
                <label class="doc-field">
                  <span>Receiving Department *</span>
                  <input [(ngModel)]="referralForm.department" name="referralDepartment" class="doc-input" placeholder="Emergency, Surgery, Cardiology" />
                </label>
                <label class="doc-field">
                  <span>Consultant / Unit</span>
                  <input [(ngModel)]="referralForm.consultant" name="referralConsultant" class="doc-input" placeholder="Named consultant or receiving unit" />
                </label>
                <label class="doc-field">
                  <span>Urgency *</span>
                  <select [(ngModel)]="referralForm.urgency" name="referralUrgency" class="doc-input">
                    <option value="Immediate">Immediate</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Routine">Routine</option>
                  </select>
                </label>
                <label class="doc-field md:col-span-2">
                  <span>Reason for Referral *</span>
                  <textarea [(ngModel)]="referralForm.reason" name="referralReason" class="doc-input min-h-20" placeholder="Reason the patient requires transfer or specialist review"></textarea>
                </label>
                <label class="doc-field md:col-span-2">
                  <span>Clinical Summary *</span>
                  <textarea [(ngModel)]="referralForm.clinicalSummary" name="referralSummary" class="doc-input min-h-28" placeholder="History, examination findings, diagnosis, and current condition"></textarea>
                </label>
                <label class="doc-field">
                  <span>Investigations Completed</span>
                  <textarea [(ngModel)]="referralForm.investigations" name="referralInvestigations" class="doc-input min-h-20" placeholder="Lab, imaging, ECG, ultrasound, or other diagnostics"></textarea>
                </label>
                <label class="doc-field">
                  <span>Treatment Given</span>
                  <textarea [(ngModel)]="referralForm.treatmentGiven" name="referralTreatment" class="doc-input min-h-20" placeholder="Stabilization, medication, fluids, procedures"></textarea>
                </label>
                <label class="doc-field">
                  <span>Transport Mode *</span>
                  <select [(ngModel)]="referralForm.transportMode" name="referralTransport" class="doc-input">
                    <option value="Ambulance">Ambulance</option>
                    <option value="Hospital vehicle">Hospital vehicle</option>
                    <option value="Private transport">Private transport</option>
                  </select>
                </label>
                <label class="doc-field">
                  <span>Contact Phone</span>
                  <input [(ngModel)]="referralForm.contactPhone" name="referralPhone" class="doc-input" placeholder="+251..." />
                </label>
              </div>

              @if (referralErrors().length) {
                <div class="mx-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  @for (error of referralErrors(); track error) {
                    <div>{{ error }}</div>
                  }
                </div>
              }

              <div class="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div class="rounded-2xl px-3 py-2 text-xs font-black"
                  [class]="referralApproved() ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'">
                  {{ referralApproved() ? 'Referral approved' : 'Pending referral approval' }}
                </div>
                <div class="flex flex-wrap gap-2">
                  <button type="button" (click)="approveReferralLetter()" class="clinical-action bg-slate-900 text-white">Approve</button>
                  <button type="button" (click)="printReferralLetter()" [disabled]="!referralApproved()" class="clinical-action bg-sky-600 text-white disabled:cursor-not-allowed disabled:opacity-40">Print Referral</button>
                </div>
              </div>
            </section>
          </div>
        }
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

    .doc-field {
      display: flex;
      flex-direction: column;
      gap: .45rem;
      font-size: .68rem;
      font-weight: 900;
      color: rgb(71 85 105);
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    .doc-input {
      width: 100%;
      border-radius: .9rem;
      border: 1px solid rgb(203 213 225);
      background: rgb(248 250 252);
      padding: .8rem .95rem;
      font-size: .78rem;
      font-weight: 700;
      color: rgb(15 23 42);
      text-transform: none;
      letter-spacing: 0;
      outline: none;
      transition: all .18s ease;
    }

    .doc-input:focus {
      border-color: rgb(20 184 166);
      background: white;
      box-shadow: 0 0 0 4px rgba(20, 184, 166, .1);
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
  isCertificateOpen = signal(false);
  certificateApproved = signal(false);
  certificateErrors = signal<string[]>([]);
  activeCertificateId = signal<string>('');
  isReferralOpen = signal(false);
  referralApproved = signal(false);
  referralErrors = signal<string[]>([]);
  certificateForm: CertificateForm = this.defaultCertificateForm();
  referralForm: ReferralForm = this.defaultReferralForm();

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

  openMedicalCertificate() {
    const patient = this.activePatient();
    if (!patient) {
      this.store.addToast('error', 'Patient Required', 'Select a patient before preparing a medical certificate.');
      return;
    }
    this.certificateForm = {
      ...this.defaultCertificateForm(),
      diagnosis: this.latestClinicalAssessment(),
    };
    const existing = this.store.certificatesForPatient(patient.id)[0];
    if (existing) {
      this.certificateForm = {
        reason: existing.reason,
        fitnessStatus: existing.fitnessStatus,
        diagnosis: existing.diagnosis,
        startDate: existing.startDate,
        endDate: existing.endDate,
        restDays: existing.restDays,
        reviewDate: existing.reviewDate || '',
        restrictions: existing.restrictions || '',
      };
      this.activeCertificateId.set(existing.id);
      this.certificateApproved.set(true);
    } else {
      this.activeCertificateId.set('');
      this.certificateApproved.set(false);
    }
    this.certificateErrors.set([]);
    this.isCertificateOpen.set(true);
  }

  closeMedicalCertificate() {
    this.isCertificateOpen.set(false);
  }

  approveMedicalCertificate() {
    const errors = this.validateCertificate();
    this.certificateErrors.set(errors);
    if (errors.length) {
      this.certificateApproved.set(false);
      return;
    }
    if (!this.activeCertificateId()) {
      const patient = this.activePatient();
      if (patient) {
        const saved = this.store.saveMedicalCertificate({
          patientId: patient.id,
          patientName: patient.name,
          patientMrn: patient.mrn,
          doctorId: this.store.currentUser()?.id || '',
          doctorName: this.currentDoctorName(),
          reason: this.certificateForm.reason,
          diagnosis: this.certificateForm.diagnosis,
          fitnessStatus: this.certificateForm.fitnessStatus,
          startDate: this.certificateForm.startDate,
          endDate: this.certificateForm.endDate,
          restDays: Number(this.certificateForm.restDays || 0),
          reviewDate: this.certificateForm.reviewDate,
          restrictions: this.certificateForm.restrictions,
        });
        this.activeCertificateId.set(saved.id);
      }
    }
    this.certificateApproved.set(true);
    this.store.addToast('success', 'Certificate Approved', 'The medical certificate is ready for printing.');
  }

  printMedicalCertificate() {
    const patient = this.activePatient();
    if (!patient) {
      this.store.addToast('error', 'Patient Required', 'Select a patient before printing a medical certificate.');
      return;
    }
    if (!this.certificateApproved()) {
      this.store.addToast('warning', 'Approval Required', 'Approve the medical certificate before printing.');
      return;
    }
    const saved = this.store.certificatesForPatient(patient.id).find(item => item.id === this.activeCertificateId()) || this.store.certificatesForPatient(patient.id)[0];
    const form = saved || this.certificateForm;
    const doctorName = saved?.doctorName || this.currentDoctorName();
    const html = `
      <h1>Medical Certificate</h1>
      <p class="lead">This is to certify that <strong>${this.escapeHtml(patient.name)}</strong>, MRN <strong>${this.escapeHtml(patient.mrn)}</strong>, was evaluated at Bethzatha General Hospital by ${this.escapeHtml(doctorName)}.</p>
      <table>
        <tr><th>Patient Name</th><td>${this.escapeHtml(patient.name)}</td><th>MRN</th><td>${this.escapeHtml(patient.mrn)}</td></tr>
        <tr><th>Gender</th><td>${this.escapeHtml(patient.gender)}</td><th>Blood Type</th><td>${this.escapeHtml(patient.bloodType)}</td></tr>
        <tr><th>Reason</th><td colspan="3">${this.escapeHtml(form.reason)}</td></tr>
        <tr><th>Diagnosis / Assessment</th><td colspan="3">${this.escapeHtml(form.diagnosis)}</td></tr>
        <tr><th>Fitness Status</th><td colspan="3">${this.escapeHtml(form.fitnessStatus)}</td></tr>
        <tr><th>Rest Period</th><td>${this.escapeHtml(String(form.restDays))} day(s)</td><th>Dates</th><td>${this.escapeHtml(form.startDate)} to ${this.escapeHtml(form.endDate)}</td></tr>
        <tr><th>Review Date</th><td colspan="3">${this.escapeHtml(form.reviewDate || 'As clinically indicated')}</td></tr>
        <tr><th>Restrictions / Advice</th><td colspan="3">${this.escapeHtml(form.restrictions || 'None recorded')}</td></tr>
      </table>
      <p class="note">Approved by ${this.escapeHtml(doctorName)}. This certificate is issued based on the clinical record available at the time of consultation.</p>
    `;
    this.openPrintableHtml(html, 'Medical Certificate', patient.name, patient.mrn);
  }

  openAdmissionBoard() {
    this.router.navigate(['/wards-beds']);
  }
  openReferralDesk() {
    this.router.navigate(['/referrals-history'], {
      queryParams: { patient: this.selectedPatientId() || undefined },
    });
  }
  openReferralLetter() {
    const patient = this.activePatient();
    if (!patient) {
      this.store.addToast('error', 'Patient Required', 'Select a patient before preparing a referral letter.');
      return;
    }
    this.referralForm = {
      ...this.defaultReferralForm(),
      department: this.selectedAppointmentDepartment(),
      clinicalSummary: this.latestClinicalAssessment(),
      investigations: this.visibleLabs().map(lab => `${lab.testName}: ${lab.result || lab.status}`).join('\n'),
      treatmentGiven: this.visiblePrescriptions().map(rx => this.medicationSummary(rx)).join('\n'),
    };
    this.referralApproved.set(false);
    this.referralErrors.set([]);
    this.isReferralOpen.set(true);
  }

  closeReferralLetter() {
    this.isReferralOpen.set(false);
  }

  approveReferralLetter() {
    const errors = this.validateReferral();
    this.referralErrors.set(errors);
    if (errors.length) {
      this.referralApproved.set(false);
      return;
    }
    this.referralApproved.set(true);
    this.store.addToast('success', 'Referral Approved', 'The referral letter is ready for printing.');
  }

  printReferralLetter() {
    const patient = this.activePatient();
    if (!patient) {
      this.store.addToast('error', 'Patient Required', 'Select a patient before printing a referral letter.');
      return;
    }
    if (!this.referralApproved()) {
      this.store.addToast('warning', 'Approval Required', 'Approve the referral letter before printing.');
      return;
    }
    const form = this.referralForm;
    const html = `
      <h1>Referral Letter</h1>
      <p class="lead">Kindly receive <strong>${this.escapeHtml(patient.name)}</strong>, MRN <strong>${this.escapeHtml(patient.mrn)}</strong>, for ${this.escapeHtml(form.urgency.toLowerCase())} care continuity.</p>
      <table>
        <tr><th>Receiving Facility</th><td>${this.escapeHtml(form.facilityName)}</td><th>Department</th><td>${this.escapeHtml(form.department)}</td></tr>
        <tr><th>Consultant / Unit</th><td>${this.escapeHtml(form.consultant || 'Receiving clinician')}</td><th>Urgency</th><td>${this.escapeHtml(form.urgency)}</td></tr>
        <tr><th>Reason for Referral</th><td colspan="3">${this.escapeHtml(form.reason)}</td></tr>
        <tr><th>Clinical Summary</th><td colspan="3">${this.escapeHtml(form.clinicalSummary)}</td></tr>
        <tr><th>Investigations</th><td colspan="3">${this.escapeHtml(form.investigations || 'Not recorded')}</td></tr>
        <tr><th>Treatment Given</th><td colspan="3">${this.escapeHtml(form.treatmentGiven || 'Not recorded')}</td></tr>
        <tr><th>Transport Mode</th><td>${this.escapeHtml(form.transportMode)}</td><th>Contact Phone</th><td>${this.escapeHtml(form.contactPhone || 'N/A')}</td></tr>
      </table>
      <p class="note">Prepared and approved by ${this.escapeHtml(this.currentDoctorName())} for safe transfer and continuity of care.</p>
    `;
    this.openPrintableHtml(html, 'Referral Letter', patient.name, patient.mrn);
  }

  private defaultCertificateForm(): CertificateForm {
    return {
      reason: '',
      fitnessStatus: 'Temporarily unfit for duty',
      diagnosis: '',
      startDate: this.todayIso(),
      endDate: this.dateAfterDays(1),
      restDays: 1,
      reviewDate: '',
      restrictions: '',
    };
  }

  private defaultReferralForm(): ReferralForm {
    return {
      facilityName: '',
      department: 'Emergency',
      consultant: '',
      urgency: 'Urgent',
      reason: '',
      clinicalSummary: '',
      investigations: '',
      treatmentGiven: '',
      transportMode: 'Ambulance',
      contactPhone: '',
    };
  }

  private validateCertificate(): string[] {
    const errors: string[] = [];
    const form = this.certificateForm;
    if (!form.reason.trim()) errors.push('Reason for certificate is required.');
    if (!form.diagnosis.trim()) errors.push('Diagnosis or assessment is required.');
    if (!form.startDate) errors.push('Start date is required.');
    if (!form.endDate) errors.push('End date is required.');
    if (Number(form.restDays) < 0) errors.push('Rest days cannot be negative.');
    if (form.startDate && form.endDate && form.endDate < form.startDate) errors.push('End date cannot be before start date.');
    return errors;
  }

  private validateReferral(): string[] {
    const errors: string[] = [];
    const form = this.referralForm;
    if (!form.facilityName.trim()) errors.push('Receiving facility is required.');
    if (!form.department.trim()) errors.push('Receiving department is required.');
    if (!form.reason.trim()) errors.push('Reason for referral is required.');
    if (!form.clinicalSummary.trim()) errors.push('Clinical summary is required.');
    if (!form.transportMode.trim()) errors.push('Transport mode is required.');
    return errors;
  }

  private latestClinicalAssessment(): string {
    return this.visibleDiagnoses()[0]?.description
      || this.visibleEncounters()[0]?.diagnosis
      || this.visibleEncounters()[0]?.clinicalNotes
      || 'Clinical evaluation completed';
  }

  private selectedAppointmentDepartment(): string {
    const patientId = this.selectedPatientId();
    const appointment = this.store.appointments().find(item => item.patientId === patientId && item.status !== 'CANCELLED' && item.status !== 'NO_SHOW');
    return appointment?.department || 'Emergency';
  }

  private todayIso(): string {
    return new Date().toISOString().split('T')[0];
  }

  private dateAfterDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
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
