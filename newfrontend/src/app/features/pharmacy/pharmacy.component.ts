import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-pharmacy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in pb-20">
      
      <!-- TOP BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Pharmacy & Medication Management</h1>
          <p class="text-xs text-slate-500 mt-1">Order fulfillment, dosage verification, and clinical dispensing</p>
        </div>

        @if (!isFormVisible()) {
          <button 
            (click)="isFormVisible.set(true)" 
            class="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-2xl text-xs shadow-xl shadow-slate-200 flex items-center gap-2 self-start sm:self-auto hover:bg-slate-800 transition-all active:scale-95">
            <span class="material-icons text-base">medication</span>
            <span>New Prescription Order</span>
          </button>
        }
      </div>

      <!-- INLINE PRESCRIPTION FORM -->
      @if (isFormVisible()) {
        <div class="bg-white rounded-3xl border-2 border-emerald-500/20 shadow-2xl shadow-emerald-500/5 overflow-hidden animate-slide-down">
          <div class="bg-emerald-50/50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <span class="material-icons text-base">medical_services</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">Issue New Prescription</h3>
                <p class="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Medication Order Entry</p>
              </div>
            </div>
            <button (click)="isFormVisible.set(false)" class="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form [formGroup]="rxForm" (ngSubmit)="submitPrescription()" class="p-6 sm:p-8 space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <!-- Column 1: Patient Selection -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-emerald-500 rounded-full"></span> Target Patient
                </h4>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Select Patient *</label>
                  <select formControlName="patientId" [class]="inputClasses">
                    @for (p of store.patients(); track p.id) {
                      <option [value]="p.id">{{ p.name }} ({{ p.mrn }})</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Column 2: Medication Details -->
              <div class="space-y-4 lg:col-span-2">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-teal-500 rounded-full"></span> Drug & Dosage Info
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Drug Name *</label>
                    <input type="text" formControlName="medName" placeholder="e.g. Amoxicillin" [class]="inputClasses" />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Dosage *</label>
                      <input type="text" formControlName="dosage" placeholder="500mg" [class]="inputClasses" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Duration *</label>
                      <input type="text" formControlName="duration" placeholder="7 days" [class]="inputClasses" />
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Frequency *</label>
                    <input type="text" formControlName="frequency" placeholder="3x Daily" [class]="inputClasses" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Special Instructions</label>
                    <input type="text" formControlName="instructions" placeholder="Take after meals" [class]="inputClasses" />
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button type="button" (click)="isFormVisible.set(false)" class="px-6 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Discard</button>
              <button type="submit" class="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:scale-95">
                Authorize Prescription
              </button>
            </div>
          </form>
        </div>
      }

      <!-- PRESCRIPTIONS QUEUE -->
      <div class="space-y-4">
        @for (rx of store.prescriptions(); track rx.id) {
          <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-5">
            
            <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center shadow-inner">
                  <span class="material-icons text-2xl">pill</span>
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900">{{ rx.patientName }}</h3>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[10px] text-slate-400 font-mono uppercase tracking-widest">MRN: {{ rx.patientMrn }}</span>
                    <span class="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span class="text-[10px] text-slate-400 font-medium italic">Ordered by {{ rx.doctorName }} • {{ rx.date }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span [class]="rx.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'" 
                  class="px-4 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest">
                  {{ rx.status }}
                </span>

                @if (rx.status === 'PENDING') {
                  <button 
                    (click)="store.dispensePrescription(rx.id)" 
                    class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2">
                    <span class="material-icons text-sm">check_circle</span>
                    Dispense
                  </button>
                }
              </div>
            </div>

            <!-- Itemized Medications Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (med of rx.medications; track med.name) {
                <div class="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-start justify-between relative overflow-hidden group">
                  <div class="absolute right-0 top-0 w-1 h-full bg-emerald-500/20"></div>
                  <div>
                    <div class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Prescribed Med</div>
                    <div class="font-bold text-slate-900 text-sm">{{ med.name }}</div>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs font-bold text-slate-700">{{ med.dosage }}</span>
                      <span class="text-[10px] text-slate-400 font-bold">• {{ med.frequency }}</span>
                    </div>
                    <div class="text-slate-500 text-[11px] mt-2 bg-white px-2 py-1 rounded-lg inline-block border border-slate-100 italic">
                       {{ med.duration }} course — {{ med.instructions }}
                    </div>
                  </div>
                </div>
              }
            </div>

            @if (rx.pharmacyNotes) {
              <div class="text-[11px] text-emerald-800 font-medium bg-emerald-50 p-3 rounded-xl border border-emerald-100/50 flex items-center gap-2">
                <span class="material-icons text-sm text-emerald-500">verified_user</span>
                Pharmacist Note: {{ rx.pharmacyNotes }}
              </div>
            }
          </div>
        } @empty {
          <div class="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
             <span class="material-icons text-slate-200 text-6xl mb-4">medical_information</span>
             <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">The Prescription Queue is Empty</p>
          </div>
        }
      </div>

    </div>
  `
})
export class PharmacyComponent {
  store = inject(StoreService);

  isFormVisible = signal(false);

  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all';

  rxForm = new FormGroup({
    patientId: new FormControl('p-1', [Validators.required]),
    medName: new FormControl('', [Validators.required]),
    dosage: new FormControl('500mg', [Validators.required]),
    frequency: new FormControl('Twice daily', [Validators.required]),
    duration: new FormControl('14 days', [Validators.required]),
    instructions: new FormControl('Take after breakfast and dinner')
  });

  submitPrescription() {
    if (this.rxForm.invalid) {
      this.rxForm.markAllAsTouched();
      return;
    }

    const val = this.rxForm.value;
    const patient = this.store.patients().find(p => p.id === val.patientId);

    if (patient) {
      this.store.addPrescription({
        patientId: patient.id,
        patientName: patient.name,
        patientMrn: patient.mrn,
        doctorId: this.store.currentUser()?.id || 'u-101',
        doctorName: this.store.currentUser()?.name || 'Dr. Sarah Jenkins',
        medications: [{
          name: val.medName!,
          dosage: val.dosage!,
          frequency: val.frequency!,
          duration: val.duration!,
          instructions: val.instructions || 'As directed by doctor'
        }]
      });
    }

    this.isFormVisible.set(false);
    this.rxForm.reset({ patientId: 'p-1', dosage: '500mg', frequency: 'Twice daily', duration: '14 days' });
  }
}