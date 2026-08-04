import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { DiagnosticTest, LabOrder, LabResultItem } from '../../core/models';

@Component({
  selector: 'app-laboratory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in pb-20">
      
      <!-- TOP HEADER BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Central Laboratory & Diagnostics</h1>
          <p class="text-xs text-slate-500 mt-1">Pathology, biochemistry, and automated diagnostic result documentation</p>
        </div>

        <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          @if (canEnterLabResult()) {
            <button
              type="button"
              (click)="refreshPaidQueue()"
              class="px-4 py-2.5 bg-white text-purple-700 font-semibold rounded-2xl text-xs border border-purple-100 shadow-sm flex items-center gap-2 hover:bg-purple-50 transition-all">
              <span class="material-icons text-base">refresh</span>
              <span>Refresh Paid Queue</span>
            </button>
          }
          @if (!isFormVisible() && !selectedLabForResult() && canOrderLab()) {
            <button
              (click)="openOrderForm()"
              class="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-2xl text-xs shadow-xl shadow-slate-200 flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
              <span class="material-icons text-base">biotech</span>
              <span>Order Lab Test</span>
            </button>
          }
        </div>
      </div>

      <!-- INLINE FORM AREA (Order Entry or Result Entry) -->
      @if (isFormVisible() || selectedLabForResult()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-fade-in">
        <div class="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25 animate-scale-up">
          
          <!-- Shared Form Header -->
          <div class="bg-purple-50/50 px-6 py-4 border-b border-purple-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                <span class="material-icons text-base">{{ selectedLabForResult() ? 'edit_note' : 'add_circle' }}</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">
                  {{ selectedLabForResult() ? 'Enter Lab Result' : 'Diagnostic Order Request' }}
                </h3>
                <p class="text-[10px] text-purple-600 font-bold uppercase tracking-widest">
                  {{ selectedLabForResult() ? 'Test: ' + selectedLabForResult()?.testName : 'Pathology & Biochemistry' }}
                </p>
              </div>
            </div>
            <button (click)="closeForm()" class="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <span class="material-icons">close</span>
            </button>
          </div>

          <!-- SUB-FORM 1: New Lab Order -->
          <div class="max-h-[calc(92vh-86px)] overflow-y-auto">
          @if (!selectedLabForResult()) {
            <form [formGroup]="orderForm" (ngSubmit)="submitOrder()" class="p-6 sm:p-8 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Target Patient *</label>
                  <select formControlName="patientId" [class]="inputClasses">
                    @for (p of store.patients(); track p.id) {
                      <option [value]="p.id">{{ p.name }} (MRN: {{ p.mrn }})</option>
                    }
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Requesting Doctor *</label>
                  <select formControlName="doctorId" [class]="inputClasses">
                    @for (doctor of orderDoctors(); track doctor.id) {
                      <option [value]="doctor.id">{{ doctor.name }}</option>
                    }
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Priority *</label>
                  <select formControlName="priority" [class]="inputClasses">
                    <option>Routine</option>
                    <option>Urgent</option>
                    <option>STAT</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Specimen *</label>
                  <select formControlName="specimenType" [class]="inputClasses">
                    <option>Whole blood</option>
                    <option>Serum</option>
                    <option>Plasma</option>
                    <option>Urine</option>
                    <option>Stool</option>
                    <option>Sputum</option>
                    <option>Imaging only</option>
                  </select>
                </div>
                <div class="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                  <div class="text-[10px] font-black uppercase tracking-widest text-purple-700">Selected Tests</div>
                  <div class="mt-1 text-2xl font-black text-slate-900">{{ selectedOrderTests().length }}</div>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
                <div class="space-y-4">
                  @for (group of diagnosticOrderGroups(); track group.category) {
                    <section class="rounded-2xl border border-slate-200 bg-white p-4">
                      <div class="mb-3 flex items-center justify-between">
                        <h4 class="text-sm font-black text-slate-900">{{ group.category }}</h4>
                        <span class="text-[10px] font-bold uppercase text-slate-400">{{ group.items.length }} catalog tests</span>
                      </div>
                      <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
                        @for (test of group.items; track test.id) {
                          <button
                            type="button"
                            (click)="toggleOrderTest(test)"
                            [class]="isOrderTestSelected(test.id) ? 'border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-100' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-purple-200 hover:bg-purple-50/40'"
                            class="flex min-h-16 items-start gap-3 rounded-xl border p-3 text-left transition-all">
                            <span class="material-icons mt-0.5 text-base">{{ test.groupName === 'Radiology' ? 'radiology' : 'fact_check' }}</span>
                            <span>
                              <strong class="block text-xs">{{ test.testName }}</strong>
                              <span class="text-[10px] font-semibold opacity-70">{{ test.subGroup }} - {{ test.specimenType || 'As applicable' }}</span>
                              <span class="mt-1 block text-[10px] font-bold text-slate-400">Ref: {{ test.referenceRange || 'Report based' }} {{ test.unit }}</span>
                              <span class="mt-1 block text-[11px] font-black text-purple-700">{{ test.price.toFixed(2) }} {{ test.currency }}</span>
                            </span>
                          </button>
                        }
                      </div>
                    </section>
                  }
                </div>

                <aside class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <h4 class="text-sm font-black text-slate-900">Order basket</h4>
                    <span class="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-black text-purple-700">
                      {{ selectedOrderTotal().toFixed(2) }} {{ selectedOrderCurrency() }}
                    </span>
                  </div>
                  <div class="mt-3 space-y-2">
                    @for (test of selectedOrderTests(); track test.id) {
                      <div class="rounded-xl border-l-4 border-purple-500 bg-white p-3 text-xs font-bold text-slate-700 shadow-sm">
                        <div>{{ test.testName }}</div>
                        <div class="mt-1 text-[10px] font-semibold text-slate-400">{{ test.groupName }} / {{ test.subGroup }}</div>
                        <div class="mt-1 text-[10px] font-black text-purple-700">{{ test.price.toFixed(2) }} {{ test.currency }}</div>
                      </div>
                    } @empty {
                      <div class="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-[11px] font-bold text-slate-400">
                        Select one or more tests from the catalog.
                      </div>
                    }
                  </div>
                </aside>
              </div>
              <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" (click)="closeForm()" class="px-6 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Discard</button>
                <button type="submit" class="px-8 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:-translate-y-0.5">
                  Submit Lab Order
                </button>
              </div>
            </form>
          }

          <!-- SUB-FORM 2: Record Test Result -->
          @if (selectedLabForResult()) {
            <form [formGroup]="resultForm" (ngSubmit)="submitResult()" class="p-6 sm:p-8 space-y-6">
              <div class="grid grid-cols-1 gap-4 rounded-2xl border border-purple-100 bg-purple-50/50 p-4 md:grid-cols-4">
                <div>
                  <div class="text-[10px] font-black uppercase tracking-widest text-purple-600">Patient</div>
                  <div class="mt-1 text-sm font-black text-slate-900">{{ store.patientDisplayName(selectedLabForResult()?.patientId || '') }}</div>
                  <div class="text-[10px] font-mono text-slate-500">{{ store.patientMrn(selectedLabForResult()?.patientId || '') }}</div>
                </div>
                <div>
                  <div class="text-[10px] font-black uppercase tracking-widest text-purple-600">Order</div>
                  <div class="mt-1 text-sm font-bold text-slate-900">{{ selectedLabForResult()?.testName }}</div>
                </div>
                <div>
                  <div class="text-[10px] font-black uppercase tracking-widest text-purple-600">Category</div>
                  <div class="mt-1 text-sm font-bold text-slate-900">{{ selectedLabForResult()?.category }}</div>
                </div>
                <div>
                  <div class="text-[10px] font-black uppercase tracking-widest text-purple-600">Doctor</div>
                  <div class="mt-1 text-sm font-bold text-slate-900">{{ store.doctorDisplayName(selectedLabForResult()?.doctorId || '') }}</div>
                </div>
              </div>
              <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
                <div class="space-y-6">
                  <section class="rounded-2xl border border-slate-200 bg-white p-5">
                    <div class="mb-4 flex items-center justify-between">
                      <h4 class="text-sm font-black text-slate-900">Result worksheet</h4>
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

                  <section class="rounded-2xl border border-slate-200 bg-white p-5">
                    <div class="mb-4 flex items-center justify-between">
                      <h4 class="text-sm font-black text-slate-900">Result summary</h4>
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
                        <input type="checkbox" formControlName="isAbnormal" id="ab-check-inline" class="w-5 h-5 rounded border-rose-300 text-rose-600 focus:ring-rose-500" />
                        <label for="ab-check-inline" class="cursor-pointer text-[11px] font-black uppercase tracking-wider text-rose-700">
                          Clinically abnormal
                        </label>
                      </div>
                    </div>
                  </section>

                  <section class="rounded-2xl border border-slate-200 bg-white p-5">
                    <h4 class="mb-3 text-sm font-black text-slate-900">2. Interpretation and release note</h4>
                    <textarea formControlName="resultNotes" rows="4" [class]="inputClasses" placeholder="Interpretation, sample quality, critical call note, or radiology finding"></textarea>
                  </section>
                </div>

                <aside class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                </aside>
              </div>
              <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" (click)="closeForm()" class="px-6 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" class="px-8 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:-translate-y-0.5">
                  Authorize & Post Results
                </button>
              </div>
            </form>
          }
          </div>
        </div>
        </div>
      }

      <!-- LAB ORDERS QUEUE GRID -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (lab of store.labOrders(); track lab.id) {
          <div class="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <!-- Subtle category indicator line -->
            <div class="absolute top-0 left-0 right-0 h-1.5 bg-purple-100 group-hover:bg-purple-500 transition-colors"></div>

            <div class="space-y-5">
              <div class="flex items-center justify-between">
                <span class="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[9px] uppercase tracking-widest border border-purple-100">
                  {{ lab.category }}
                </span>
                <span [class]="getLabStatusClass(lab.status)" class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest">
                  {{ lab.status }}
                </span>
              </div>

              <div>
                <h3 class="text-sm font-bold text-slate-900 font-display">{{ lab.testName }}</h3>
                <div class="flex items-center gap-2 mt-2">
                   <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">{{ store.patientDisplayName(lab.patientId).charAt(0) }}</div>
                   <div>
                     <p class="text-xs text-slate-700 font-bold">{{ store.patientDisplayName(lab.patientId) }}</p>
                     <p class="text-[9px] text-slate-400 font-mono tracking-tighter">MRN: {{ store.patientMrn(lab.patientId) }}</p>
                   </div>
                </div>
                <p class="text-[10px] text-slate-400 mt-3 font-medium italic">Ordered by {{ store.doctorDisplayName(lab.doctorId) }} • {{ lab.orderedDate }}</p>
              </div>

              <!-- Result Visualization -->
              @if (lab.status === 'COMPLETED') {
                <div [class]="lab.isAbnormal ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'" class="p-4 rounded-2xl border space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Laboratory Output</span>
                    @if (lab.isAbnormal) {
                      <span [class]="lab.resultFlag === 'Critical' ? 'text-rose-700' : 'text-amber-700'" class="flex items-center gap-1 text-[9px] font-black uppercase">
                        <span class="material-icons text-[12px]">warning</span> {{ lab.resultFlag || 'Abnormal' }}
                      </span>
                    } @else {
                      <span class="text-emerald-600 font-black text-[9px] uppercase tracking-widest">Normal</span>
                    }
                  </div>
                  <div class="text-xl font-black font-mono text-slate-900 leading-none">
                    {{ lab.result }} <span class="text-xs font-normal text-slate-400 lowercase">{{ lab.unit }}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 font-medium italic">Ref: {{ lab.normalRange }} {{ lab.unit }}</div>
                </div>
              }

              <!-- Action Bar -->
              <div class="pt-2">
                @if (lab.status === 'AWAITING_PAYMENT') {
                  <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-[10px] font-black uppercase tracking-widest text-amber-700">
                    Payment required — not released to laboratory
                  </div>
                } @else if (lab.status !== 'COMPLETED' && canEnterLabResult()) {
                  <button 
                    (click)="openResultForm(lab)" 
                    class="w-full py-2.5 bg-slate-900 hover:bg-purple-600 text-white font-bold rounded-xl text-[11px] shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <span class="material-icons text-base">science</span>
                    Record Result
                  </button>
                } @else if (lab.status !== 'COMPLETED') {
                  <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    Paid — available to laboratory technician
                  </div>
                } @else {
                  <div class="flex items-center justify-between gap-3 border-t border-slate-50 pt-2">
                    <span class="text-[9px] font-bold uppercase tracking-widest text-slate-400">Tech: {{ lab.labTechName || 'Lab' }}</span>
                    <button
                      type="button"
                      (click)="printLabResult(lab)"
                      class="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-black text-white shadow-sm transition-all hover:bg-purple-600">
                      <span class="material-icons text-sm">print</span>
                      Print
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        } @empty {
          <div class="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
             <span class="material-icons text-slate-200 text-6xl mb-4">biotech</span>
             <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">No active lab orders found</p>
          </div>
        }
      </div>
    </div>
  `
})
export class LaboratoryComponent {
  store = inject(StoreService);

  isFormVisible = signal(false);
  selectedLabForResult = signal<LabOrder | null>(null);
  selectedOrderTestIds = signal<string[]>([]);
  resultRows = signal<LabResultItem[]>([]);

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

  selectedOrderTests = computed(() =>
    this.selectedOrderTestIds()
      .map(id => this.store.diagnosticTests().find(test => test.id === id))
      .filter((test): test is DiagnosticTest => !!test));

  selectedOrderTotal = computed(() =>
    this.selectedOrderTests().reduce((total, test) => total + test.price, 0));

  selectedOrderCurrency = computed(() =>
    this.selectedOrderTests()[0]?.currency || 'ETB');

  orderDoctors = computed(() => {
    const profiles = this.store.doctors().map(doctor => ({
      id: doctor.id,
      name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
    }));
    if (profiles.length > 0) return profiles;
    return this.store.employeesAsUsers()
      .filter(employee => employee.role === 'DOCTOR')
      .map(employee => ({ id: employee.id, name: employee.name }));
  });

  // Standardized classes for input consistency across the dashboard
  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all';

  orderForm = new FormGroup({
    patientId: new FormControl('', [Validators.required]),
    doctorId: new FormControl('', [Validators.required]),
    category: new FormControl('Biochemistry', [Validators.required]),
    priority: new FormControl('Routine', [Validators.required]),
    specimenType: new FormControl('Whole blood', [Validators.required])
  });

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

  closeForm() {
    this.isFormVisible.set(false);
    this.selectedLabForResult.set(null);
    this.selectedOrderTestIds.set([]);
    this.resultRows.set([]);
    this.orderForm.reset({
      patientId: this.store.patients()[0]?.id || '',
      doctorId: this.orderDoctors()[0]?.id || '',
      category: 'Biochemistry',
      priority: 'Routine',
      specimenType: 'Whole blood',
    });
    this.resultForm.reset();
  }

  openOrderForm() {
    this.selectedLabForResult.set(null);
    this.selectedOrderTestIds.set([]);
    this.orderForm.reset({
      patientId: this.store.patients()[0]?.id || '',
      doctorId: this.orderDoctors()[0]?.id || '',
      category: 'Biochemistry',
      priority: 'Routine',
      specimenType: 'Whole blood',
    });
    this.isFormVisible.set(true);
  }

  toggleOrderTest(test: DiagnosticTest) {
    this.orderForm.patchValue({
      category: test.groupName,
      specimenType: test.specimenType || this.orderForm.value.specimenType || 'Whole blood',
    });
    this.selectedOrderTestIds.update(current =>
      current.includes(test.id) ? current.filter(id => id !== test.id) : [...current, test.id]
    );
  }

  isOrderTestSelected(id: string): boolean {
    return this.selectedOrderTestIds().includes(id);
  }

  canOrderLab(): boolean {
    const role = this.store.currentUser()?.role;
    return role === 'DOCTOR' || role === 'ADMIN';
  }

  canEnterLabResult(): boolean {
    const role = this.store.currentUser()?.role;
    return role === 'LAB_TECHNICIAN' || role === 'ADMIN';
  }

  refreshPaidQueue() {
    this.store.refreshLabOrders();
  }

  submitOrder() {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }
    
    const val = this.orderForm.value;
    const patient = this.store.patients().find(p => p.id === val.patientId);
    const doctor = this.orderDoctors().find(item => item.id === val.doctorId);
    const selectedTests = this.selectedOrderTests();

    if (selectedTests.length === 0) {
      this.store.addToast('error', 'Diagnostic Test Required', 'Select at least one catalog test before submitting the order.');
      return;
    }

    if (!patient || !doctor) {
      this.store.addToast('error', 'Patient and Doctor Required', 'Select a valid patient and requesting doctor before submitting.');
      return;
    }

    if (patient && doctor) {
      this.store.addLabOrder({
        patientId: patient.id,
        patientName: patient.name,
        patientMrn: patient.mrn,
        doctorId: doctor.id,
        doctorName: doctor.name,
        testName: selectedTests.map(test => test.testName).join(', '),
        testCatalogIds: selectedTests.map(test => test.id),
        category: selectedTests[0]?.groupName || val.category || 'Biochemistry',
        priority: val.priority || 'Routine',
        specimenType: val.specimenType || selectedTests[0]?.specimenType || 'Whole blood',
        clinicalNote: `Requested panels: ${selectedTests.map(test => `${test.groupName}/${test.subGroup}/${test.testName}`).join('; ')}`
      });
    }
    this.closeForm();
  }

  openResultForm(lab: LabOrder) {
    if (lab.status === 'AWAITING_PAYMENT') {
      this.store.addToast('error', 'Payment Required', 'This request has not been fully paid and cannot be processed by the laboratory.');
      return;
    }
    if (!this.canEnterLabResult()) {
      this.store.addToast('error', 'Laboratory Role Required', 'Only a laboratory technician can enter diagnostic results.');
      return;
    }
    this.selectedLabForResult.set(lab);
    this.isFormVisible.set(false); // Close order form if open
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
    // Scroll to top for focus
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const lab = this.selectedLabForResult();
    if (!lab || this.resultForm.invalid) return;

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
    this.closeForm();
  }

  printLabResult(lab: LabOrder) {
    const popup = window.open('', '_blank', 'width=980,height=760');
    if (!popup) return;
    const printedAt = new Date().toLocaleString();
    const documentNo = `LAB-${Date.now().toString().slice(-8)}`;
    const patientName = this.store.patientDisplayName(lab.patientId);
    const patientMrn = this.store.patientMrn(lab.patientId);
    const doctorName = this.store.doctorDisplayName(lab.doctorId);
    const rows = lab.resultItems?.length
      ? lab.resultItems
      : this.buildResultRows({ ...lab, resultItems: undefined }).map(row => ({ ...row, result: lab.result || row.result }));
    const groupedRows = rows.reduce<Record<string, LabResultItem[]>>((acc, row) => {
      const key = row.groupName || lab.category || 'Laboratory';
      acc[key] = [...(acc[key] || []), row];
      return acc;
    }, {});
    const resultTableHtml = Object.entries(groupedRows).map(([group, groupRows]) => `
      <h2>${this.escapeHtml(group)}</h2>
      <table class="result-table">
        <thead>
          <tr><th>Test Name</th><th>Result</th><th>Unit</th><th>Reference Range</th><th>Flag</th></tr>
        </thead>
        <tbody>
          ${groupRows.map(row => `<tr>
            <td>${this.escapeHtml(row.testName)}</td>
            <td>${this.escapeHtml(row.result || '')}</td>
            <td>${this.escapeHtml(row.unit || '')}</td>
            <td>${this.escapeHtml(row.referenceRange || '')}</td>
            <td class="flag-${this.escapeHtml(row.flag || 'Normal')}">${this.escapeHtml(row.flag || 'Normal')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    `).join('');
    popup.document.write(`
      <html>
        <head>
          <title>Laboratory Result - ${this.escapeHtml(patientName)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; background: #e5e7eb; font-family: Arial, sans-serif; color: #111827; }
            .page { position: relative; width: 210mm; min-height: 297mm; margin: 18px auto; background: white; padding: 18mm 16mm; box-shadow: 0 18px 50px rgba(15, 23, 42, .18); overflow: hidden; }
            .watermark { position: absolute; inset: 38% auto auto 9%; transform: rotate(-18deg); font-size: 76px; font-weight: 900; color: rgba(220, 38, 38, .06); letter-spacing: .08em; }
            .lab-top { position: relative; border-top: 10px solid #dc2626; border-bottom: 5px solid #0f3b67; padding: 10px 0 8px; display: grid; grid-template-columns: 1fr 1.2fr; gap: 14px; align-items: center; }
            .lab-brand { display: flex; align-items: center; gap: 10px; color: #dc2626; }
            .drop { width: 26px; height: 38px; border: 4px solid #dc2626; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); }
            .brand-name { font-size: 28px; font-weight: 900; letter-spacing: .02em; line-height: .9; }
            .brand-sub { color: #0f3b67; font-size: 12px; font-weight: 800; margin-left: 39px; }
            .lab-right { text-align: right; color: #0f3b67; font-weight: 900; font-size: 16px; letter-spacing: .04em; }
            .lab-report-title { display: inline-block; margin-top: 12px; border-left: 5px solid #dc2626; color: #0f3b67; font-size: 20px; font-weight: 900; padding-left: 8px; }
            .doc-box { position: absolute; right: 0; top: 54px; width: 130px; padding: 6px; text-align: center; font-size: 9px; border: 1px solid #cbd5e1; background: white; }
            .barcode { margin: 6px auto 2px; height: 28px; width: 96px; background: repeating-linear-gradient(90deg, #111827 0 2px, transparent 2px 5px, #111827 5px 6px, transparent 6px 9px); }
            .report-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 14px; font-size: 11px; }
            .line { display: grid; grid-template-columns: 118px 1fr; border-bottom: 1px solid #94a3b8; padding: 3px 0; }
            h1 { margin: 18px 0 14px; font-size: 20px; text-align: center; text-transform: uppercase; letter-spacing: .08em; }
            h2 { margin: 18px 0 6px; border-bottom: 2px solid #111827; padding-bottom: 5px; font-size: 15px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; position: relative; z-index: 1; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
            th { width: 155px; background: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: .06em; }
            .result-table th { width: auto; border-left: 0; border-right: 0; background: white; }
            .result-table td { border-left: 0; border-right: 0; }
            .flag-Normal { color: #047857; font-weight: 900; }
            .flag-Low, .flag-High, .flag-Abnormal { color: #b45309; font-weight: 900; }
            .flag-Critical { color: #be123c; font-weight: 900; }
            .summary { margin-top: 16px; border-left: 5px solid #7c3aed; background: #faf5ff; padding: 14px; white-space: pre-line; font-size: 12px; line-height: 1.6; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 72px; font-size: 12px; }
            .sign-line { border-top: 1px solid #111827; padding-top: 8px; }
            .footer { position: absolute; left: 0; right: 0; bottom: 0; border-top: 4px solid #dc2626; background: #eff6ff; padding: 8px 16mm; text-align: center; font-size: 10px; color: #0f3b67; font-weight: 700; }
            @media print { body { background: white; } .page { margin: 0; box-shadow: none; width: auto; min-height: auto; } }
          </style>
        </head>
        <body>
          <section class="page">
            <div class="watermark">bethzatha</div>
            <div class="lab-top">
              <div>
                <div class="lab-brand"><span class="drop"></span><span class="brand-name">bethzatha</span></div>
                <div class="brand-sub">Advanced Medical Laboratory</div>
                <div class="lab-report-title">[ Laboratory Report ]</div>
              </div>
              <div class="lab-right">BETHZATHA ADVANCED MEDICAL LABORATORY</div>
              <div class="doc-box">Document No<div class="barcode"></div><strong>${this.escapeHtml(documentNo)}</strong></div>
            </div>
            <div class="report-meta">
              <div>
                <div class="line"><strong>Patient Name</strong><span>${this.escapeHtml(patientName)}</span></div>
                <div class="line"><strong>MRN</strong><span>${this.escapeHtml(patientMrn)}</span></div>
                <div class="line"><strong>Sample Origin</strong><span>${this.escapeHtml(lab.specimenType || 'As applicable')}</span></div>
                <div class="line"><strong>Clinical Data</strong><span>${this.escapeHtml(lab.clinicalNote || 'Not specified')}</span></div>
                <div class="line"><strong>Fasting</strong><span>Yes [ ] &nbsp;&nbsp; No [ ]</span></div>
              </div>
              <div>
                <div class="line"><strong>Requested By</strong><span>${this.escapeHtml(doctorName)}</span></div>
                <div class="line"><strong>Order Date</strong><span>${this.escapeHtml(lab.orderedDate)}</span></div>
                <div class="line"><strong>Report Date</strong><span>${this.escapeHtml(lab.completedDate || printedAt)}</span></div>
                <div class="line"><strong>Sample ID</strong><span>${this.escapeHtml(lab.id.slice(0, 8).toUpperCase())}</span></div>
                <div class="line"><strong>Document No</strong><span>${this.escapeHtml(documentNo)}</span></div>
              </div>
            </div>
            ${resultTableHtml}
            <div class="summary">${this.escapeHtml(lab.resultNotes || lab.result || 'No interpretation note entered.')}</div>
            <div class="signatures">
              <div class="sign-line">Lab Technologist: ${this.escapeHtml(lab.labTechName || '')}</div>
              <div class="sign-line">Authorized Clinician</div>
            </div>
            <div class="footer">Addis Ababa, Ethiopia | Core Lab Stadium Tel 011 554 15 15 | lab@bethzatha.com | www.bethzatha.com</div>
          </section>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
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

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
