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
    <div class="space-y-6 animate-fade-in">
      
      <!-- TOP BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Inpatient & Outpatient Pharmacy</h1>
          <p class="text-xs text-slate-500 mt-1">Prescription order fulfillment, dosage checking, and clinical medication dispensing</p>
        </div>

        <button 
          (click)="openPrescribeModal()" 
          class="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 self-start sm:self-auto">
          <span class="material-icons text-base">medication</span>
          <span>New Prescription Order</span>
        </button>
      </div>

      <!-- PRESCRIPTIONS QUEUE LIST -->
      <div class="space-y-4">
        @for (rx of store.prescriptions(); track rx.id) {
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 subtle-shadow space-y-4">
            
            <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center">
                  <span class="material-icons text-xl">medication_liquid</span>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900 font-display">{{ rx.patientName }}</h3>
                  <p class="text-xs text-slate-400">MRN: {{ rx.patientMrn }} • Prescribed by {{ rx.doctorName }} on {{ rx.date }}</p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span [class]="rx.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'" class="px-3 py-1 rounded-full text-xs font-bold uppercase border">
                  {{ rx.status }}
                </span>

                @if (rx.status === 'PENDING') {
                  <button 
                    (click)="store.dispensePrescription(rx.id)" 
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5">
                    <span class="material-icons text-base">check_circle</span>
                    <span>Dispense Rx</span>
                  </button>
                }
              </div>
            </div>

            <!-- Itemized Medications List -->
            <div class="space-y-2">
              <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prescribed Medications</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                @for (med of rx.medications; track med.name) {
                  <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between text-xs">
                    <div>
                      <div class="font-bold text-slate-900 text-sm">{{ med.name }}</div>
                      <div class="text-emerald-700 font-semibold mt-0.5">{{ med.dosage }} • {{ med.frequency }}</div>
                      <div class="text-slate-500 text-[11px] mt-1">Duration: {{ med.duration }} • Instructions: {{ med.instructions }}</div>
                    </div>
                    <span class="px-2 py-0.5 rounded bg-white text-slate-600 border font-mono text-[10px] font-bold">Rx Approved</span>
                  </div>
                }
              </div>
            </div>

            @if (rx.pharmacyNotes) {
              <div class="text-xs text-slate-500 italic bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                <span class="material-icons text-sm text-emerald-600">verified</span>
                {{ rx.pharmacyNotes }}
              </div>
            }

          </div>
        }
      </div>

      <!-- CREATE PRESCRIPTION MODAL -->
      @if (isPrescribeModalOpen()) {
        <div class="fixed inset-0 bg-slate-900/30 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scale-up space-y-6">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 class="text-base font-bold text-slate-900 font-display">New Medication Prescription Order</h3>
              <button (click)="closePrescribeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="rxForm" (ngSubmit)="submitPrescription()" class="space-y-4 text-xs">
              
              <div>
                <label for="rx-patient-id" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Select Patient *</label>
                <select id="rx-patient-id" formControlName="patientId" class="w-full px-3 py-2 border rounded-xl text-xs">
                  @for (p of store.patients(); track p.id) {
                    <option [value]="p.id">{{ p.name }} ({{ p.mrn }})</option>
                  }
                </select>
              </div>

              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div class="font-bold text-slate-800 uppercase text-[10px]">Medication Entry</div>
                
                <div>
                  <label for="rx-med-name" class="block text-[10px] font-semibold uppercase text-slate-500 mb-1">Drug Name *</label>
                  <input id="rx-med-name" type="text" formControlName="medName" placeholder="e.g. Amoxicillin Trihydrate" class="w-full px-3 py-2 border rounded-xl bg-white" />
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label for="rx-dosage" class="block text-[10px] font-semibold uppercase text-slate-500 mb-1">Dosage *</label>
                    <input id="rx-dosage" type="text" formControlName="dosage" placeholder="500mg" class="w-full px-3 py-2 border rounded-xl bg-white" />
                  </div>
                  <div>
                    <label for="rx-freq" class="block text-[10px] font-semibold uppercase text-slate-500 mb-1">Frequency *</label>
                    <input id="rx-freq" type="text" formControlName="frequency" placeholder="3x daily with meals" class="w-full px-3 py-2 border rounded-xl bg-white" />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label for="rx-duration" class="block text-[10px] font-semibold uppercase text-slate-500 mb-1">Duration *</label>
                    <input id="rx-duration" type="text" formControlName="duration" placeholder="7 days" class="w-full px-3 py-2 border rounded-xl bg-white" />
                  </div>
                  <div>
                    <label for="rx-instruct" class="block text-[10px] font-semibold uppercase text-slate-500 mb-1">Instructions</label>
                    <input id="rx-instruct" type="text" formControlName="instructions" placeholder="Finish full course" class="w-full px-3 py-2 border rounded-xl bg-white" />
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" (click)="closePrescribeModal()" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md shadow-emerald-500/20">Issue Prescription</button>
              </div>

            </form>

          </div>
        </div>
      }

    </div>
  `
})
export class PharmacyComponent {
  store = inject(StoreService);

  isPrescribeModalOpen = signal(false);

  rxForm = new FormGroup({
    patientId: new FormControl('p-1', [Validators.required]),
    medName: new FormControl('', [Validators.required]),
    dosage: new FormControl('500mg', [Validators.required]),
    frequency: new FormControl('Twice daily', [Validators.required]),
    duration: new FormControl('14 days', [Validators.required]),
    instructions: new FormControl('Take after breakfast and dinner')
  });

  openPrescribeModal() {
    this.isPrescribeModalOpen.set(true);
  }

  closePrescribeModal() {
    this.isPrescribeModalOpen.set(false);
  }

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

    this.closePrescribeModal();
    this.rxForm.reset();
  }
}
