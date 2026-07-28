import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { LabOrder } from '../../core/models';

@Component({
  selector: 'app-laboratory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- TOP HEADER BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Central Laboratory & Diagnostic Testing</h1>
          <p class="text-xs text-slate-500 mt-1">Sample tracking, pathology, hematology, biochemistry, and automated EHR result posting</p>
        </div>

        <button 
          (click)="openOrderModal()" 
          class="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl text-xs shadow-md shadow-purple-500/20 flex items-center gap-2 self-start sm:self-auto">
          <span class="material-icons text-base">biotech</span>
          <span>Order Lab Test</span>
        </button>
      </div>

      <!-- LAB ORDERS QUEUE GRID -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (lab of store.labOrders(); track lab.id) {
          <div class="bg-white rounded-2xl p-5 border border-slate-200/80 subtle-shadow space-y-4 flex flex-col justify-between">
            
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                  {{ lab.category }}
                </span>
                <span [class]="getLabStatusClass(lab.status)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                  {{ lab.status }}
                </span>
              </div>

              <div>
                <h3 class="text-sm font-bold text-slate-900 font-display">{{ lab.testName }}</h3>
                <p class="text-xs text-slate-500 font-medium">Patient: {{ lab.patientName }} ({{ lab.patientMrn }})</p>
                <p class="text-[10px] text-slate-400 mt-0.5">Ordered by {{ lab.doctorName }} • {{ lab.orderedDate }}</p>
              </div>

              <!-- Result Box if Completed -->
              @if (lab.status === 'COMPLETED') {
                <div [class]="lab.isAbnormal ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-800'" class="p-3 rounded-xl border space-y-1">
                  <div class="flex items-center justify-between text-[10px] font-bold uppercase">
                    <span>Lab Result Output</span>
                    @if (lab.isAbnormal) {
                      <span class="text-rose-600 font-extrabold flex items-center gap-0.5">
                        <span class="material-icons text-xs">error</span> ABNORMAL
                      </span>
                    } @else {
                      <span class="text-emerald-600 font-extrabold">NORMAL</span>
                    }
                  </div>
                  <div class="text-base font-black font-mono">
                    {{ lab.result }} <span class="text-xs font-normal text-slate-500">{{ lab.unit }}</span>
                  </div>
                  <div class="text-[10px] text-slate-400">Reference Benchmark: {{ lab.normalRange }} {{ lab.unit }}</div>
                </div>
              }
            </div>

            <!-- Action buttons depending on status -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-end">
              @if (lab.status !== 'COMPLETED') {
                <button 
                  (click)="openResultModal(lab)" 
                  class="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5">
                  <span class="material-icons text-base">edit_note</span>
                  <span>Record Results</span>
                </button>
              } @else {
                <span class="text-[10px] text-slate-400 font-mono">Tech: {{ lab.labTechName }}</span>
              }
            </div>

          </div>
        }
      </div>

      <!-- ORDER LAB TEST MODAL -->
      @if (isOrderModalOpen()) {
        <div class="fixed inset-0 bg-slate-900/30 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scale-up space-y-6">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 class="text-base font-bold text-slate-900 font-display">Order Diagnostic Lab Test</h3>
              <button (click)="closeOrderModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="orderForm" (ngSubmit)="submitOrder()" class="space-y-4 text-xs">
              <div>
                <label for="lab-patient-id" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Select Patient *</label>
                <select id="lab-patient-id" formControlName="patientId" class="w-full px-3 py-2 border rounded-xl text-xs">
                  @for (p of store.patients(); track p.id) {
                    <option [value]="p.id">{{ p.name }} ({{ p.mrn }})</option>
                  }
                </select>
              </div>

              <div>
                <label for="lab-test-name" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Diagnostic Test Name *</label>
                <input id="lab-test-name" type="text" formControlName="testName" placeholder="e.g. Cardiac Troponin I, Complete Blood Count" class="w-full px-3 py-2 border rounded-xl text-xs" />
              </div>

              <div>
                <label for="lab-category" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Category *</label>
                <select id="lab-category" formControlName="category" class="w-full px-3 py-2 border rounded-xl text-xs">
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Hematology">Hematology</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Pathology">Pathology</option>
                </select>
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" (click)="closeOrderModal()" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl shadow-md shadow-purple-500/20">Submit Lab Order</button>
              </div>
            </form>

          </div>
        </div>
      }

      <!-- ENTER RESULT MODAL -->
      @if (selectedLabForResult()) {
        <div class="fixed inset-0 bg-slate-900/30 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scale-up space-y-6">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 class="text-base font-bold text-slate-900 font-display">Record Lab Result</h3>
                <p class="text-xs text-slate-400">{{ selectedLabForResult()?.testName }} for {{ selectedLabForResult()?.patientName }}</p>
              </div>
              <button (click)="selectedLabForResult.set(null)" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="resultForm" (ngSubmit)="submitResult()" class="space-y-4 text-xs">
              
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="lab-res-val" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Result Value *</label>
                  <input id="lab-res-val" type="text" formControlName="result" placeholder="e.g. 1.4" class="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
                <div>
                  <label for="lab-res-unit" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Unit of Measurement</label>
                  <input id="lab-res-unit" type="text" formControlName="unit" placeholder="e.g. ng/mL" class="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
              </div>

              <div>
                <label for="lab-res-range" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Normal Benchmark Range</label>
                <input id="lab-res-range" type="text" formControlName="normalRange" placeholder="e.g. 0.0 - 0.04" class="w-full px-3 py-2 border rounded-xl text-xs" />
              </div>

              <div class="flex items-center gap-2 pt-2">
                <input type="checkbox" formControlName="isAbnormal" id="abnormalCheck" class="rounded bg-slate-100 border-slate-300 text-rose-600 focus:ring-rose-500" />
                <label for="abnormalCheck" class="text-xs font-bold text-rose-600 cursor-pointer">Mark Result as Clinically ABNORMAL / STAT</label>
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" (click)="selectedLabForResult.set(null)" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl shadow-md shadow-purple-500/20">Post Result to EHR</button>
              </div>

            </form>

          </div>
        </div>
      }

    </div>
  `
})
export class LaboratoryComponent {
  store = inject(StoreService);

  isOrderModalOpen = signal(false);
  selectedLabForResult = signal<LabOrder | null>(null);

  orderForm = new FormGroup({
    patientId: new FormControl('p-1', [Validators.required]),
    testName: new FormControl('', [Validators.required]),
    category: new FormControl<'Biochemistry' | 'Hematology' | 'Radiology' | 'Microbiology' | 'Pathology'>('Biochemistry', [Validators.required])
  });

  resultForm = new FormGroup({
    result: new FormControl('', [Validators.required]),
    unit: new FormControl('mg/dL'),
    normalRange: new FormControl('70 - 110'),
    isAbnormal: new FormControl(false)
  });

  openOrderModal() {
    this.isOrderModalOpen.set(true);
  }

  closeOrderModal() {
    this.isOrderModalOpen.set(false);
  }

  submitOrder() {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    const val = this.orderForm.value;
    const patient = this.store.patients().find(p => p.id === val.patientId);

    if (patient) {
      const categoryVal = val.category || 'Biochemistry';
      this.store.addLabOrder({
        patientId: patient.id,
        patientName: patient.name,
        patientMrn: patient.mrn,
        doctorId: this.store.currentUser()?.id || 'u-101',
        doctorName: this.store.currentUser()?.name || 'Dr. Sarah Jenkins',
        testName: val.testName!,
        category: categoryVal
      });
    }

    this.closeOrderModal();
    this.orderForm.reset();
  }

  openResultModal(lab: LabOrder) {
    this.selectedLabForResult.set(lab);
    this.resultForm.reset({
      result: '1.2',
      unit: 'ng/mL',
      normalRange: '0.0 - 0.04',
      isAbnormal: true
    });
  }

  submitResult() {
    const lab = this.selectedLabForResult();
    if (!lab || this.resultForm.invalid) return;

    const val = this.resultForm.value;
    this.store.updateLabResult(
      lab.id,
      val.result!,
      val.normalRange || 'N/A',
      val.unit || '',
      !!val.isAbnormal
    );

    this.selectedLabForResult.set(null);
  }

  getLabStatusClass(status: string): string {
    switch (status) {
      case 'ORDERED': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'SAMPLE_COLLECTED': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'IN_ANALYSIS': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  }
}
