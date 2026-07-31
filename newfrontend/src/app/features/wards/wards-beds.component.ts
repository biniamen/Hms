import { ChangeDetectionStrategy, Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { Bed } from '../../core/models';

@Component({
  selector: 'app-wards-beds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- HEADER BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Hospital Ward Bed Matrix</h1>
          <p class="text-xs text-slate-500 mt-1">Live bed allocation, ICU occupancy, and bed turnover management</p>
        </div>

        <div class="flex items-center gap-3">
          <div class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 subtle-shadow">
            Bed Occupancy: <span class="text-amber-600 font-mono">{{ store.bedOccupancyRate() }}%</span>
          </div>
          <button
            type="button"
            (click)="isBedFormVisible.set(true)"
            class="rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white shadow-xl shadow-slate-200 transition-all hover:bg-teal-600">
            <span class="material-icons align-middle text-base">add_home_work</span>
            Add Bed
          </button>
        </div>
      </div>

      @if (isBedFormVisible()) {
        <form (ngSubmit)="saveBed()" class="rounded-[2rem] border border-teal-100 bg-white p-6 shadow-sm">
          <div class="mb-5 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-black text-slate-900">Register Ward Bed</h3>
              <p class="text-xs text-slate-500">Beds are recorded against a ward, room, and unique bed number.</p>
            </div>
            <button type="button" (click)="resetBedForm()" class="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label class="space-y-1">
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Ward *</span>
              <input [(ngModel)]="bedForm.ward" name="ward" required placeholder="Medical Ward" [class]="inputClasses" />
            </label>
            <label class="space-y-1">
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Room *</span>
              <input [(ngModel)]="bedForm.room" name="room" required placeholder="101" [class]="inputClasses" />
            </label>
            <label class="space-y-1">
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Bed Number *</span>
              <input [(ngModel)]="bedForm.bedNumber" name="bedNumber" required placeholder="MW-101-A" [class]="inputClasses" />
            </label>
            <label class="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-black text-emerald-700">
              <input [(ngModel)]="bedForm.isAvailable" name="isAvailable" type="checkbox" class="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
              Available for admission
            </label>
          </div>
          <div class="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" (click)="resetBedForm()" class="rounded-xl px-5 py-2 text-xs font-black text-slate-500 hover:bg-slate-100">Discard</button>
            <button type="submit" class="rounded-xl bg-teal-600 px-6 py-2 text-xs font-black text-white shadow-lg shadow-teal-500/20 hover:bg-teal-700">Save Bed</button>
          </div>
        </form>
      }

      <!-- WARD FILTER PILLS -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1">
        <button 
          (click)="selectedWard.set('ALL')" 
          [class]="selectedWard() === 'ALL' ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
          class="px-3.5 py-1.5 rounded-xl text-xs transition-all">
          All Wards
        </button>
        @for (ward of wardNames(); track ward) {
          <button
            (click)="selectedWard.set(ward)"
            [class]="selectedWard() === ward ? 'bg-teal-600 text-white font-bold' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
            class="px-3.5 py-1.5 rounded-xl text-xs transition-all">
            {{ ward }}
          </button>
        }
      </div>

      <!-- BEDS GRID -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 gap-4">
        @for (bed of filteredBeds(); track bed.id) {
          <div 
            [class]="bed.isOccupied ? 'bg-white border-rose-200 shadow-xs' : 'bg-white border-slate-200 subtle-shadow'"
            class="rounded-2xl p-5 border relative overflow-hidden transition-all hover:shadow-md">
            
            <div class="flex items-center justify-between mb-3">
              <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs font-bold">
                Bed #{{ bed.bedNumber }}
              </span>

              <span [class]="bed.isOccupied ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border">
                {{ bed.isOccupied ? 'OCCUPIED' : 'AVAILABLE' }}
              </span>
            </div>

            <div class="space-y-1 mb-4">
              <div class="text-xs text-slate-500">Ward Unit: <span class="font-semibold text-slate-800">{{ bed.wardName }}</span></div>
              <div class="text-xs text-slate-500">Room: <span class="font-semibold text-slate-800">{{ bed.roomNumber }}</span> ({{ bed.type }})</div>
            </div>

            @if (bed.isOccupied) {
              <div class="p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-xs space-y-1 mb-4">
                <div class="font-bold text-slate-900">{{ bed.patientName }}</div>
                <div class="text-[10px] text-slate-500">MRN: {{ bed.patientMrn }} • Admitted: {{ bed.admittedDate }}</div>
              </div>

              <button 
                (click)="releaseBed(bed)" 
                class="w-full py-2 bg-slate-100 hover:bg-rose-50 text-rose-700 hover:border-rose-200 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5">
                <span class="material-icons text-base">no_meeting_room</span>
                <span>Discharge & Release Bed</span>
              </button>
            } @else {
              <div class="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-emerald-800 font-medium mb-4 flex items-center gap-2">
                <span class="material-icons text-emerald-600 text-sm">sanitizer</span>
                <span>Sanitized & ready for admission</span>
              </div>

              <button 
                (click)="assignBed(bed)" 
                class="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5">
                <span class="material-icons text-base">person_add</span>
                <span>Assign Patient to Bed</span>
              </button>
            }

          </div>
        }
      </div>

    </div>
  `
})
export class WardsBedsComponent {
  store = inject(StoreService);

  selectedWard = signal<string>('ALL');
  isBedFormVisible = signal(false);
  readonly inputClasses = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5';

  bedForm = {
    ward: 'Medical Ward',
    room: '',
    bedNumber: '',
    isAvailable: true,
  };

  wardNames = computed(() => Array.from(new Set(this.store.beds().map(bed => bed.wardName))).sort());

  filteredBeds = computed(() => {
    const ward = this.selectedWard();
    if (ward === 'ALL') return this.store.beds();
    return this.store.beds().filter(b => b.wardName === ward);
  });

  saveBed() {
    if (!this.bedForm.ward || !this.bedForm.room || !this.bedForm.bedNumber) {
      this.store.addToast('error', 'Bed Validation', 'Ward, room, and bed number are required.');
      return;
    }

    this.store.createBed({ ...this.bedForm });
    this.resetBedForm();
  }

  resetBedForm() {
    this.isBedFormVisible.set(false);
    this.bedForm = {
      ward: 'Medical Ward',
      room: '',
      bedNumber: '',
      isAvailable: true,
    };
  }

  releaseBed(bed: Bed) {
    this.store.updateBedAvailability(bed.id, true);
    this.store.beds.update(list => list.map(b => b.id === bed.id ? {
      ...b,
      isOccupied: false,
      patientId: undefined,
      patientName: undefined,
      patientMrn: undefined,
      admittedDate: undefined
    } : b));
    this.store.addToast('info', 'Bed Released', `Bed ${bed.bedNumber} is now marked sanitized and available.`);
  }

  assignBed(bed: Bed) {
    const unassignedPatient = this.store.patients().find(p => p.status === 'IN_TRIAGE' || p.status === 'ADMITTED');
    if (unassignedPatient) {
      this.store.updateBedAvailability(bed.id, false);
      this.store.beds.update(list => list.map(b => b.id === bed.id ? {
        ...b,
        isOccupied: true,
        patientId: unassignedPatient.id,
        patientName: unassignedPatient.name,
        patientMrn: unassignedPatient.mrn,
        admittedDate: new Date().toISOString().split('T')[0]
      } : b));

      this.store.patients.update(list => list.map(p =>
        p.id === unassignedPatient.id ? {
          ...p,
          status: 'ADMITTED' as const,
          assignedBedNumber: bed.bedNumber,
          assignedWard: bed.wardName
        } : p
      ));

      this.store.addToast('success', 'Bed Assigned', `Bed ${bed.bedNumber} assigned to ${unassignedPatient.name}.`);
    } else {
      this.store.addToast('warning', 'No Triage Patient', 'All current patients are already assigned or discharged.');
    }
  }
}
