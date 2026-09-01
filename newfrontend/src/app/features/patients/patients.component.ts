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

        <div class="flex flex-wrap gap-2 self-start sm:self-auto">
          @if (!isEmergencyFormVisible()) {
            <button
              (click)="openEmergencyIntake()"
              class="px-5 py-2.5 bg-rose-600 text-white font-semibold rounded-2xl text-xs shadow-xl shadow-rose-200 flex items-center gap-2 hover:bg-rose-700 transition-all active:scale-95">
              <span class="material-icons text-base">emergency</span>
              <span>Unknown Emergency</span>
            </button>
          }
          @if (!isFormVisible()) {
            <button
              (click)="isFormVisible.set(true)"
              class="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-2xl text-xs shadow-xl shadow-slate-200 flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
              <span class="material-icons text-base">person_add</span>
              <span>Register New Patient</span>
            </button>
          }
        </div>
      </div>

      @if (isEmergencyFormVisible()) {
        <div class="overflow-hidden rounded-3xl border-2 border-rose-200 bg-white shadow-2xl shadow-rose-500/10 animate-slide-down">
          <div class="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white">
                <span class="material-icons text-base">emergency</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">Unknown Emergency Intake</h3>
                <p class="text-[10px] font-bold uppercase tracking-widest text-rose-600">Treat first, identify and bill later</p>
              </div>
            </div>
            <button (click)="closeEmergencyIntake()" class="rounded-full p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form [formGroup]="emergencyForm" (ngSubmit)="submitUnknownEmergency()" class="space-y-6 p-6 sm:p-8">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500">Gender</label>
                <select formControlName="gender" [class]="inputClasses">
                  <option value="Unknown">Unknown</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Child">Child</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500">Estimated Age</label>
                <input type="number" formControlName="estimatedAgeYears" min="0" max="120" [class]="inputClasses" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500">Triage Level *</label>
                <select formControlName="triageLevel" [class]="inputClasses">
                  <option value="Critical">Critical</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500">Brought By *</label>
                <select formControlName="broughtBy" [class]="inputClasses">
                  <option value="Ambulance">Ambulance</option>
                  <option value="Police">Police</option>
                  <option value="Bystander">Bystander</option>
                  <option value="Family later pending">Family later pending</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500">Incident Type *</label>
                <select formControlName="incidentType" [class]="inputClasses">
                  <option value="Road traffic accident">Road traffic accident</option>
                  <option value="Workplace injury">Workplace injury</option>
                  <option value="Assault">Assault</option>
                  <option value="Fall injury">Fall injury</option>
                  <option value="Burn injury">Burn injury</option>
                  <option value="Unconscious patient">Unconscious patient</option>
                  <option value="Other critical emergency">Other critical emergency</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500">Incident Location *</label>
                <input type="text" formControlName="incidentLocation" placeholder="Road, area, workplace, or unknown location" [class]="inputClasses" />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500">Emergency Department *</label>
                <select formControlName="department" (change)="onEmergencyDepartmentChange()" [class]="inputClasses">
                  @for (dept of departmentOptions(); track dept) {
                    <option [value]="dept">{{ dept }}</option>
                  }
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500">Assigned Doctor *</label>
                <select formControlName="doctorId" [class]="inputClasses">
                  @for (doc of emergencyDoctorOptions(); track doc.id) {
                    <option [value]="doc.id">{{ doc.name }} - {{ doc.department }}</option>
                  } @empty {
                    <option value="">No doctor available</option>
                  }
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500">Initial Notes</label>
                <input type="text" formControlName="emergencyNotes" placeholder="Condition on arrival, visible injuries, ambulance note..." [class]="inputClasses" />
              </div>
              <label class="flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700">
                <input type="checkbox" formControlName="medicoLegalCase" class="h-4 w-4 rounded border-rose-300 text-rose-600" />
                Medico-legal case
              </label>
            </div>

            <div class="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div class="text-[11px] font-semibold text-slate-500">
                The system generates a temporary EMR number and routes the patient to the doctor immediately.
              </div>
              <div class="flex justify-end gap-3">
                <button type="button" (click)="closeEmergencyIntake()" class="rounded-xl px-6 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100">Discard</button>
                <button type="submit" class="rounded-xl bg-rose-600 px-8 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 hover:bg-rose-700 active:scale-95">
                  Register & Queue Now
                </button>
              </div>
            </div>
          </form>
        </div>
      }

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
                    <select formControlName="insuranceCompanyId" (change)="onInsuranceChanged()" [class]="inputClasses">
                      <option value="">Self Pay / Cash</option>
                      @for (company of store.insuranceCompanies(); track company.id) {
                        <option [value]="company.id">
                          {{ company.name }} - {{ company.coveragePercent }}% {{ company.spouseCoverageAllowed ? '(spouse covered)' : '' }}
                        </option>
                      }
                    </select>
                  </div>
                </div>

                @if (hasInsuranceSelected()) {
                  <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Member Type</label>
                      <select formControlName="insuranceMemberType" [class]="inputClasses">
                        <option value="Employee">Employee</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Child">Child</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Principal Member</label>
                      <input type="text" formControlName="principalMemberName" placeholder="Employee name" [class]="inputClasses" />
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Employee ID</label>
                      <input type="text" formControlName="principalEmployeeId" placeholder="Company ID" [class]="inputClasses" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Employer</label>
                      <input type="text" formControlName="employerName" placeholder="Insured company" [class]="inputClasses" />
                    </div>
                  </div>
                }
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

      @if (unknownEmergencyPatients().length > 0) {
        <div class="rounded-3xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-sm font-black text-slate-900">Emergency & Medico-Legal Cases</h3>
              <p class="text-[11px] font-semibold text-rose-700">Identity pending patients are treated immediately and reconciled later.</p>
            </div>
            <span class="inline-flex w-fit items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1 text-[10px] font-black uppercase text-rose-700">
              <span class="material-icons text-sm">priority_high</span>
              {{ unknownEmergencyPatients().length }} active
            </span>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            @for (patient of unknownEmergencyPatients(); track patient.id) {
              <div class="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="rounded-full bg-rose-100 px-2.5 py-1 text-[9px] font-black uppercase text-rose-700">{{ patient.triageLevel || 'Emergency' }}</span>
                      @if (patient.medicoLegalCase) {
                        <span class="rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-black uppercase text-white">Medico-Legal</span>
                      }
                    </div>
                    <h4 class="mt-2 text-sm font-black text-slate-950">{{ patient.temporaryName || patient.name }}</h4>
                    <p class="text-[11px] font-mono font-bold text-slate-500">{{ patient.mrn }}</p>
                    <p class="mt-2 text-xs font-semibold text-slate-600">{{ patient.incidentType }} - {{ patient.incidentLocation }}</p>
                  </div>
                  <div class="flex shrink-0 gap-2">
                    <button (click)="openPatientEhr(patient)" class="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-700 transition hover:bg-slate-50">EHR</button>
                    <button (click)="openIdentityResolution(patient)" class="rounded-xl bg-rose-600 px-3 py-2 text-[10px] font-black text-white transition hover:bg-rose-700">Resolve</button>
                  </div>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                  <span>Brought by: {{ patient.broughtBy || 'Unknown' }}</span>
                  <span>Age: {{ patient.estimatedAgeYears || 'Unknown' }}</span>
                  <span>Doctor: {{ emergencyAppointmentDoctor(patient.id) }}</span>
                  <span>Status: {{ patient.identityStatus || 'Identity Pending' }}</span>
                </div>
              </div>
            }
          </div>
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
                <th class="py-4 px-4">Address</th>
                <th class="py-4 px-4">Insurance</th>
                <th class="py-4 px-4 text-center">Blood</th>
                <th class="py-4 px-4">Status</th>
                <th class="py-4 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (store.isLoading() && filteredPatients().length === 0) {
                <tr>
                  <td colspan="7" class="py-14 text-center">
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
                    <td class="py-4 px-4 text-slate-600">
                      <div class="max-w-[180px] truncate">{{ p.address || p.incidentLocation || 'Not recorded' }}</div>
                    </td>
                    <td class="py-4 px-4">
                      <span class="rounded-lg border px-2 py-1 text-[10px] font-bold"
                        [class]="p.isIdentityPending ? 'border-rose-200 bg-rose-50 text-rose-700' : p.insuranceCompanyId ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'">
                        {{ p.isIdentityPending ? 'Deferred' : (p.insuranceCompanyName || p.insuranceProvider || 'Self Pay') }}
                      </span>
                    </td>
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
                    <td colspan="7" class="py-14 text-center">
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

              @if (selectedDrawerPatient()?.isIdentityPending) {
                <div class="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest text-rose-600">Identity Pending</p>
                      <h4 class="mt-1 text-sm font-black text-slate-950">{{ selectedDrawerPatient()?.incidentType }}</h4>
                    </div>
                    <button (click)="openIdentityResolution(selectedDrawerPatient()!)" class="rounded-xl bg-rose-600 px-3 py-2 text-[10px] font-black text-white transition hover:bg-rose-700">
                      Resolve
                    </button>
                  </div>
                  <div class="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                    <span>MRN: {{ selectedDrawerPatient()?.mrn }}</span>
                    <span>Triage: {{ selectedDrawerPatient()?.triageLevel }}</span>
                    <span>Brought by: {{ selectedDrawerPatient()?.broughtBy }}</span>
                    <span>Legal: {{ selectedDrawerPatient()?.medicoLegalCase ? 'Yes' : 'No' }}</span>
                  </div>
                  <p class="mt-3 text-xs font-semibold text-slate-600">{{ selectedDrawerPatient()?.emergencyNotes || 'No emergency note recorded.' }}</p>
                </div>
              }

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

      @if (identityResolutionPatient()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm animate-fade-in">
          <div class="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                <h3 class="text-base font-black text-slate-950">Resolve Emergency Identity</h3>
                <p class="text-[11px] font-semibold text-slate-500">{{ identityResolutionPatient()?.mrn }} - original incident data remains in the record</p>
              </div>
              <button (click)="closeIdentityResolution()" class="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="identityForm" (ngSubmit)="submitIdentityResolution()" class="space-y-5 p-6">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase text-slate-500">Full Name *</label>
                  <input formControlName="name" type="text" [class]="inputClasses" placeholder="Patient legal name" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase text-slate-500">Phone *</label>
                  <input formControlName="phone" type="text" [class]="inputClasses" placeholder="09..." />
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase text-slate-500">DOB *</label>
                  <input formControlName="dob" type="date" [class]="inputClasses" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase text-slate-500">Gender *</label>
                  <select formControlName="gender" [class]="inputClasses">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase text-slate-500">Blood Type</label>
                  <select formControlName="bloodType" [class]="inputClasses">
                    <option value="O+">O+</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O-">O-</option>
                    <option value="A-">A-</option>
                    <option value="B-">B-</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase text-slate-500">Address</label>
                  <input formControlName="address" type="text" [class]="inputClasses" placeholder="Street, city" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase text-slate-500">Insurance</label>
                  <select formControlName="insuranceCompanyId" (change)="onIdentityInsuranceChanged()" [class]="inputClasses">
                    <option value="">Self Pay / Cash</option>
                    @for (company of store.insuranceCompanies(); track company.id) {
                      <option [value]="company.id">{{ company.name }} - {{ company.coveragePercent }}%</option>
                    }
                  </select>
                </div>
              </div>

              @if (hasIdentityInsuranceSelected()) {
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500">Member Type</label>
                    <select formControlName="insuranceMemberType" [class]="inputClasses">
                      <option value="Employee">Employee</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Child">Child</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500">Principal Member</label>
                    <input formControlName="principalMemberName" type="text" [class]="inputClasses" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500">Employer</label>
                    <input formControlName="employerName" type="text" [class]="inputClasses" />
                  </div>
                </div>
              }

              <div class="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" (click)="closeIdentityResolution()" class="rounded-xl px-6 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100">Cancel</button>
                <button type="submit" class="rounded-xl bg-slate-900 px-8 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800">
                  Save Verified Identity
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class PatientsComponent {
  store = inject(StoreService);
  isFormVisible = signal(false);
  isEmergencyFormVisible = signal(false);
  selectedDrawerPatient = signal<Patient | null>(null); // State for the EHR Drawer
  identityResolutionPatient = signal<Patient | null>(null);
  patientSearchQuery = signal<string>('');

  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all';

  filteredPatients = computed(() => {
    const q = this.patientSearchQuery().toLowerCase().trim();
    const source = this.store.currentUser()?.role === 'DOCTOR'
      ? this.store.roleVisiblePatients()
      : this.store.patients();
    if (!q) return source;
    return source.filter(p => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q));
  });

  unknownEmergencyPatients = computed(() =>
    this.store.patients()
      .filter(patient => patient.isIdentityPending)
      .sort((left, right) => this.triageRank(left.triageLevel) - this.triageRank(right.triageLevel) || left.mrn.localeCompare(right.mrn))
  );

  departmentOptions = computed(() => {
    const names = this.store.departments().map(dept => dept.name).filter(Boolean);
    const unique = Array.from(new Set(['Emergency', ...names]));
    return unique.length ? unique : ['Emergency', 'Surgery', 'Orthopedics', 'Internal Medicine'];
  });

  doctorOptions = computed(() => {
    const profiles = this.store.doctors().map(doctor => ({
      id: doctor.id,
      name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      department: doctor.department || 'General',
    }));
    if (profiles.length > 0) return profiles;

    return this.store.employeesAsUsers()
      .filter(user => user.role === 'DOCTOR')
      .map(user => ({ id: user.id, name: user.name.startsWith('Dr.') ? user.name : `Dr. ${user.name}`, department: user.department || 'General' }));
  });

  emergencyDoctorOptions = computed(() => {
    const department = this.emergencyForm.controls.department.value || 'Emergency';
    const doctors = this.doctorOptions();
    const exact = doctors.filter(doctor => doctor.department.toLowerCase() === department.toLowerCase());
    if (exact.length > 0) return exact;
    const emergency = doctors.filter(doctor => doctor.department.toLowerCase().includes('emergency'));
    return emergency.length > 0 ? emergency : doctors;
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
    insuranceMemberType: new FormControl<'Employee' | 'Spouse' | 'Child' | 'Other'>('Employee'),
    principalMemberName: new FormControl(''),
    principalEmployeeId: new FormControl(''),
    employerName: new FormControl('')
  });

  emergencyForm = new FormGroup({
    gender: new FormControl('Unknown', [Validators.required]),
    estimatedAgeYears: new FormControl(35, [Validators.required, Validators.min(0), Validators.max(120)]),
    broughtBy: new FormControl('Ambulance', [Validators.required]),
    incidentType: new FormControl('Road traffic accident', [Validators.required]),
    incidentLocation: new FormControl('', [Validators.required, Validators.minLength(3)]),
    triageLevel: new FormControl('Critical', [Validators.required]),
    department: new FormControl('Emergency', [Validators.required]),
    doctorId: new FormControl('', [Validators.required]),
    emergencyNotes: new FormControl(''),
    medicoLegalCase: new FormControl(true),
  });

  identityForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    dob: new FormControl('1990-01-01', [Validators.required]),
    gender: new FormControl('Male', [Validators.required]),
    bloodType: new FormControl('O+'),
    phone: new FormControl('', [Validators.required, Validators.minLength(9)]),
    address: new FormControl(''),
    email: new FormControl('', [Validators.email]),
    insuranceCompanyId: new FormControl(''),
    insuranceMemberType: new FormControl<'Employee' | 'Spouse' | 'Child' | 'Other'>('Employee'),
    principalMemberName: new FormControl(''),
    principalEmployeeId: new FormControl(''),
    employerName: new FormControl(''),
    emergencyContactName: new FormControl(''),
    emergencyContactPhone: new FormControl(''),
  });

  constructor() {
    this.store.loadInsuranceCompanies();
    this.store.loadDoctors();
    this.store.loadDepartments();
  }

  openEmergencyIntake() {
    this.isFormVisible.set(false);
    this.isEmergencyFormVisible.set(true);
    this.onEmergencyDepartmentChange();
  }

  closeEmergencyIntake() {
    this.isEmergencyFormVisible.set(false);
    this.emergencyForm.reset({
      gender: 'Unknown',
      estimatedAgeYears: 35,
      broughtBy: 'Ambulance',
      incidentType: 'Road traffic accident',
      incidentLocation: '',
      triageLevel: 'Critical',
      department: 'Emergency',
      doctorId: this.emergencyDoctorOptions()[0]?.id || '',
      emergencyNotes: '',
      medicoLegalCase: true,
    });
  }

  onEmergencyDepartmentChange() {
    const doctor = this.emergencyDoctorOptions()[0];
    if (doctor && !this.emergencyDoctorOptions().some(item => item.id === this.emergencyForm.controls.doctorId.value)) {
      this.emergencyForm.patchValue({ doctorId: doctor.id });
    }
  }

  submitUnknownEmergency() {
    if (this.emergencyForm.invalid) {
      this.emergencyForm.markAllAsTouched();
      this.store.addToast('error', 'Emergency Intake Validation', 'Incident location, triage level, and assigned doctor are required.');
      return;
    }

    const value = this.emergencyForm.getRawValue();
    this.store.registerUnknownEmergencyCase({
      gender: value.gender || 'Unknown',
      estimatedAgeYears: Number(value.estimatedAgeYears || 35),
      broughtBy: value.broughtBy || 'Unknown',
      incidentType: value.incidentType || 'Emergency',
      incidentLocation: value.incidentLocation || 'Unknown location',
      triageLevel: value.triageLevel || 'Critical',
      doctorId: value.doctorId || '',
      department: value.department || 'Emergency',
      emergencyNotes: value.emergencyNotes || undefined,
      medicoLegalCase: !!value.medicoLegalCase,
    });
    this.closeEmergencyIntake();
  }

  hasInsuranceSelected(): boolean {
    return !!this.patientForm.controls.insuranceCompanyId.value;
  }

  hasIdentityInsuranceSelected(): boolean {
    return !!this.identityForm.controls.insuranceCompanyId.value;
  }

  onInsuranceChanged() {
    const company = this.store.insuranceCompanies().find(item => item.id === this.patientForm.controls.insuranceCompanyId.value);
    if (!company) {
      this.patientForm.patchValue({
        insuranceMemberType: 'Employee',
        principalMemberName: '',
        principalEmployeeId: '',
        employerName: '',
      });
      return;
    }
    if (!this.patientForm.controls.employerName.value) {
      this.patientForm.patchValue({ employerName: company.name });
    }
  }

  onIdentityInsuranceChanged() {
    const company = this.store.insuranceCompanies().find(item => item.id === this.identityForm.controls.insuranceCompanyId.value);
    if (!company) {
      this.identityForm.patchValue({
        insuranceMemberType: 'Employee',
        principalMemberName: '',
        principalEmployeeId: '',
        employerName: '',
      });
      return;
    }
    if (!this.identityForm.controls.employerName.value) {
      this.identityForm.patchValue({ employerName: company.name });
    }
  }

  openIdentityResolution(patient: Patient) {
    this.identityResolutionPatient.set(patient);
    this.identityForm.reset({
      name: '',
      dob: patient.dob || '1990-01-01',
      gender: patient.gender === 'Female' ? 'Female' : 'Male',
      bloodType: patient.bloodType || 'O+',
      phone: '',
      address: patient.incidentLocation || patient.address || '',
      email: '',
      insuranceCompanyId: '',
      insuranceMemberType: 'Employee',
      principalMemberName: '',
      principalEmployeeId: '',
      employerName: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    });
  }

  closeIdentityResolution() {
    this.identityResolutionPatient.set(null);
  }

  submitIdentityResolution() {
    const patient = this.identityResolutionPatient();
    if (!patient) return;
    if (this.identityForm.invalid) {
      this.identityForm.markAllAsTouched();
      this.store.addToast('error', 'Identity Validation', 'Patient name, date of birth, gender, and phone are required.');
      return;
    }

    const value = this.identityForm.getRawValue();
    const company = this.store.insuranceCompanies().find(item => item.id === value.insuranceCompanyId);
    if (company && value.insuranceMemberType === 'Spouse' && !company.spouseCoverageAllowed) {
      this.store.addToast('error', 'Coverage Not Allowed', `${company.name} does not cover spouse service. Use cash or choose another payer.`);
      return;
    }

    this.store.resolveEmergencyPatientIdentity(patient.id, {
      name: value.name || '',
      dob: value.dob || '1990-01-01',
      gender: value.gender || 'Male',
      bloodType: value.bloodType || 'O+',
      phone: value.phone || '',
      address: value.address || '',
      email: value.email || '',
      insuranceCompanyId: value.insuranceCompanyId || undefined,
      insuranceProvider: company?.name || 'Self Pay',
      insuranceMemberType: company ? value.insuranceMemberType || 'Employee' : undefined,
      principalMemberName: company ? value.principalMemberName || undefined : undefined,
      principalEmployeeId: company ? value.principalEmployeeId || undefined : undefined,
      employerName: company ? value.employerName || company.name : undefined,
      emergencyContactName: value.emergencyContactName || undefined,
      emergencyContactPhone: value.emergencyContactPhone || undefined,
    });
    this.closeIdentityResolution();
  }

  submitRegistration() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      this.store.addToast('error', 'Registration Validation', 'Patient full name, date of birth, gender, and phone are required.');
      return;
    }
    const val = this.patientForm.value;
    const company = this.store.insuranceCompanies().find(item => item.id === val.insuranceCompanyId);
    if (company && val.insuranceMemberType === 'Spouse' && !company.spouseCoverageAllowed) {
      this.store.addToast('error', 'Coverage Not Allowed', `${company.name} does not cover spouse service. Register this patient as cash or choose another payer.`);
      return;
    }

    // Reject duplicate registrations before hitting the API: the same phone number,
    // or the same patient (full name + date of birth) must not be registered twice.
    const phone = (val.phone ?? '').trim();
    const duplicateByPhone = this.store.patients().find(p => p.phone.trim().toLowerCase() === phone.toLowerCase());
    if (duplicateByPhone) {
      this.store.addToast('error', 'Patient Already Exists',
        `A patient with phone number ${phone} is already registered (MRN ${duplicateByPhone.mrn}). Please use the existing record instead.`);
      return;
    }

    const fullName = (val.name ?? '').trim().toLowerCase();
    const duplicateByPatient = this.store.patients().find(p =>
      p.name.trim().toLowerCase() === fullName && p.dob === (val.dob ?? '')
    );
    if (duplicateByPatient) {
      this.store.addToast('error', 'Patient Already Exists',
        `This patient is already registered (MRN ${duplicateByPatient.mrn}). Please use the existing record instead of registering again.`);
      return;
    }

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
      insurancePolicyNumber: '',
      insuranceMemberType: company ? (val.insuranceMemberType || 'Employee') : undefined,
      principalMemberName: company ? val.principalMemberName || undefined : undefined,
      principalEmployeeId: company ? val.principalEmployeeId || undefined : undefined,
      employerName: company ? val.employerName || company.name : undefined,
      occupation: company && val.principalEmployeeId ? `Principal employee ID: ${val.principalEmployeeId}` : '',
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
      insuranceMemberType: 'Employee',
      principalMemberName: '',
      principalEmployeeId: '',
      employerName: '',
    });
  }

  onSearchInput(e: Event) { this.patientSearchQuery.set((e.target as HTMLInputElement).value); }

  openPatientEhr(p: Patient) { 
    this.selectedDrawerPatient.set(p); 
  }

  getPatientMedicalRecords(patientId: string) {
    return this.store.medicalRecords().filter(r => r.patientId === patientId);
  }

  emergencyAppointmentDoctor(patientId: string): string {
    const appointment = this.store.appointments().find(item => item.patientId === patientId && item.type === 'EMERGENCY');
    return appointment ? this.store.doctorDisplayName(appointment.doctorId) : 'Not assigned';
  }

  private triageRank(level?: string): number {
    const value = (level || '').toLowerCase();
    if (value.includes('critical')) return 0;
    if (value.includes('emergency')) return 1;
    if (value.includes('urgent')) return 2;
    return 3;
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
