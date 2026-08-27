import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import type { Bed, BedAdmission, Patient, WardConfig } from '../../core/models';

@Component({
  selector: 'app-wards-beds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-teal-600">Inpatient Operations</p>
          <h1 class="mt-1 text-2xl font-black text-slate-950 font-display">Ward, Bed, Admission and Discharge Board</h1>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 shadow-sm">
            Occupancy <span class="ml-2 text-teal-700">{{ store.bedOccupancyRate() }}%</span>
          </div>
          <button type="button" (click)="isWardFormVisible.set(true)" class="inline-flex items-center gap-2 rounded-2xl border border-teal-100 bg-white px-5 py-3 text-xs font-black text-teal-700 shadow-sm transition hover:bg-teal-50">
            <span class="material-icons text-base">domain_add</span>
            Add Ward
          </button>
          <button type="button" (click)="openBedForm()" class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black text-white shadow-lg shadow-slate-200 transition hover:bg-teal-700">
            <span class="material-icons text-base">add_home_work</span>
            Add Beds
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <span class="material-icons text-teal-600">king_bed</span>
          <p class="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Total Beds</p>
          <strong class="text-3xl font-black text-slate-950">{{ store.beds().length }}</strong>
        </div>
        <div class="rounded-3xl border border-rose-100 bg-rose-50 p-5 shadow-sm">
          <span class="material-icons text-rose-600">personal_injury</span>
          <p class="mt-3 text-[10px] font-black uppercase tracking-widest text-rose-400">Occupied</p>
          <strong class="text-3xl font-black text-rose-700">{{ occupiedCount() }}</strong>
        </div>
        <div class="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <span class="material-icons text-emerald-600">sanitizer</span>
          <p class="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-500">Available</p>
          <strong class="text-3xl font-black text-emerald-700">{{ availableCount() }}</strong>
        </div>
        <div class="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <span class="material-icons text-amber-600">payments</span>
          <p class="mt-3 text-[10px] font-black uppercase tracking-widest text-amber-500">Daily Ward Value</p>
          <strong class="text-xl font-black text-amber-700">ETB {{ dailyWardValue().toLocaleString() }}</strong>
        </div>
      </div>

      @if (isWardFormVisible()) {
        <form (ngSubmit)="saveWard()" class="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
          <div class="mb-5 flex items-start justify-between gap-4">
            <h3 class="text-sm font-black text-slate-950">Ward Maintenance</h3>
            <button type="button" (click)="resetWardForm()" class="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-6">
            <label class="field md:col-span-2">Ward Name
              <input [(ngModel)]="wardForm.name" name="wardName" required placeholder="Emergency Ward" [class]="inputClasses" />
            </label>
            <label class="field">Code
              <input [(ngModel)]="wardForm.code" name="wardCode" required placeholder="ER" [class]="inputClasses" />
            </label>
            <label class="field">Floor
              <input [(ngModel)]="wardForm.floor" name="wardFloor" placeholder="Ground" [class]="inputClasses" />
            </label>
            <label class="field">Category
              <select [(ngModel)]="wardForm.category" name="wardCategory" (change)="applyWardCategoryRate()" [class]="inputClasses">
                @for (category of categories; track category.name) {
                  <option [value]="category.name">{{ category.name }}</option>
                }
              </select>
            </label>
            <label class="field">Daily Rate
              <input [(ngModel)]="wardForm.dailyRate" name="wardDailyRate" type="number" min="1" required [class]="inputClasses" />
            </label>
            <label class="field md:col-span-2">Nurse Station
              <input [(ngModel)]="wardForm.nurseStation" name="nurseStation" placeholder="Station A" [class]="inputClasses" />
            </label>
          </div>
          <div class="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" (click)="resetWardForm()" class="rounded-xl px-5 py-2 text-xs font-black text-slate-500 hover:bg-slate-100">Discard</button>
            <button type="submit" class="rounded-xl bg-sky-600 px-6 py-2 text-xs font-black text-white shadow-lg shadow-sky-500/20 hover:bg-sky-700">Save Ward</button>
          </div>
        </form>
      }

      @if (isBedFormVisible()) {
        <form (ngSubmit)="saveBed()" class="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 class="text-sm font-black text-slate-950">Bed Maintenance</h3>
            </div>
            <button type="button" (click)="resetBedForm()" class="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-6">
            <label class="field md:col-span-2">Ward
              <select [(ngModel)]="bedForm.ward" name="ward" required (change)="onBedWardChanged()" [class]="inputClasses">
                <option value="">Select maintained ward</option>
                @for (ward of wardProfiles(); track ward.id) {
                  <option [value]="ward.name">{{ ward.name }} - {{ ward.category }} - {{ ward.currency }} {{ ward.dailyRate.toLocaleString() }}</option>
                }
              </select>
            </label>
            <label class="field">Room
              <input [(ngModel)]="bedForm.room" name="room" required placeholder="101" [class]="inputClasses" />
            </label>
            <label class="field">Bed Prefix
              <input [(ngModel)]="bedForm.bedNumber" name="bedNumber" required placeholder="MW-101" [class]="inputClasses" />
            </label>
            <label class="field">No. of Beds
              <input [(ngModel)]="bedForm.bedCount" name="bedCount" type="number" min="1" max="50" required [class]="inputClasses" />
            </label>
            <label class="field">Category
              <select [(ngModel)]="bedForm.category" name="category" (change)="applyCategoryRate()" [class]="inputClasses">
                @for (category of categories; track category.name) {
                  <option [value]="category.name">{{ category.name }}</option>
                }
              </select>
            </label>
            <label class="field">Daily Rate
              <input [(ngModel)]="bedForm.dailyRate" name="dailyRate" type="number" min="1" required [class]="inputClasses" />
            </label>
          </div>

          <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <label class="inline-flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700">
              <input [(ngModel)]="bedForm.isAvailable" name="isAvailable" type="checkbox" class="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
              Available for admission
            </label>
            <div class="flex gap-3">
              <button type="button" (click)="resetBedForm()" class="rounded-xl px-5 py-2 text-xs font-black text-slate-500 hover:bg-slate-100">Discard</button>
              <button type="submit" class="rounded-xl bg-teal-600 px-6 py-2 text-xs font-black text-white shadow-lg shadow-teal-500/20 hover:bg-teal-700">Save Beds</button>
            </div>
          </div>
        </form>
      }

      <div class="flex items-center gap-2 overflow-x-auto pb-1">
        <button (click)="selectedWard.set('ALL')" [class]="selectedWard() === 'ALL' ? activeFilterClasses : inactiveFilterClasses" class="filter-pill">All Wards</button>
        @for (ward of wardNames(); track ward) {
          <button (click)="selectedWard.set(ward)" [class]="selectedWard() === ward ? activeFilterClasses : inactiveFilterClasses" class="filter-pill">{{ ward }}</button>
        }
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (bed of filteredBeds(); track bed.id) {
          <article class="relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg" [class.border-rose-200]="bed.isOccupied" [class.border-slate-200]="!bed.isOccupied">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="font-mono text-xs font-black text-slate-900">{{ bed.wardName }} / Room {{ bed.roomNumber }}</div>
                <h3 class="mt-1 text-xl font-black text-slate-950">Bed {{ bed.bedNumber }}</h3>
              </div>
              <span [class]="bed.isOccupied ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'" class="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase">
                {{ bed.isOccupied ? 'Occupied' : 'Available' }}
              </span>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div class="rounded-2xl bg-slate-50 p-3">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</p>
                <strong class="text-slate-900">{{ bed.category }}</strong>
              </div>
              <div class="rounded-2xl bg-slate-50 p-3">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Rate</p>
                <strong class="text-slate-900">{{ bed.currency }} {{ bed.dailyRate.toLocaleString() }}</strong>
              </div>
            </div>

            @if (bed.isOccupied) {
              <div class="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs">
                <p class="font-black text-slate-950">{{ bed.patientName || 'Admitted patient' }}</p>
                <p class="mt-1 font-mono text-[10px] font-bold text-rose-500">{{ bed.patientMrn || 'MRN unavailable' }}</p>
                <p class="mt-2 text-[11px] font-semibold text-slate-600">Admitted: {{ formatDateTime(bed.admittedAtUtc) }}</p>
                <p class="text-[11px] font-semibold text-slate-600">Estimated stay: {{ estimatedDays(bed) }} chargeable day(s)</p>
              </div>
              <button type="button" (click)="openDischargeModal(bed)" class="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-xs font-black text-rose-700 transition hover:bg-rose-50">
                <span class="material-icons text-base">logout</span>
                Discharge and Send Charge
              </button>
            } @else {
              <div class="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
                Ready for admission. Select a patient to occupy this bed and start charge tracking.
              </div>
              <button type="button" (click)="openAssignModal(bed)" class="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-teal-500/15 transition hover:bg-teal-700">
                <span class="material-icons text-base">person_add</span>
                Admit Patient
              </button>
            }
          </article>
        }
      </div>

      <section class="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-sm font-black text-slate-950">Admission Ledger</h2>
            <p class="text-xs font-semibold text-slate-500">Active and recently discharged bed stays with charge details.</p>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{{ store.bedAdmissions().length }} records</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-xs">
            <thead class="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th class="px-5 py-3">Patient</th>
                <th class="px-5 py-3">Bed</th>
                <th class="px-5 py-3">Admission</th>
                <th class="px-5 py-3">Charge</th>
                <th class="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (admission of admissionLedger(); track admission.id) {
                <tr class="hover:bg-slate-50/70">
                  <td class="px-5 py-4">
                    <div class="font-black text-slate-900">{{ admission.patientName }}</div>
                    <div class="font-mono text-[10px] font-bold text-slate-400">{{ admission.patientMrn }}</div>
                  </td>
                  <td class="px-5 py-4 font-semibold text-slate-700">{{ admission.wardName }} / {{ admission.bedNumber }} / {{ admission.bedCategory }}</td>
                  <td class="px-5 py-4 text-slate-500">{{ formatDateTime(admission.admittedAtUtc) }}</td>
                  <td class="px-5 py-4 font-mono font-black text-slate-900">{{ admission.currency }} {{ admission.bedCharge.toLocaleString() || '0' }}</td>
                  <td class="px-5 py-4">
                    <span [class]="admission.status === 'Admitted' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'" class="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase">{{ admission.status }}</span>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="px-5 py-10 text-center text-xs font-bold text-slate-400">No admission records loaded yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (selectedBedForAdmission(); as bed) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form (ngSubmit)="submitAdmission()" class="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div class="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 class="text-lg font-black text-slate-950">Admit Patient to Bed {{ bed.bedNumber }}</h3>
                <p class="mt-1 text-xs font-semibold text-slate-500">{{ bed.wardName }} / {{ bed.category }} / {{ bed.currency }} {{ bed.dailyRate.toLocaleString() }} per day</p>
              </div>
              <button type="button" (click)="closeAdmissionModal()" class="rounded-full p-2 text-slate-400 hover:bg-slate-100"><span class="material-icons">close</span></button>
            </div>
            <div class="mt-5 grid gap-4">
              <label class="field">Patient
                <select [(ngModel)]="selectedPatientId" name="selectedPatientId" required [class]="inputClasses">
                  <option value="">Select patient</option>
                  @for (patient of eligiblePatients(); track patient.id) {
                    <option [value]="patient.id">{{ patient.name }} - {{ patient.mrn }} - {{ patient.insuranceProvider || 'Self Pay' }}</option>
                  }
                </select>
              </label>
              <label class="field">Admission Note
                <textarea [(ngModel)]="admissionNote" name="admissionNote" rows="4" [class]="inputClasses" placeholder="Clinical reason, admission instruction, handoff note"></textarea>
              </label>
            </div>
            <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" (click)="closeAdmissionModal()" class="rounded-xl border border-slate-200 px-5 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" class="rounded-xl bg-teal-600 px-6 py-2 text-xs font-black text-white hover:bg-teal-700">Confirm Admission</button>
            </div>
          </form>
        </div>
      }

      @if (selectedBedForDischarge(); as bed) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form (ngSubmit)="submitDischarge()" class="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div class="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 class="text-lg font-black text-slate-950">Discharge {{ bed.patientName }}</h3>
                <p class="mt-1 text-xs font-semibold text-slate-500">The bed charge will be sent to Billing and insurance split will be handled there.</p>
              </div>
              <button type="button" (click)="closeDischargeModal()" class="rounded-full p-2 text-slate-400 hover:bg-slate-100"><span class="material-icons">close</span></button>
            </div>
            <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div class="rounded-2xl bg-slate-50 p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Stay</p>
                <strong class="text-xl font-black text-slate-950">{{ estimatedDays(bed) }} day(s)</strong>
              </div>
              <div class="rounded-2xl bg-slate-50 p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Rate</p>
                <strong class="text-xl font-black text-slate-950">{{ bed.currency }} {{ bed.dailyRate.toLocaleString() }}</strong>
              </div>
              <div class="rounded-2xl bg-amber-50 p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-amber-500">Estimated Charge</p>
                <strong class="text-xl font-black text-amber-700">{{ bed.currency }} {{ estimatedCharge(bed).toLocaleString() }}</strong>
              </div>
            </div>
            <label class="field mt-5">Discharge Note
              <textarea [(ngModel)]="dischargeNote" name="dischargeNote" rows="4" [class]="inputClasses" placeholder="Discharge instruction, transfer note, billing remark"></textarea>
            </label>
            <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" (click)="closeDischargeModal()" class="rounded-xl border border-slate-200 px-5 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" class="rounded-xl bg-rose-600 px-6 py-2 text-xs font-black text-white hover:bg-rose-700">Discharge and Bill</button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    .field {
      display: grid;
      gap: .375rem;
      font-size: .625rem;
      font-weight: 900;
      color: rgb(71 85 105);
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .filter-pill {
      border-radius: .875rem;
      padding: .5rem .875rem;
      font-size: .75rem;
      transition: all .18s ease;
      white-space: nowrap;
    }
  `]
})
export class WardsBedsComponent {
  store = inject(StoreService);

  selectedWard = signal<string>('ALL');
  isWardFormVisible = signal(false);
  isBedFormVisible = signal(false);
  selectedBedForAdmission = signal<Bed | null>(null);
  selectedBedForDischarge = signal<Bed | null>(null);
  selectedPatientId = '';
  admissionNote = '';
  dischargeNote = '';

  readonly categories = [
    { name: 'Normal', rate: 1200 },
    { name: 'VIP', rate: 2200 },
    { name: 'VVIP', rate: 3500 },
  ];
  readonly inputClasses = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5';
  readonly activeFilterClasses = 'bg-slate-900 text-white font-black';
  readonly inactiveFilterClasses = 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 font-bold';

  wardForm: Omit<WardConfig, 'id' | 'isActive'> = {
    name: '',
    code: '',
    floor: '',
    nurseStation: '',
    category: 'Normal',
    dailyRate: 1200,
    currency: 'ETB',
  };

  bedForm = {
    ward: '',
    room: '',
    bedNumber: '',
    bedCount: 1,
    category: 'Normal',
    dailyRate: 1200,
    currency: 'ETB',
    isAvailable: true,
  };

  wardProfiles = computed(() => this.store.activeWardConfigs());
  wardNames = computed(() => Array.from(new Set([...this.wardProfiles().map(ward => ward.name), ...this.store.beds().map(bed => bed.wardName)])).sort());
  occupiedCount = computed(() => this.store.beds().filter(bed => bed.isOccupied).length);
  availableCount = computed(() => this.store.beds().filter(bed => !bed.isOccupied).length);
  dailyWardValue = computed(() => this.store.beds().reduce((sum, bed) => sum + (bed.isOccupied ? bed.dailyRate : 0), 0));
  admissionLedger = computed(() => [...this.store.bedAdmissions()].sort((a, b) => new Date(b.admittedAtUtc).getTime() - new Date(a.admittedAtUtc).getTime()).slice(0, 10));

  filteredBeds = computed(() => {
    const ward = this.selectedWard();
    const beds = ward === 'ALL' ? this.store.beds() : this.store.beds().filter(b => b.wardName === ward);
    return [...beds].sort((a, b) => a.wardName.localeCompare(b.wardName) || a.roomNumber.localeCompare(b.roomNumber) || a.bedNumber.localeCompare(b.bedNumber));
  });

  eligiblePatients = computed<Patient[]>(() => {
    const admittedPatientIds = new Set(this.store.beds().filter(bed => bed.isOccupied && bed.patientId).map(bed => bed.patientId));
    return this.store.patients()
      .filter(patient => !admittedPatientIds.has(patient.id) && patient.status !== 'DISCHARGED')
      .sort((a, b) => Number(this.store.patientHasEmergencyAppointment(b.id)) - Number(this.store.patientHasEmergencyAppointment(a.id)) || a.name.localeCompare(b.name));
  });

  applyCategoryRate() {
    const category = this.categories.find(item => item.name === this.bedForm.category);
    if (category) this.bedForm.dailyRate = category.rate;
  }

  applyWardCategoryRate() {
    const category = this.categories.find(item => item.name === this.wardForm.category);
    if (category) this.wardForm.dailyRate = category.rate;
  }

  saveWard() {
    if (!this.wardForm.name.trim() || !this.wardForm.code.trim()) {
      this.store.addToast('error', 'Ward Validation', 'Ward name and code are required.');
      return;
    }
    if (!this.wardForm.dailyRate || this.wardForm.dailyRate <= 0) {
      this.store.addToast('error', 'Ward Validation', 'Daily rate must be greater than zero.');
      return;
    }
    this.store.addWardConfig({ ...this.wardForm, currency: 'ETB' });
    this.resetWardForm();
  }

  resetWardForm() {
    this.isWardFormVisible.set(false);
    this.wardForm = {
      name: '',
      code: '',
      floor: '',
      nurseStation: '',
      category: 'Normal',
      dailyRate: 1200,
      currency: 'ETB',
    };
  }

  openBedForm() {
    if (this.wardProfiles().length === 0) {
      this.store.addToast('warning', 'Ward Required', 'Create a ward before adding beds.');
      this.isWardFormVisible.set(true);
      return;
    }
    this.isBedFormVisible.set(true);
    if (!this.bedForm.ward) {
      this.bedForm.ward = this.wardProfiles()[0].name;
      this.onBedWardChanged();
    }
  }

  onBedWardChanged() {
    const ward = this.wardProfiles().find(item => item.name === this.bedForm.ward);
    if (!ward) return;
    this.bedForm.category = ward.category;
    this.bedForm.dailyRate = ward.dailyRate;
  }

  saveBed() {
    if (!this.bedForm.ward.trim() || !this.bedForm.room.trim() || !this.bedForm.bedNumber.trim()) {
      this.store.addToast('error', 'Bed Validation', 'Ward, room, and bed number are required.');
      return;
    }
    if (!this.wardProfiles().some(ward => ward.name === this.bedForm.ward)) {
      this.store.addToast('error', 'Ward Required', 'Select a maintained ward before saving beds.');
      return;
    }
    if (!this.bedForm.dailyRate || this.bedForm.dailyRate <= 0) {
      this.store.addToast('error', 'Bed Validation', 'Daily rate must be greater than zero.');
      return;
    }

    const count = Math.min(50, Math.max(1, Number(this.bedForm.bedCount || 1)));
    for (let index = 1; index <= count; index++) {
      const suffix = count === 1 ? '' : `-${String(index).padStart(2, '0')}`;
      this.store.createBed({
        ward: this.bedForm.ward,
        room: this.bedForm.room,
        bedNumber: `${this.bedForm.bedNumber}${suffix}`,
        category: this.bedForm.category,
        dailyRate: this.bedForm.dailyRate,
        currency: 'ETB',
        isAvailable: this.bedForm.isAvailable,
      });
    }
    this.resetBedForm();
  }

  resetBedForm() {
    this.isBedFormVisible.set(false);
    this.bedForm = {
      ward: this.wardProfiles()[0]?.name || '',
      room: '',
      bedNumber: '',
      bedCount: 1,
      category: 'Normal',
      dailyRate: 1200,
      currency: 'ETB',
      isAvailable: true,
    };
  }

  openAssignModal(bed: Bed) {
    this.selectedBedForAdmission.set(bed);
    this.selectedPatientId = this.eligiblePatients()[0]?.id || '';
    this.admissionNote = this.store.patientHasEmergencyAppointment(this.selectedPatientId)
      ? 'Emergency admission. Treatment continues before payment clearance.'
      : '';
  }

  closeAdmissionModal() {
    this.selectedBedForAdmission.set(null);
    this.selectedPatientId = '';
    this.admissionNote = '';
  }

  submitAdmission() {
    const bed = this.selectedBedForAdmission();
    if (!bed) return;
    if (!this.selectedPatientId) {
      this.store.addToast('error', 'Patient Required', 'Select a patient before confirming admission.');
      return;
    }
    this.store.assignBedToPatient(bed, this.selectedPatientId, this.admissionNote);
    this.closeAdmissionModal();
  }

  openDischargeModal(bed: Bed) {
    this.selectedBedForDischarge.set(bed);
    this.dischargeNote = 'Discharged from ward. Final room charge sent to Billing.';
  }

  closeDischargeModal() {
    this.selectedBedForDischarge.set(null);
    this.dischargeNote = '';
  }

  submitDischarge() {
    const bed = this.selectedBedForDischarge();
    if (!bed) return;
    this.store.dischargeBedAndInvoice(bed, this.dischargeNote);
    this.closeDischargeModal();
  }

  estimatedDays(bed: Bed): number {
    if (!bed.admittedAtUtc) return 1;
    const hours = Math.max(1, (Date.now() - new Date(bed.admittedAtUtc).getTime()) / 36e5);
    return Math.max(1, Math.ceil(hours / 24));
  }

  estimatedCharge(bed: Bed): number {
    return this.estimatedDays(bed) * bed.dailyRate;
  }

  formatDateTime(value?: string): string {
    return value ? new Date(value).toLocaleString() : 'Not recorded';
  }
}
