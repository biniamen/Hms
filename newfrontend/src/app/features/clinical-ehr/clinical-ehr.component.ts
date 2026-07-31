import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import type { ClinicalDiagnosis, ClinicalVitalEntry, DiagnosticTest, LabOrder, MedicalRecord, Patient, Prescription, UserRole } from '../../core/models';

type ClinicalTab = 'encounters' | 'vitals' | 'diagnoses' | 'prescriptions' | 'labs';

@Component({
  selector: 'app-clinical-ehr',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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
            <button (click)="openForm('encounters')" class="clinical-action bg-slate-900 text-white shadow-slate-200 hover:bg-slate-800">
              <span class="material-icons text-base">note_add</span>
              Encounter
            </button>
          }
          @if (canCreate('vitals')) {
            <button (click)="openForm('vitals')" class="clinical-action bg-sky-600 text-white shadow-sky-100 hover:bg-sky-700">
              <span class="material-icons text-base">monitor_heart</span>
              Vitals
            </button>
          }
          @if (canCreate('diagnoses')) {
            <button (click)="openForm('diagnoses')" class="clinical-action bg-violet-600 text-white shadow-violet-100 hover:bg-violet-700">
              <span class="material-icons text-base">diagnosis</span>
              Diagnosis
            </button>
          }
          @if (canCreate('prescriptions')) {
            <button (click)="openForm('prescriptions')" class="clinical-action bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700">
              <span class="material-icons text-base">medication</span>
              Prescription
            </button>
          }
          @if (canCreate('labs')) {
            <button (click)="openForm('labs')" class="clinical-action bg-purple-600 text-white shadow-purple-100 hover:bg-purple-700">
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

      @if (activeForm()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-fade-in">
        <div class="w-full max-w-6xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25 animate-scale-up">
          <div class="flex items-center justify-between gap-4 border-b border-teal-100 bg-teal-50/50 px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
                <span class="material-icons text-base">{{ activeFormIcon() }}</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">{{ activeFormTitle() }}</h3>
                <p class="text-[10px] font-bold uppercase tracking-widest text-teal-600">{{ activeFormSubtitle() }}</p>
              </div>
            </div>
            <button (click)="closeForm()" class="rounded-full p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="max-h-[calc(92vh-86px)] overflow-y-auto">
          @switch (activeForm()) {
            @case ('encounters') {
              <form [formGroup]="encounterForm" (ngSubmit)="submitEncounter()" class="space-y-6 p-6 sm:p-8">
                <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
                  <label class="clinical-field">Patient Chart
                    <select formControlName="patientId" [class]="inputClasses">
                      @for (p of store.patients(); track p.id) {
                        <option [value]="p.id">{{ p.name }} - {{ p.mrn }}</option>
                      }
                    </select>
                  </label>
                  <label class="clinical-field">Visit Type
                    <select formControlName="visitType" [class]="inputClasses">
                      @for (type of visitTypes; track type) {
                        <option [value]="type">{{ type }}</option>
                      }
                    </select>
                  </label>
                  <label class="clinical-field">Chief Complaint
                    <input formControlName="chiefComplaint" [class]="inputClasses" placeholder="Main reason for visit" />
                  </label>
                  <label class="clinical-field lg:col-span-3">Assessment
                    <textarea formControlName="assessment" rows="4" [class]="inputClasses" placeholder="Clinical findings, working impression, and diagnosis"></textarea>
                  </label>
                  <label class="clinical-field lg:col-span-3">Plan
                    <textarea formControlName="plan" rows="4" [class]="inputClasses" placeholder="Treatment plan, orders, follow-up, and care instructions"></textarea>
                  </label>
                </div>
                <div class="flex justify-end gap-3 border-t border-slate-100 pt-6">
                  <button type="button" (click)="closeForm()" class="clinical-secondary">Discard</button>
                  <button type="submit" class="clinical-submit bg-teal-600 hover:bg-teal-700">Save Encounter</button>
                </div>
              </form>
            }

            @case ('vitals') {
              <form [formGroup]="vitalsForm" (ngSubmit)="submitVitals()" class="space-y-6 p-6 sm:p-8">
                <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <label class="clinical-field md:col-span-2">Patient Chart
                    <select formControlName="patientId" [class]="inputClasses">
                      @for (p of store.patients(); track p.id) {
                        <option [value]="p.id">{{ p.name }} - {{ p.mrn }}</option>
                      }
                    </select>
                  </label>
                  <label class="clinical-field">Temperature C<input type="number" step="0.1" formControlName="temperatureC" [class]="inputClasses" /></label>
                  <label class="clinical-field">Pulse<input type="number" formControlName="pulse" [class]="inputClasses" /></label>
                  <label class="clinical-field">Resp. Rate<input type="number" formControlName="respiratoryRate" [class]="inputClasses" /></label>
                  <label class="clinical-field">Blood Pressure<input formControlName="bloodPressure" [class]="inputClasses" placeholder="120/80" /></label>
                  <label class="clinical-field">Weight Kg<input type="number" step="0.1" formControlName="weightKg" [class]="inputClasses" /></label>
                  <label class="clinical-field">Height Cm<input type="number" step="0.1" formControlName="heightCm" [class]="inputClasses" /></label>
                </div>
                <div class="flex justify-end gap-3 border-t border-slate-100 pt-6">
                  <button type="button" (click)="closeForm()" class="clinical-secondary">Discard</button>
                  <button type="submit" class="clinical-submit bg-sky-600 hover:bg-sky-700">Record Vitals</button>
                </div>
              </form>
            }

            @case ('diagnoses') {
              <form [formGroup]="diagnosisForm" (ngSubmit)="submitDiagnosis()" class="space-y-6 p-6 sm:p-8">
                <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
                  <div class="space-y-6">
                    <section class="clinical-order-section">
                      <h4>1. Diagnosis classification</h4>
                      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <label class="clinical-field md:col-span-2">Patient Chart
                          <select formControlName="patientId" [class]="inputClasses">
                            @for (p of store.patients(); track p.id) {
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
                          <input formControlName="code" [class]="inputClasses" placeholder="e.g. J02.9" />
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
                          <textarea formControlName="description" rows="3" [class]="inputClasses" placeholder="Write the working or confirmed diagnosis"></textarea>
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

                  <aside class="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
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
                <div class="flex justify-end gap-3 border-t border-slate-100 pt-6">
                  <button type="button" (click)="closeForm()" class="clinical-secondary">Discard</button>
                  <button type="submit" class="clinical-submit bg-violet-600 hover:bg-violet-700">Add Diagnosis</button>
                </div>
              </form>
            }

            @case ('prescriptions') {
              <form [formGroup]="prescriptionForm" (ngSubmit)="submitPrescription()" class="space-y-6 p-6 sm:p-8">
                <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
                  <div class="space-y-6">
                    <div class="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <label class="clinical-field md:col-span-2">Patient Chart
                          <select formControlName="patientId" [class]="inputClasses">
                            @for (p of store.patients(); track p.id) {
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
                          <select formControlName="medName" [class]="inputClasses">
                            @for (item of medicationCatalog; track item) {
                              <option [value]="item">{{ item }}</option>
                            }
                          </select>
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
                  </div>

                  <aside class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="mb-3 flex items-center justify-between">
                      <h4 class="text-sm font-black text-slate-900">Order basket</h4>
                      <span class="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">Rx</span>
                    </div>
                    <div class="rounded-xl border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
                      <div class="text-xs font-black text-slate-900">{{ prescriptionForm.value.medName }}</div>
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
                  </aside>
                </div>
                <div class="flex justify-end gap-3 border-t border-slate-100 pt-6">
                  <button type="button" (click)="closeForm()" class="clinical-secondary">Discard</button>
                  <button type="submit" class="clinical-submit bg-emerald-600 hover:bg-emerald-700">Issue Prescription</button>
                </div>
              </form>
            }

            @case ('labs') {
              <form [formGroup]="labForm" (ngSubmit)="submitLabOrder()" class="space-y-6 p-6 sm:p-8">
                <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
                  <div class="space-y-6">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <label class="clinical-field md:col-span-2">Patient Chart
                        <select formControlName="patientId" [class]="inputClasses">
                          @for (p of store.patients(); track p.id) {
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

                  <aside class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                <div class="flex justify-end gap-3 border-t border-slate-100 pt-6">
                  <button type="button" (click)="closeForm()" class="clinical-secondary">Discard</button>
                  <button type="submit" class="clinical-submit bg-purple-600 hover:bg-purple-700">Submit Diagnostic Order</button>
                </div>
              </form>
            }
          }
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
            @for (p of store.patients(); track p.id) {
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
                BP {{ patient.vitals.bp }} / HR {{ patient.vitals.hr }} / Temp {{ patient.vitals.temp }} C
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
                        <td>{{ rec.patientName }}</td>
                        <td>{{ rec.doctorName }}</td>
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
                        <td>{{ row.patientName }}</td>
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
                        <td>{{ row.patientName }}</td>
                        <td>{{ row.doctorName }}</td>
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
                        <td>{{ rx.patientName }}</td>
                        <td>{{ rx.doctorName }}</td>
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
                        <td>{{ lab.patientName }}</td>
                        <td>{{ lab.doctorName }}</td>
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

  activeTab = signal<ClinicalTab>('encounters');
  activeForm = signal<ClinicalTab | null>(null);
  selectedPatientId = signal('');

  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all';

  readonly visitTypes = ['Outpatient', 'Follow-up', 'Emergency', 'Inpatient Review', 'Procedure Review', 'Teleconsultation'];
  readonly medicationCatalog = ['Paracetamol', 'Amoxicillin', 'Azithromycin', 'Ceftriaxone', 'Metformin', 'Amlodipine', 'Omeprazole', 'Salbutamol', 'Losartan', 'Hydrochlorothiazide', 'ORS Sachet'];
  readonly doseUnits = ['mg', 'g', 'mcg', 'mL', 'tablet', 'capsule', 'puff', 'drop', 'sachet'];
  readonly medicationRoutes = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhalation', 'Ophthalmic', 'Otic'];
  readonly frequencies = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'As needed', 'Stat'];
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

  readonly tabs: Array<{ id: ClinicalTab; label: string; activeClass: string }> = [
    { id: 'encounters', label: 'Encounters', activeClass: 'bg-slate-900 text-white font-black' },
    { id: 'vitals', label: 'Vitals', activeClass: 'bg-sky-600 text-white font-black' },
    { id: 'diagnoses', label: 'Diagnoses', activeClass: 'bg-violet-600 text-white font-black' },
    { id: 'prescriptions', label: 'Prescriptions', activeClass: 'bg-emerald-600 text-white font-black' },
    { id: 'labs', label: 'Lab Requests', activeClass: 'bg-purple-600 text-white font-black' },
  ];

  encounterForm = new FormGroup({
    patientId: new FormControl('', [Validators.required]),
    visitType: new FormControl('Outpatient', [Validators.required]),
    chiefComplaint: new FormControl('', [Validators.required]),
    assessment: new FormControl('', [Validators.required]),
    plan: new FormControl('', [Validators.required]),
  });

  vitalsForm = new FormGroup({
    patientId: new FormControl('', [Validators.required]),
    temperatureC: new FormControl(36.8, [Validators.required, Validators.min(30), Validators.max(45)]),
    pulse: new FormControl(78, [Validators.required, Validators.min(20), Validators.max(240)]),
    respiratoryRate: new FormControl(18, [Validators.required, Validators.min(5), Validators.max(80)]),
    bloodPressure: new FormControl('120/80', [Validators.required]),
    weightKg: new FormControl(64, [Validators.required, Validators.min(1), Validators.max(350)]),
    heightCm: new FormControl(170, [Validators.required, Validators.min(30), Validators.max(250)]),
  });

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

  labForm = new FormGroup({
    patientId: new FormControl('', [Validators.required]),
    category: new FormControl('Hematology', [Validators.required]),
    priority: new FormControl('Routine', [Validators.required]),
    specimenType: new FormControl('Whole blood', [Validators.required]),
    clinicalNote: new FormControl(''),
  });

  activePatient = computed(() => this.store.patients().find(p => p.id === this.selectedPatientId()));
  visibleEncounters = computed(() => this.store.medicalRecords().filter(row => row.patientId === this.selectedPatientId()));
  visibleVitals = computed(() => this.store.clinicalVitals().filter(row => row.patientId === this.selectedPatientId()));
  visibleDiagnoses = computed(() => this.store.clinicalDiagnoses().filter(row => row.patientId === this.selectedPatientId()));
  visiblePrescriptions = computed(() => this.store.prescriptions().filter(row => row.patientId === this.selectedPatientId()));
  visibleLabs = computed(() => this.store.labOrders().filter(row => row.patientId === this.selectedPatientId()));

  clinicalMetrics = computed(() => [
    { tab: 'encounters' as ClinicalTab, label: 'Encounters', value: this.store.medicalRecords().length, hint: 'SOAP notes', icon: 'history_edu', activeClass: 'bg-slate-900 border-slate-900 text-white' },
    { tab: 'vitals' as ClinicalTab, label: 'Vitals', value: this.store.clinicalVitals().length, hint: 'Recorded observations', icon: 'monitor_heart', activeClass: 'bg-sky-600 border-sky-600 text-white' },
    { tab: 'diagnoses' as ClinicalTab, label: 'Diagnoses', value: this.store.clinicalDiagnoses().length, hint: 'Problem list', icon: 'diagnosis', activeClass: 'bg-violet-600 border-violet-600 text-white' },
    { tab: 'prescriptions' as ClinicalTab, label: 'Prescriptions', value: this.store.prescriptions().length, hint: 'Medication orders', icon: 'medication', activeClass: 'bg-emerald-600 border-emerald-600 text-white' },
    { tab: 'labs' as ClinicalTab, label: 'Lab Requests', value: this.store.labOrders().length, hint: 'Diagnostics', icon: 'biotech', activeClass: 'bg-purple-600 border-purple-600 text-white' },
  ]);

  constructor() {
    effect(() => {
      const patients = this.store.patients();
      if (patients.length > 0 && !this.selectedPatientId()) {
        this.setPatientEverywhere(patients[0].id);
      }
    });
  }

  onPatientSelect(event: Event) {
    this.setPatientEverywhere((event.target as HTMLSelectElement).value);
  }

  focusPatient(patientId: string) {
    this.setPatientEverywhere(patientId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openForm(tab: ClinicalTab) {
    this.activeTab.set(tab);
    this.activeForm.set(tab);
    this.setPatientEverywhere(this.selectedPatientId() || this.store.patients()[0]?.id || '');
  }

  closeForm() {
    this.activeForm.set(null);
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

  canCreate(tab: ClinicalTab): boolean {
    const role = this.store.currentUser()?.role as UserRole | undefined;
    if (!role) return false;
    if (role === 'ADMIN') return true;
    if (tab === 'vitals') return role === 'DOCTOR' || role === 'NURSE';
    return role === 'DOCTOR';
  }

  activeFormTitle(): string {
    const titles: Record<ClinicalTab, string> = {
      encounters: 'New Clinical Encounter',
      vitals: 'Record Patient Vitals',
      diagnoses: 'Add Clinical Diagnosis',
      prescriptions: 'Issue Prescription Order',
      labs: 'Submit Diagnostic Order',
    };
    return titles[this.activeForm() || 'encounters'];
  }

  activeFormSubtitle(): string {
    const subtitles: Record<ClinicalTab, string> = {
      encounters: 'SOAP documentation',
      vitals: 'Nursing and clinical observations',
      diagnoses: 'ICD and local diagnosis coding',
      prescriptions: 'Medication order entry',
      labs: 'Laboratory and imaging request',
    };
    return subtitles[this.activeForm() || 'encounters'];
  }

  activeFormIcon(): string {
    const icons: Record<ClinicalTab, string> = {
      encounters: 'history_edu',
      vitals: 'monitor_heart',
      diagnoses: 'diagnosis',
      prescriptions: 'medication',
      labs: 'biotech',
    };
    return icons[this.activeForm() || 'encounters'];
  }

  submitEncounter() {
    if (this.encounterForm.invalid) {
      this.encounterForm.markAllAsTouched();
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
    this.closeForm();
    this.encounterForm.patchValue({ chiefComplaint: '', assessment: '', plan: '' });
  }

  submitVitals() {
    if (this.vitalsForm.invalid) {
      this.vitalsForm.markAllAsTouched();
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
    this.closeForm();
  }

  submitDiagnosis() {
    if (this.diagnosisForm.invalid) {
      this.diagnosisForm.markAllAsTouched();
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
    this.closeForm();
    this.diagnosisForm.patchValue({
      code: '',
      codeSystem: 'ICD-10',
      diagnosisType: 'Primary',
      certainty: 'Confirmed',
      description: '',
      severity: 'Moderate',
      onsetDate: new Date().toISOString().split('T')[0],
      notes: '',
      followUpPlan: '',
    });
  }

  submitPrescription() {
    if (this.prescriptionForm.invalid) {
      this.prescriptionForm.markAllAsTouched();
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
      medications: [{
        name: value.medName || 'Medication',
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
      }],
    });
    this.closeForm();
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
    this.closeForm();
    this.selectedDiagnosticIds.set([]);
  }

  medicationSummary(rx: Prescription): string {
    return rx.medications.map(item => `${item.name} ${item.dosage}`.trim()).join(', ');
  }

  instructionSummary(rx: Prescription): string {
    return rx.medications.map(item => `${item.frequency}, ${item.duration}. ${item.instructions}`.trim()).join(' | ');
  }

  openLabDesk() {
    this.router.navigate(['/laboratory']);
  }

  printPrescription(rx: Prescription) {
    this.openPrintWindow('Prescription Order', [
      ['Patient', `${rx.patientName} (${rx.patientMrn})`],
      ['Doctor', rx.doctorName],
      ['Date', rx.date],
      ['Medication', this.medicationSummary(rx)],
      ['Instructions', this.instructionSummary(rx)],
    ], rx.patientName, rx.patientMrn);
  }

  printLabOrder(lab: LabOrder) {
    this.openPrintWindow('Diagnostic Order', [
      ['Patient', `${lab.patientName} (${lab.patientMrn})`],
      ['Doctor', lab.doctorName],
      ['Category', lab.category],
      ['Priority', lab.priority || 'Routine'],
      ['Specimen', lab.specimenType || 'As applicable'],
      ['Order', lab.testName],
      ['Clinical Note', lab.clinicalNote || 'Not specified'],
      ['Status', lab.status],
      ['Result', lab.result || 'Pending'],
    ], lab.patientName, lab.patientMrn);
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

  private setPatientEverywhere(patientId: string) {
    if (!patientId) return;
    this.selectedPatientId.set(patientId);
    this.encounterForm.patchValue({ patientId });
    this.vitalsForm.patchValue({ patientId });
    this.diagnosisForm.patchValue({ patientId });
    this.prescriptionForm.patchValue({ patientId });
    this.labForm.patchValue({ patientId });
  }

  private requirePatient(patientId: string | null): Patient | undefined {
    const patient = this.store.patients().find(item => item.id === patientId);
    if (!patient) {
      this.store.addToast('error', 'Patient Required', 'Select a patient before saving the clinical record.');
    }
    return patient;
  }

  private currentDoctorId(): string {
    return this.store.currentUser()?.id || 'current-doctor';
  }

  private currentDoctorName(): string {
    return this.store.currentUser()?.name || 'Current Clinician';
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
    return { date: row.date, patient: row.patientName, doctor: row.doctorName, diagnosis: row.diagnosis, notes: row.clinicalNotes };
  }

  private vitalsRow(row: ClinicalVitalEntry): Record<string, unknown> {
    return {
      recorded: row.recordedAtUtc,
      patient: row.patientName,
      temperatureC: row.temperatureC,
      pulse: row.pulse,
      respiratoryRate: row.respiratoryRate,
      bloodPressure: row.bloodPressure,
      weightKg: row.weightKg,
      heightCm: row.heightCm,
    };
  }

  private diagnosisRow(row: ClinicalDiagnosis): Record<string, unknown> {
    return { diagnosedAt: row.diagnosedAtUtc, patient: row.patientName, doctor: row.doctorName, code: row.code, description: row.description, severity: row.severity };
  }

  private prescriptionRow(row: Prescription): Record<string, unknown> {
    return { date: row.date, patient: row.patientName, doctor: row.doctorName, medication: this.medicationSummary(row), instructions: this.instructionSummary(row), status: row.status };
  }

  private labRow(row: LabOrder): Record<string, unknown> {
    return { ordered: row.orderedDate, patient: row.patientName, doctor: row.doctorName, category: row.category, order: row.testName, status: row.status, result: row.result || 'Pending' };
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
}
