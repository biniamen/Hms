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
    <div class="space-y-6 animate-fade-in pb-20">
      
      <!-- TOP HEADER BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Patient Management & Registry</h1>
          <p class="text-xs text-slate-500 mt-1">Search, register, triage, and access electronic health records (EHR)</p>
        </div>

        @if (!isFormVisible()) {
          <button 
            (click)="isFormVisible.set(true)" 
            class="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-2xl text-xs shadow-xl shadow-slate-200 flex items-center gap-2 self-start sm:self-auto hover:bg-slate-800 transition-all active:scale-95">
            <span class="material-icons text-base">person_add</span>
            <span>Register New Patient</span>
          </button>
        }
      </div>

      <!-- INLINE PATIENT REGISTRATION FORM -->
      @if (isFormVisible()) {
        <div class="bg-white rounded-3xl border-2 border-teal-500/20 shadow-2xl shadow-teal-500/5 overflow-hidden animate-slide-down">
          <div class="bg-teal-50/50 px-6 py-4 border-b border-teal-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                <span class="material-icons text-base">person_add</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">New Patient Intake</h3>
                <p class="text-[10px] text-teal-600 font-bold uppercase tracking-widest">Complete all required fields</p>
              </div>
            </div>
            <button (click)="isFormVisible.set(false)" class="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form [formGroup]="patientForm" (ngSubmit)="submitRegistration()" class="p-6 sm:p-8 space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <!-- Personal Info -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-teal-500 rounded-full"></span> Basic Information
                </h4>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Full Name *</label>
                  <input type="text" formControlName="name" placeholder="e.g. John Doe" [class]="inputClasses" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">DOB *</label>
                    <input type="date" formControlName="dob" [class]="inputClasses" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Gender *</label>
                    <select formControlName="gender" [class]="inputClasses">
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Contact -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-blue-500 rounded-full"></span> Contact Details
                </h4>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Phone *</label>
                  <input type="text" formControlName="phone" placeholder="+1..." [class]="inputClasses" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Address</label>
                  <input type="text" formControlName="address" placeholder="Street, City" [class]="inputClasses" />
                </div>
              </div>

              <!-- Medical -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-rose-500 rounded-full"></span> Clinical Data
                </h4>
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Blood Type</label>
                    <select formControlName="bloodType" [class]="inputClasses + ' font-mono'">
                      <option value="O+">O+</option><option value="A+">A+</option>
                      <option value="B+">B+</option><option value="AB+">AB+</option>
                    </select>
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Insurance</label>
                    <select formControlName="insuranceCompanyId" [class]="inputClasses">
                      <option value="">Self Pay / Cash</option>
                      @for (company of store.insuranceCompanies(); track company.id) {
                        <option [value]="company.id">
                          {{ company.name }} - {{ company.coveragePercent }}% {{ company.spouseCoverageAllowed ? '(spouse covered)' : '' }}
                        </option>
                      }
                    </select>
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Policy / Membership No.</label>
                  <input type="text" formControlName="insurancePolicyNumber" placeholder="Policy number" [class]="inputClasses" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-rose-600 ml-1 uppercase">Alerts / Allergies</label>
                  <input type="text" formControlName="allergies" placeholder="e.g. Penicillin" [class]="inputClasses + ' border-rose-200 focus:border-rose-500 focus:ring-rose-500/5'" />
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button type="button" (click)="isFormVisible.set(false)" class="px-6 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Discard</button>
              <button type="submit" class="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-0.5 active:scale-95">
                Save & Register
              </button>
            </div>
          </form>
        </div>
      }

      <!-- TABLE AREA -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <!-- Filter Header -->
        <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div class="relative w-full sm:w-64">
            <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input 
              type="text" 
              [value]="patientSearchQuery()"
              (input)="onSearchInput($event)"
              placeholder="Search patients..." 
              class="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
            />
          </div>
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Registry: {{ filteredPatients().length }} Records
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th class="py-4 px-4">Profile</th>
                <th class="py-4 px-4">Demographics</th>
                <th class="py-4 px-4 text-center">Blood</th>
                <th class="py-4 px-4">Status</th>
                <th class="py-4 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (store.isLoading() && filteredPatients().length === 0) {
                <tr>
                  <td colspan="5" class="py-14 text-center">
                    <div class="inline-flex items-center gap-3 text-slate-400">
                      <div class="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <span class="text-xs font-bold uppercase tracking-widest">Loading patient registry…</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (p of filteredPatients(); track p.id) {
                  <tr class="hover:bg-slate-50/50 transition-colors">
                    <td class="py-4 px-4">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200 uppercase">
                          {{ p.name.charAt(0) }}
                        </div>
                        <div>
                          <div class="font-bold text-slate-900">{{ p.name }}</div>
                          <div class="text-[10px] text-slate-400 font-mono">ID: {{ p.mrn }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="py-4 px-4 text-slate-700">{{ p.gender }}, {{ p.dob }}</td>
                    <td class="py-4 px-4 text-center">
                      <span class="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 font-mono text-[10px] font-bold uppercase">{{ p.bloodType }}</span>
                    </td>
                    <td class="py-4 px-4">
                      <span [class]="getStatusBadgeClass(p.status)" class="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border">
                        {{ p.status }}
                      </span>
                    </td>
                    <td class="py-4 px-4 text-right">
                      <button (click)="openPatientEhr(p)" class="px-3 py-1.5 bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-700 font-bold rounded-xl text-[10px] transition-all">
                        View EHR
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="py-14 text-center">
                      <div class="text-xs text-slate-400">
                        <div class="material-icons text-3xl text-slate-300 mb-2">{{ patientSearchQuery() ? 'search_off' : 'person_search' }}</div>
                        @if (patientSearchQuery()) {
                          <p class="font-semibold text-slate-500">No patients match “{{ patientSearchQuery() }}”</p>
                          <p class="mt-1">Try a different name or MRN.</p>
                        } @else if (store.currentUser()?.role === 'DOCTOR') {
                          <p class="font-semibold text-slate-500">No patients assigned to you yet</p>
                          <p class="mt-1">Patients you have an appointment with will appear here.</p>
                        } @else {
                          <p class="font-semibold text-slate-500">No patients in the registry yet</p>
                          <p class="mt-1">Use “Register New Patient” to add the first record.</p>
                        }
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- PATIENT EHR QUICK DRAWER -->
      @if (selectedDrawerPatient()) {
        <div class="fixed inset-0 flex justify-end bg-slate-900/20 backdrop-blur-sm animate-fade-in">
          <!-- Backdrop closer -->
          <div (click)="selectedDrawerPatient.set(null)" class="flex-1 cursor-default"></div>
          
          <!-- Drawer Content -->
          <div class="w-full max-w-xl bg-white h-full shadow-2xl p-6 sm:p-8 overflow-y-auto space-y-6 animate-slide-in">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-teal-500 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-teal-500/20 uppercase">
                  {{ selectedDrawerPatient()?.name?.charAt(0) }}
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900 font-display">{{ selectedDrawerPatient()?.name }}</h3>
                  <p class="text-[11px] text-slate-400 font-mono uppercase tracking-widest">MRN: {{ selectedDrawerPatient()?.mrn }}</p>
                </div>
              </div>
              <button (click)="selectedDrawerPatient.set(null)" class="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                <span class="material-icons">close</span>
              </button>
            </div>

            <div class="space-y-6">
              <!-- Demographics Card -->
              <div class="grid grid-cols-2 gap-4 p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div class="space-y-1">
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Basic Data</p>
                  <p class="text-xs font-bold text-slate-700">{{ selectedDrawerPatient()?.gender }}, {{ selectedDrawerPatient()?.dob }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Blood Group</p>
                  <p class="text-xs font-black text-rose-600 uppercase">{{ selectedDrawerPatient()?.bloodType }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</p>
                  <p class="text-xs font-bold text-slate-700">{{ selectedDrawerPatient()?.phone }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                  <p class="text-[10px] font-black text-teal-600 uppercase">{{ selectedDrawerPatient()?.status }}</p>
                </div>
              </div>

              <!-- Medical History -->
              <div>
                <h4 class="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span class="w-1.5 h-4 bg-teal-500 rounded-full"></span>
                  Clinical History
                </h4>
                <div class="space-y-3">
                  @for (rec of getPatientMedicalRecords(selectedDrawerPatient()!.id); track rec.id) {
                    <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-teal-300 transition-colors">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-900">{{ rec.diagnosis }}</span>
                        <span class="text-[10px] text-slate-400 font-mono">{{ rec.date }}</span>
                      </div>
                      <p class="text-[11px] text-slate-500 leading-relaxed">{{ rec.clinicalNotes }}</p>
                    </div>
                  } @empty {
                    <div class="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p class="text-xs text-slate-400 italic">No historical records found for this patient.</p>
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
  isFormVisible = signal(false);
  selectedDrawerPatient = signal<Patient | null>(null); // State for the EHR Drawer
  patientSearchQuery = signal<string>('');

  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all';

  filteredPatients = computed(() => {
    const q = this.patientSearchQuery().toLowerCase().trim();
    if (!q) return this.store.patients();
    return this.store.patients().filter(p => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q));
  });

  patientForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    dob: new FormControl('1990-01-01', [Validators.required]),
    gender: new FormControl<'Male' | 'Female'>('Female', [Validators.required]),
    bloodType: new FormControl('O+', [Validators.required]),
    phone: new FormControl('', [Validators.required, Validators.minLength(9)]),
    address: new FormControl(''),
    allergies: new FormControl('None'),
    insuranceCompanyId: new FormControl(''),
    insurancePolicyNumber: new FormControl('')
  });

  constructor() {
    this.store.loadInsuranceCompanies();
  }

  submitRegistration() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      this.store.addToast('error', 'Registration Validation', 'Patient full name, date of birth, gender, and phone are required.');
      return;
    }
    const val = this.patientForm.value;
    const company = this.store.insuranceCompanies().find(item => item.id === val.insuranceCompanyId);
    this.store.addPatient({
      name: val.name ?? '',
      firstName: (val.name ?? '').split(' ')[0],
      lastName: (val.name ?? '').split(' ').slice(1).join(' ') || 'Patient',
      dob: val.dob ?? '',
      gender: val.gender ?? 'Female',
      bloodType: val.bloodType ?? 'O+',
      phone: val.phone ?? '',
      address: val.address ?? '',
      email: '',
      insuranceProvider: company?.name || 'Self Pay',
      insuranceCompanyId: company?.id,
      insuranceCompanyName: company?.name,
      insurancePolicyNumber: val.insurancePolicyNumber ?? '',
      allergyList: val.allergies ? [val.allergies] : [],
      status: 'IN_TRIAGE',
      emergencyContact: { name: '', relation: '', phone: val.phone ?? '' },
      primaryCondition: 'Intake Assessment',
      vitals: { bp: '120/80', hr: 72, temp: 37, spo2: 98, respiratoryRate: 16, updatedAt: 'Just now' },
    });
    this.isFormVisible.set(false);
    this.patientForm.reset({
      name: '',
      dob: '1990-01-01',
      gender: 'Female',
      bloodType: 'O+',
      phone: '',
      address: '',
      allergies: 'None',
      insuranceCompanyId: '',
      insurancePolicyNumber: '',
    });
  }

  onSearchInput(e: Event) { this.patientSearchQuery.set((e.target as HTMLInputElement).value); }

  openPatientEhr(p: Patient) { 
    this.selectedDrawerPatient.set(p); 
  }

  getPatientMedicalRecords(patientId: string) {
    return this.store.medicalRecords().filter(r => r.patientId === patientId);
  }

  getStatusBadgeClass(status: PatientStatus): string {
    switch (status) {
      case 'IN_TRIAGE': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OUTPATIENT': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'ADMITTED': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }
}
