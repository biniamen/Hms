import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
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
    <div class="space-y-6 animate-fade-in pb-20">
      
      <!-- TOP HEADER BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Central Laboratory & Diagnostics</h1>
          <p class="text-xs text-slate-500 mt-1">Pathology, biochemistry, and automated diagnostic result documentation</p>
        </div>

        @if (!isFormVisible() && !selectedLabForResult()) {
          <button 
            (click)="isFormVisible.set(true)" 
            class="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-2xl text-xs shadow-xl shadow-slate-200 flex items-center gap-2 self-start sm:self-auto hover:bg-slate-800 transition-all active:scale-95">
            <span class="material-icons text-base">biotech</span>
            <span>Order Lab Test</span>
          </button>
        }
      </div>

      <!-- INLINE FORM AREA (Order Entry or Result Entry) -->
      @if (isFormVisible() || selectedLabForResult()) {
        <div class="bg-white rounded-3xl border-2 border-purple-500/20 shadow-2xl shadow-purple-500/5 overflow-hidden animate-slide-down">
          
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
          @if (!selectedLabForResult()) {
            <form [formGroup]="orderForm" (ngSubmit)="submitOrder()" class="p-6 sm:p-8 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Target Patient *</label>
                  <select formControlName="patientId" [class]="inputClasses">
                    @for (p of store.patients(); track p.id) {
                      <option [value]="p.id">{{ p.name }} (MRN: {{ p.mrn }})</option>
                    }
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Diagnostic Test *</label>
                  <input type="text" formControlName="testName" placeholder="e.g. Troponin, HbA1c" [class]="inputClasses" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Category *</label>
                  <select formControlName="category" [class]="inputClasses">
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Hematology">Hematology</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Pathology">Pathology</option>
                  </select>
                </div>
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
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Result Value *</label>
                  <input type="text" formControlName="result" placeholder="e.g. 14.2" [class]="inputClasses + ' font-mono text-base font-bold'" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Unit</label>
                    <input type="text" formControlName="unit" placeholder="g/dL" [class]="inputClasses" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Normal Range</label>
                    <input type="text" formControlName="normalRange" placeholder="13.5 - 17.5" [class]="inputClasses" />
                  </div>
                </div>
                <div class="flex items-center gap-3 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                  <input type="checkbox" formControlName="isAbnormal" id="ab-check-inline" class="w-5 h-5 rounded border-rose-300 text-rose-600 focus:ring-rose-500" />
                  <label for="ab-check-inline" class="text-[11px] font-black text-rose-700 uppercase tracking-wider cursor-pointer">
                    Flag as Clinically Abnormal
                  </label>
                </div>
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
                   <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">{{ lab.patientName.charAt(0) }}</div>
                   <div>
                     <p class="text-xs text-slate-700 font-bold">{{ lab.patientName }}</p>
                     <p class="text-[9px] text-slate-400 font-mono tracking-tighter">ID: {{ lab.patientMrn }}</p>
                   </div>
                </div>
                <p class="text-[10px] text-slate-400 mt-3 font-medium italic">Ordered by {{ lab.doctorName }} • {{ lab.orderedDate }}</p>
              </div>

              <!-- Result Visualization -->
              @if (lab.status === 'COMPLETED') {
                <div [class]="lab.isAbnormal ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'" class="p-4 rounded-2xl border space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Laboratory Output</span>
                    @if (lab.isAbnormal) {
                      <span class="text-rose-600 font-black text-[9px] flex items-center gap-1 uppercase">
                        <span class="material-icons text-[12px]">warning</span> ABNORMAL
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
                @if (lab.status !== 'COMPLETED') {
                  <button 
                    (click)="openResultForm(lab)" 
                    class="w-full py-2.5 bg-slate-900 hover:bg-purple-600 text-white font-bold rounded-xl text-[11px] shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <span class="material-icons text-base">science</span>
                    Record Result
                  </button>
                } @else {
                  <div class="pt-2 flex items-center justify-between border-t border-slate-50">
                    <span class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Tech: {{ lab.labTechName }}</span>
                    <span class="material-icons text-teal-500 text-sm">verified</span>
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

  // Standardized classes for input consistency across the dashboard
  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all';

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

  closeForm() {
    this.isFormVisible.set(false);
    this.selectedLabForResult.set(null);
    this.orderForm.reset({ patientId: 'p-1', category: 'Biochemistry' });
    this.resultForm.reset();
  }

  submitOrder() {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }
    
    const val = this.orderForm.value;
    const patient = this.store.patients().find(p => p.id === val.patientId);

    if (patient) {
      this.store.addLabOrder({
        patientId: patient.id,
        patientName: patient.name,
        patientMrn: patient.mrn,
        doctorId: this.store.currentUser()?.id || 'u-101',
        doctorName: this.store.currentUser()?.name || 'Dr. Sarah Jenkins',
        testName: val.testName!,
        category: val.category!
      });
    }
    this.closeForm();
  }

  openResultForm(lab: LabOrder) {
    this.selectedLabForResult.set(lab);
    this.isFormVisible.set(false); // Close order form if open
    this.resultForm.reset({
      result: '',
      unit: 'ng/mL',
      normalRange: '0.0 - 0.04',
      isAbnormal: false
    });
    // Scroll to top for focus
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    this.closeForm();
  }

  getLabStatusClass(status: string): string {
    switch (status) {
      case 'ORDERED': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'SAMPLE_COLLECTED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_ANALYSIS': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }
}