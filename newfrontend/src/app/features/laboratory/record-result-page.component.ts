import { ChangeDetectionStrategy, Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { DiagnosticTest, LabOrder, LabResultItem } from '../../core/models';

@Component({
  selector: 'app-record-result-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in pb-8">

      <!-- PAGE HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="goBack()"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs shadow-sm hover:bg-slate-50 hover:text-purple-700 transition-all active:scale-95">
            <span class="material-icons text-sm">arrow_back</span>
            Laboratory Queue
          </button>
          <div class="hidden sm:block w-px h-8 bg-slate-200"></div>
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Record Lab Result</h1>
            <p class="text-xs text-slate-500 mt-0.5">{{ labOrder()?.testName || 'Diagnostic result entry' }}</p>
          </div>
        </div>

        @if (labOrder()) {
          <span [class]="getLabStatusClass(labOrder()!.status)" class="self-start sm:self-auto px-3 py-1.5 rounded-full text-[9px] font-black uppercase border tracking-widest">
            {{ labOrder()!.status }}
          </span>
        }
      </div>

      <!-- NOT FOUND STATE -->
      @if (!labOrder()) {
        <div class="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <span class="material-icons text-slate-200 text-6xl mb-4">science</span>
          <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Lab request not found</p>
          <p class="text-[11px] text-slate-300 mt-1">It may have been removed or the page was opened with an invalid reference.</p>
          <button type="button" (click)="goBack()" class="mt-6 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all">
            Back to Laboratory Queue
          </button>
        </div>
      }

      @if (labOrder()) {
        <form [formGroup]="resultForm" (ngSubmit)="submitResult()" class="space-y-6">

          <!-- PATIENT / ORDER STRIP -->
          <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 sm:p-6 border-b border-purple-100 bg-purple-50/40">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-purple-600 text-white font-bold flex items-center justify-center shadow-lg shadow-purple-500/20 uppercase">
                  {{ store.patientDisplayName(labOrder()!.patientId).charAt(0) }}
                </div>
                <div>
                  <div class="text-[10px] font-black uppercase tracking-widest text-purple-600">Patient</div>
                  <div class="text-sm font-black text-slate-900">{{ store.patientDisplayName(labOrder()!.patientId) }}</div>
                  <div class="text-[10px] font-mono text-slate-500">{{ store.patientMrn(labOrder()!.patientId) }}</div>
                </div>
              </div>
              <div>
                <div class="text-[10px] font-black uppercase tracking-widest text-purple-600">Test Order</div>
                <div class="mt-1 text-sm font-bold text-slate-900">{{ labOrder()!.testName }}</div>
                <div class="text-[10px] font-semibold text-slate-500">{{ labOrder()!.priority }} priority</div>
              </div>
              <div>
                <div class="text-[10px] font-black uppercase tracking-widest text-purple-600">Category</div>
                <div class="mt-1 text-sm font-bold text-slate-900">{{ labOrder()!.category }}</div>
                <div class="text-[10px] font-semibold text-slate-500">Specimen: {{ labOrder()!.specimenType || 'As applicable' }}</div>
              </div>
              <div>
                <div class="text-[10px] font-black uppercase tracking-widest text-purple-600">Requesting Doctor</div>
                <div class="mt-1 text-sm font-bold text-slate-900">{{ store.doctorDisplayName(labOrder()!.doctorId) }}</div>
                <div class="text-[10px] font-semibold text-slate-500">Ordered {{ labOrder()!.orderedDate }}</div>
              </div>
            </div>

            @if (labOrder()!.collectedDate) {
              <div class="flex items-center gap-2 px-5 sm:px-6 py-3 bg-emerald-50/70 border-b border-emerald-100 text-[11px] font-bold text-emerald-800">
                <span class="material-icons text-sm">science</span>
                Sample collected {{ labOrder()!.collectedDate }} — result entry unlocked
              </div>
            }
          </div>

          <!-- BLOCKED BANNERS -->
          @if (blockedReason() === 'completed') {
            <div class="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <span class="material-icons text-emerald-600 text-base mt-0.5">task_alt</span>
              <div>
                <p class="text-[11px] font-black uppercase tracking-widest text-emerald-800">Results already posted</p>
                <p class="mt-0.5 text-[11px] font-semibold text-emerald-700">This request already has a completed result. Re-posting is disabled — go back to the queue to view or print the report.</p>
              </div>
            </div>
          }
          @if (blockedReason() === 'payment') {
            <div class="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <span class="material-icons text-amber-600 text-base mt-0.5">lock</span>
              <div>
                <p class="text-[11px] font-black uppercase tracking-widest text-amber-800">Payment required — not released to laboratory</p>
                <p class="mt-0.5 text-[11px] font-semibold text-amber-700">This request has not been fully paid. Results can only be recorded after payment is settled at the billing desk.</p>
              </div>
            </div>
          }
          @if (blockedReason() === 'sample') {
            <div class="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <span class="material-icons text-blue-600 text-base mt-0.5">biotech</span>
              <div>
                <p class="text-[11px] font-black uppercase tracking-widest text-blue-800">Sample collection required</p>
                <p class="mt-0.5 text-[11px] font-semibold text-blue-700">Result entry is enabled only after the specimen has been successfully collected. Mark the request as “Sample Collected” first.</p>
              </div>
            </div>
          }
          @if (blockedReason() === 'role') {
            <div class="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <span class="material-icons text-rose-600 text-base mt-0.5">admin_panel_settings</span>
              <div>
                <p class="text-[11px] font-black uppercase tracking-widest text-rose-800">Laboratory role required</p>
                <p class="mt-0.5 text-[11px] font-semibold text-rose-700">Only a laboratory technician (or admin) can enter diagnostic results.</p>
              </div>
            </div>
          }

          <div [class]="blockedReason() ? 'pointer-events-none select-none opacity-55' : ''" class="space-y-6">

            <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
              <div class="space-y-6">
                <!-- RESULT WORKSHEET -->
                <section class="rounded-3xl border border-slate-200/80 bg-white shadow-sm p-5 sm:p-6">
                  <div class="mb-4 flex items-center justify-between">
                    <h4 class="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span class="w-1.5 h-4 bg-purple-500 rounded-full"></span>
                      Result worksheet
                    </h4>
                    <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{{ resultRows().length }} line items</span>
                  </div>
                  <div class="overflow-x-auto">
                    <table class="w-full min-w-[760px] text-left text-xs">
                      <thead class="border-b border-slate-200 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <tr>
                          <th class="px-3 py-3">Test Name</th>
                          <th class="px-3 py-3">Result *</th>
                          <th class="px-3 py-3">Unit</th>
                          <th class="px-3 py-3">Reference Range</th>
                          <th class="px-3 py-3">Flag</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        @for (row of resultRows(); track row.catalogId || row.testName; let i = $index) {
                          <tr>
                            <td class="px-3 py-3">
                              <div class="font-black text-slate-900">{{ row.testName }}</div>
                              <div class="mt-1 text-[10px] font-semibold text-slate-400">{{ row.groupName }} / {{ row.subGroup }}</div>
                            </td>
                            <td class="px-3 py-3">
                              <input [value]="row.result" (input)="updateResultRow(i, 'result', $event)" placeholder="Enter value" [class]="inputClasses + ' font-mono font-bold'" />
                            </td>
                            <td class="px-3 py-3">
                              <input [value]="row.unit" (input)="updateResultRow(i, 'unit', $event)" [class]="inputClasses" />
                            </td>
                            <td class="px-3 py-3">
                              <input [value]="row.referenceRange" (input)="updateResultRow(i, 'referenceRange', $event)" [class]="inputClasses" />
                            </td>
                            <td class="px-3 py-3">
                              <select [value]="row.flag" (change)="updateResultRow(i, 'flag', $event)" [class]="inputClasses">
                                <option>Normal</option>
                                <option>Low</option>
                                <option>High</option>
                                <option>Abnormal</option>
                                <option>Critical</option>
                              </select>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </section>

                <!-- RESULT SUMMARY -->
                <section class="rounded-3xl border border-slate-200/80 bg-white shadow-sm p-5 sm:p-6">
                  <div class="mb-4 flex items-center justify-between">
                    <h4 class="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span class="w-1.5 h-4 bg-purple-500 rounded-full"></span>
                      Result summary
                    </h4>
                    <span class="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-purple-700">Bench verification</span>
                  </div>
                  <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div class="space-y-1 md:col-span-2">
                      <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Result Value / Summary *</label>
                      <textarea rows="4" formControlName="result" placeholder="Enter numeric value, narrative result, or imaging impression" [class]="inputClasses + ' font-mono text-sm font-bold'"></textarea>
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Unit</label>
                      <input type="text" formControlName="unit" placeholder="g/dL" [class]="inputClasses" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Reference Range</label>
                      <input type="text" formControlName="normalRange" placeholder="13.5 - 17.5" [class]="inputClasses" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Result Flag *</label>
                      <select formControlName="resultFlag" [class]="inputClasses">
                        <option>Normal</option>
                        <option>Abnormal</option>
                        <option>Critical</option>
                      </select>
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Performed By</label>
                      <input type="text" formControlName="performedBy" placeholder="Lab technologist" [class]="inputClasses" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Verified By</label>
                      <input type="text" formControlName="verifiedBy" placeholder="Verifier" [class]="inputClasses" />
                    </div>
                    <div class="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                      <input type="checkbox" formControlName="isAbnormal" id="ab-check-page" class="w-5 h-5 rounded border-rose-300 text-rose-600 focus:ring-rose-500" />
                      <label for="ab-check-page" class="cursor-pointer text-[11px] font-black uppercase tracking-wider text-rose-700">
                        Clinically abnormal
                      </label>
                    </div>
                  </div>
                </section>

                <!-- INTERPRETATION -->
                <section class="rounded-3xl border border-slate-200/80 bg-white shadow-sm p-5 sm:p-6">
                  <h4 class="mb-3 text-sm font-black text-slate-900 flex items-center gap-2">
                    <span class="w-1.5 h-4 bg-purple-500 rounded-full"></span>
                    Interpretation and release note
                  </h4>
                  <textarea formControlName="resultNotes" rows="4" [class]="inputClasses" placeholder="Interpretation, sample quality, critical call note, or radiology finding"></textarea>
                </section>
              </div>

              <!-- RESULT PREVIEW -->
              <aside class="space-y-4">
                <div class="rounded-3xl border border-slate-200/80 bg-white shadow-sm p-5">
                  <div class="mb-3 flex items-center justify-between">
                    <h4 class="text-sm font-black text-slate-900">Result preview</h4>
                    <span [class]="resultForm.value.resultFlag === 'Critical' ? 'bg-rose-100 text-rose-700' : resultForm.value.resultFlag === 'Abnormal' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'" class="rounded-full px-2 py-1 text-[10px] font-black">
                      {{ resultForm.value.resultFlag || 'Normal' }}
                    </span>
                  </div>
                  <div class="rounded-xl border-l-4 border-purple-500 bg-white p-4 shadow-sm">
                    <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">Released result</div>
                    <div class="mt-2 whitespace-pre-line text-sm font-black text-slate-900">{{ resultForm.value.result || 'Result not entered yet' }}</div>
                    <div class="mt-3 text-[11px] font-semibold text-slate-500">
                      Ref: {{ resultForm.value.normalRange || 'N/A' }} {{ resultForm.value.unit || '' }}
                    </div>
                    <div class="mt-3 rounded-lg bg-purple-50 p-3 text-[11px] font-semibold text-purple-800">
                      {{ resultForm.value.resultNotes || 'Interpretation will appear here.' }}
                    </div>
                  </div>
                </div>

                <div class="rounded-3xl border border-slate-200/80 bg-white shadow-sm p-5">
                  <h4 class="text-sm font-black text-slate-900 mb-3">Request summary</h4>
                  <div class="space-y-2.5 text-[11px]">
                    <div class="flex justify-between gap-3">
                      <span class="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Order</span>
                      <span class="font-bold text-slate-700 text-right">{{ labOrder()!.testName }}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                      <span class="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Specimen</span>
                      <span class="font-bold text-slate-700 text-right">{{ labOrder()!.specimenType || 'As applicable' }}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                      <span class="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Priority</span>
                      <span class="font-bold text-slate-700 text-right">{{ labOrder()!.priority }}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                      <span class="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Clinical note</span>
                      <span class="font-bold text-slate-700 text-right">{{ labOrder()!.clinicalNote || '—' }}</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <!-- STICKY ACTION BAR (in-flow, aligns with the layout content area) -->
          <div class="sticky bottom-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 mt-8 flex items-center justify-between gap-3 rounded-t-2xl border-t border-slate-200 bg-white/95 px-4 sm:px-6 lg:px-8 py-3.5 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.15)] backdrop-blur">
            <p class="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {{ blockedReason() ? 'Result entry locked' : 'Submitting authorizes the result to the EHR' }}
            </p>
            <div class="flex items-center gap-3 ml-auto">
              <button type="button" (click)="goBack()" class="px-6 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="!!blockedReason()"
                class="px-8 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2">
                <span class="material-icons text-base">verified</span>
                Authorize & Post Results
              </button>
            </div>
          </div>
        </form>
      }
    </div>
  `
})
export class RecordResultPageComponent {
  store = inject(StoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly labId = signal<string | null>(this.route.snapshot.queryParamMap.get('lab'));
  readonly labOrder = computed(() =>
    this.store.labOrders().find(lab => lab.id === this.labId()) ?? null
  );

  resultRows = signal<LabResultItem[]>([]);

  /** Why result entry is locked, if it is. */
  readonly blockedReason = computed<string | null>(() => {
    const lab = this.labOrder();
    if (!lab) return 'not-found';
    if (lab.status === 'COMPLETED') return 'completed';
    if (lab.status === 'AWAITING_PAYMENT') return 'payment';
    const sampleCollected = lab.status === 'SAMPLE_COLLECTED' || (lab.status === 'IN_ANALYSIS' && !!lab.collectedDate);
    if (!sampleCollected) return 'sample';
    if (!this.canEnterLabResult()) return 'role';
    return null;
  });

  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all';

  resultForm = new FormGroup({
    result: new FormControl(''),
    unit: new FormControl('mg/dL'),
    normalRange: new FormControl('70 - 110'),
    resultFlag: new FormControl<'Normal' | 'Abnormal' | 'Critical'>('Normal', [Validators.required]),
    resultNotes: new FormControl(''),
    performedBy: new FormControl(''),
    verifiedBy: new FormControl(''),
    isAbnormal: new FormControl(false)
  });

  private preparedFor = '';

  constructor() {
    effect(() => {
      const lab = this.labOrder();
      if (lab && this.preparedFor !== lab.id) {
        this.preparedFor = lab.id;
        this.resultRows.set(this.buildResultRows(lab));
        this.resultForm.reset({
          result: '',
          unit: 'ng/mL',
          normalRange: '0.0 - 0.04',
          resultFlag: 'Normal',
          resultNotes: '',
          performedBy: this.store.currentUser()?.name || '',
          verifiedBy: this.store.currentUser()?.name || '',
          isAbnormal: false
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/laboratory']);
  }

  canEnterLabResult(): boolean {
    const role = this.store.currentUser()?.role;
    return role === 'LAB_TECHNICIAN' || role === 'ADMIN';
  }

  updateResultRow(index: number, field: keyof LabResultItem, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.resultRows.update(rows => {
      const next = rows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const updated = { ...row, [field]: value } as LabResultItem;
        if (field === 'result' || field === 'referenceRange') {
          updated.flag = this.autoResultFlag(updated.result, updated.referenceRange);
        }
        return updated;
      });
      const overall = this.overallResultFlag(next);
      this.resultForm.patchValue({
        resultFlag: overall,
        isAbnormal: overall !== 'Normal',
      }, { emitEvent: false });
      return next;
    });
  }

  private autoResultFlag(result: string, referenceRange: string): LabResultItem['flag'] {
    const value = this.firstNumber(result);
    if (value === null) {
      const text = (result || '').toLowerCase();
      if (text.includes('critical')) return 'Critical';
      if (text.includes('positive') || text.includes('detected') || text.includes('abnormal')) return 'Abnormal';
      return 'Normal';
    }

    const range = (referenceRange || '').replace(/,/g, '').trim();
    const between = range.match(/(-?\d+(?:\.\d+)?)\s*(?:-|to|–|—)\s*(-?\d+(?:\.\d+)?)/i);
    if (between) {
      const low = Number(between[1]);
      const high = Number(between[2]);
      if (Number.isFinite(low) && Number.isFinite(high)) {
        if (value < low) return value < low * 0.5 ? 'Critical' : 'Low';
        if (value > high) return value > high * 1.8 ? 'Critical' : 'High';
        return 'Normal';
      }
    }

    const lessThan = range.match(/<\s*(-?\d+(?:\.\d+)?)/);
    if (lessThan) {
      const upper = Number(lessThan[1]);
      return value < upper ? 'Normal' : (value > upper * 1.8 ? 'Critical' : 'High');
    }

    const greaterThan = range.match(/>\s*(-?\d+(?:\.\d+)?)/);
    if (greaterThan) {
      const lower = Number(greaterThan[1]);
      return value > lower ? 'Normal' : (value < lower * 0.5 ? 'Critical' : 'Low');
    }

    return 'Normal';
  }

  private firstNumber(value: string): number | null {
    const match = String(value || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private overallResultFlag(rows: LabResultItem[]): 'Normal' | 'Abnormal' | 'Critical' {
    if (rows.some(row => row.flag === 'Critical')) return 'Critical';
    if (rows.some(row => row.flag !== 'Normal')) return 'Abnormal';
    return 'Normal';
  }

  private buildResultRows(lab: LabOrder): LabResultItem[] {
    if (lab.resultItems?.length) {
      return lab.resultItems;
    }

    const catalogRows = (lab.testCatalogIds || [])
      .map(id => this.store.diagnosticTests().find(test => test.id === id))
      .filter((test): test is DiagnosticTest => !!test)
      .map(test => ({
        catalogId: test.id,
        groupName: test.groupName,
        subGroup: test.subGroup,
        testName: test.testName,
        result: '',
        unit: test.unit,
        referenceRange: test.referenceRange,
        flag: 'Normal' as const,
      }));

    if (catalogRows.length) {
      return catalogRows;
    }

    return lab.testName.split(',')
      .map(name => name.trim())
      .filter(Boolean)
      .map(name => ({
        groupName: lab.category || 'Laboratory',
        subGroup: 'General',
        testName: name,
        result: '',
        unit: lab.unit || '',
        referenceRange: lab.normalRange || '',
        flag: 'Normal' as const,
      }));
  }

  submitResult() {
    const lab = this.labOrder();
    if (!lab || this.resultForm.invalid || this.blockedReason()) return;

    const val = this.resultForm.value;
    const rows = this.resultRows();
    if (!rows.length || rows.some(row => !row.result?.trim())) {
      this.store.addToast('error', 'Incomplete Results', 'Enter a result value for every requested test before posting.');
      return;
    }

    const hasCritical = rows.some(row => row.flag === 'Critical');
    const hasAbnormal = rows.some(row => row.flag !== 'Normal');
    const flag = hasCritical ? 'Critical' : (val.isAbnormal || hasAbnormal ? 'Abnormal' : (val.resultFlag || 'Normal'));
    const releaseText = [
      val.result || rows.map(row => `${row.testName}: ${row.result} ${row.unit}`.trim()).join('\n'),
      val.resultNotes ? `Interpretation: ${val.resultNotes}` : '',
    ].filter(Boolean).join('\n');

    this.store.updateLabResult(
      lab.id,
      releaseText,
      rows.length === 1 ? rows[0].referenceRange || 'N/A' : 'See result table',
      rows.length === 1 ? rows[0].unit || '' : '',
      flag !== 'Normal',
      flag,
      val.resultNotes || '',
      val.performedBy || this.store.currentUser()?.name || '',
      val.verifiedBy || this.store.currentUser()?.name || '',
      rows
    );
    this.router.navigate(['/laboratory']);
  }

  getLabStatusClass(status: string): string {
    switch (status) {
      case 'AWAITING_PAYMENT': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ORDERED': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'SAMPLE_COLLECTED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_ANALYSIS': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }
}
