import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { Patient, PatientStatus } from '../../core/models';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- TOP HEADER BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Patient Management & Registry</h1>
          <p class="text-xs text-slate-500 mt-1">Search, register, triage, and access electronic health records (EHR)</p>
        </div>

        <button 
          (click)="openRegisterModal()" 
          class="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-teal-500/20 flex items-center gap-2 self-start sm:self-auto hover:opacity-95 transition-opacity">
          <span class="material-icons text-base">person_add</span>
          <span>Register New Patient</span>
        </button>
      </div>

      <!-- PATIENTS DATA TABLE & FILTERS CARD -->
      <div class="bg-white rounded-2xl border border-slate-200/80 subtle-shadow overflow-hidden space-y-4">
        
        <!-- Filters Strip -->
        <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <div class="relative flex-1 sm:w-64">
              <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input 
                type="text" 
                [value]="patientSearchQuery()"
                (input)="onSearchInput($event)"
                placeholder="Search name, MRN, phone..." 
                class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div class="text-xs text-slate-500 font-medium self-end sm:self-center">
            Showing {{ filteredPatients().length }} of {{ store.patients().length }} Patients
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Patient Name / MRN</th>
                <th class="py-3.5 px-4">Demographics</th>
                <th class="py-3.5 px-4">Blood Group</th>
                <th class="py-3.5 px-4">Current Status</th>
                <th class="py-3.5 px-4">Ward / Bed</th>
                <th class="py-3.5 px-4">Attending Doctor</th>
                <th class="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (p of filteredPatients(); track p.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                        {{ p.name.charAt(0) }}
                      </div>
                      <div>
                        <div class="font-bold text-slate-900">{{ p.name }}</div>
                        <div class="text-[10px] text-slate-400 font-mono">MRN: {{ p.mrn }}</div>
                      </div>
                    </div>
                  </td>

                  <td class="py-3.5 px-4">
                    <div class="text-slate-800 font-medium">{{ p.gender }}, DOB: {{ p.dob }}</div>
                    <div class="text-[10px] text-slate-400">{{ p.phone }}</div>
                  </td>

                  <td class="py-3.5 px-4">
                    <span class="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[10px] font-bold">
                      {{ p.bloodType }}
                    </span>
                  </td>

                  <td class="py-3.5 px-4">
                    <span [class]="getStatusBadgeClass(p.status)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border">
                      {{ p.status }}
                    </span>
                  </td>

                  <td class="py-3.5 px-4">
                    @if (p.assignedBedNumber) {
                      <span class="font-mono text-slate-800 font-semibold text-xs">
                        {{ p.assignedWard }} - #{{ p.assignedBedNumber }}
                      </span>
                    } @else {
                      <span class="text-slate-400 italic text-[11px]">Unassigned</span>
                    }
                  </td>

                  <td class="py-3.5 px-4">
                    <div class="text-slate-800 font-medium">{{ p.assignedDoctorName || 'Not assigned' }}</div>
                  </td>

                  <td class="py-3.5 px-4 text-right">
                    <button 
                      (click)="openPatientEhr(p)"
                      class="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 font-semibold rounded-xl text-xs transition-colors border border-slate-200 flex items-center gap-1 ml-auto">
                      <span class="material-icons text-sm text-teal-600">folder_open</span>
                      <span>View EHR</span>
                    </button>
                  </td>

                </tr>
              }
            </tbody>
          </table>
        </div>

      </div>

      <!-- REGISTER PATIENT MODAL -->
      @if (isRegisterModalOpen()) {
        <div class="fixed inset-0 bg-slate-900/30 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scale-up space-y-6">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 class="text-base font-bold text-slate-900 font-display">New Patient Intake & Registration</h3>
              <button (click)="closeRegisterModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="patientForm" (ngSubmit)="submitRegistration()" class="space-y-4 text-xs">
              
              <div>
                <label for="p-name" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Full Legal Name *</label>
                <input id="p-name" type="text" formControlName="name" placeholder="e.g. Eleanor Vance" class="w-full px-3 py-2 border rounded-xl text-xs" />
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label for="p-dob" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Date of Birth *</label>
                  <input id="p-dob" type="date" formControlName="dob" class="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
                <div>
                  <label for="p-gender" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Gender *</label>
                  <select id="p-gender" formControlName="gender" class="w-full px-3 py-2 border rounded-xl text-xs">
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label for="p-blood" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Blood Type *</label>
                  <select id="p-blood" formControlName="bloodType" class="w-full px-3 py-2 border rounded-xl text-xs font-mono">
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="p-phone" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Contact Phone *</label>
                  <input id="p-phone" type="text" formControlName="phone" placeholder="+1 (555) 019-2831" class="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
                <div>
                  <label for="p-email" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Email Address</label>
                  <input id="p-email" type="email" formControlName="email" placeholder="eleanor@example.com" class="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
              </div>

              <div>
                <label for="p-address" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Residential Address</label>
                <input id="p-address" type="text" formControlName="address" placeholder="742 Evergreen Terrace, Springfield" class="w-full px-3 py-2 border rounded-xl text-xs" />
              </div>

              <div class="p-3 bg-rose-50/50 rounded-xl border border-rose-100 space-y-2">
                <label for="p-allergies" class="block text-xs font-bold text-rose-900 uppercase">Allergies & Medical Alerts</label>
                <input id="p-allergies" type="text" formControlName="allergies" placeholder="e.g. Penicillin, Latex, Peanuts" class="w-full px-3 py-1.5 border border-rose-200 rounded-lg text-xs bg-white" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="p-ins-prov" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Insurance Provider</label>
                  <input id="p-ins-prov" type="text" formControlName="insuranceProvider" placeholder="BlueCross BlueShield" class="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
                <div>
                  <label for="p-ins-num" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Policy Number</label>
                  <input id="p-ins-num" type="text" formControlName="insurancePolicyNumber" placeholder="BC-8839201" class="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" (click)="closeRegisterModal()" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl shadow-md shadow-teal-500/20">Register Patient</button>
              </div>

            </form>

          </div>
        </div>
      }

      <!-- PATIENT EHR QUICK DRAWER -->
      @if (selectedDrawerPatient()) {
        <div class="fixed inset-0 bg-slate-900/30 z-50 flex justify-end animate-fade-in">
          <button 
            type="button"
            (click)="selectedDrawerPatient.set(null)"
            class="flex-1 w-full h-full border-none p-0 cursor-default">
          </button>
          
          <div class="w-full max-w-xl bg-white h-full shadow-2xl p-6 sm:p-8 overflow-y-auto space-y-6 animate-slide-in">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 font-bold text-lg flex items-center justify-center border border-teal-200">
                  {{ selectedDrawerPatient()?.name?.charAt(0) }}
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900 font-display">{{ selectedDrawerPatient()?.name }}</h3>
                  <p class="text-xs text-slate-400 font-mono">MRN: {{ selectedDrawerPatient()?.mrn }}</p>
                </div>
              </div>
              <button (click)="selectedDrawerPatient.set(null)" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <span class="material-icons">close</span>
              </button>
            </div>

            <div class="space-y-4 text-xs">
              <div class="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium">
                <div>Demographics: <strong class="text-slate-900">{{ selectedDrawerPatient()?.gender }}, DOB: {{ selectedDrawerPatient()?.dob }}</strong></div>
                <div>Blood Group: <strong class="text-rose-600">{{ selectedDrawerPatient()?.bloodType }}</strong></div>
                <div>Phone: <strong class="text-slate-900">{{ selectedDrawerPatient()?.phone }}</strong></div>
                <div>Attending Doctor: <strong class="text-teal-700">{{ selectedDrawerPatient()?.assignedDoctorName || 'None' }}</strong></div>
              </div>

              <div>
                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Medical History & Encounters</h4>
                <div class="space-y-2">
                  @for (rec of getPatientMedicalRecords(selectedDrawerPatient()!.id); track rec.id) {
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <div class="flex items-center justify-between font-bold text-slate-900">
                        <span>{{ rec.diagnosis }}</span>
                        <span class="text-[10px] text-slate-400 font-normal">{{ rec.date }}</span>
                      </div>
                      <p class="text-slate-600 text-[11px]">{{ rec.clinicalNotes }}</p>
                    </div>
                  }
                </div>
              </div>
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class PatientsComponent {
  store = inject(StoreService);

  isRegisterModalOpen = signal(false);
  selectedDrawerPatient = signal<Patient | null>(null);
  patientSearchQuery = signal<string>('');

  filteredPatients = computed(() => {
    const q = this.patientSearchQuery().toLowerCase().trim();
    if (!q) return this.store.patients();
    return this.store.patients().filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  patientForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    dob: new FormControl('1990-01-01', [Validators.required]),
    gender: new FormControl<'Male' | 'Female' | 'Other'>('Female', [Validators.required]),
    bloodType: new FormControl<'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'>('O+', [Validators.required]),
    phone: new FormControl('', [Validators.required]),
    email: new FormControl(''),
    address: new FormControl(''),
    allergies: new FormControl('Penicillin'),
    insuranceProvider: new FormControl('BlueCross'),
    insurancePolicyNumber: new FormControl('BC-99201')
  });

  openRegisterModal() {
    this.isRegisterModalOpen.set(true);
  }

  closeRegisterModal() {
    this.isRegisterModalOpen.set(false);
  }

  onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.patientSearchQuery.set(val);
  }

  submitRegistration() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    const val = this.patientForm.value;
    const fullName = val.name!;
    const spaceIdx = fullName.indexOf(' ');
    const firstName = spaceIdx > 0 ? fullName.slice(0, spaceIdx) : fullName;
    const lastName = spaceIdx > 0 ? fullName.slice(spaceIdx + 1) : 'Patient';
    this.store.addPatient({
      name: fullName,
      firstName,
      lastName,
      dob: val.dob!,
      gender: val.gender!,
      bloodType: val.bloodType!,
      phone: val.phone!,
      email: val.email || '',
      address: val.address || '',
      allergyList: val.allergies ? [val.allergies] : [],
      status: 'IN_TRIAGE',
      insuranceProvider: val.insuranceProvider || '',
      insurancePolicyNumber: val.insurancePolicyNumber || '',
      emergencyContact: {
        name: 'Emergency Contact',
        relation: 'Family',
        phone: val.phone!
      },
      primaryCondition: 'Intake Assessment',
      vitals: {
        bp: '120/80',
        hr: 72,
        temp: 37.0,
        spo2: 98,
        respiratoryRate: 16,
        updatedAt: 'Just now'
      }
    });

    this.closeRegisterModal();
    this.patientForm.reset();
  }

  openPatientEhr(patient: Patient) {
    this.selectedDrawerPatient.set(patient);
  }

  getPatientMedicalRecords(patientId: string) {
    return this.store.medicalRecords().filter(r => r.patientId === patientId);
  }

  getStatusBadgeClass(status: PatientStatus): string {
    switch (status) {
      case 'IN_TRIAGE': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OUTPATIENT': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'ADMITTED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'DISCHARGED': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }
}
