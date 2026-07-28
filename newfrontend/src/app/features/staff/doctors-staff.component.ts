import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../core/services/store.service';
import { AVATARS } from '../../core/models';

@Component({
  selector: 'app-doctors-staff',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- TOP BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Hospital Medical Staff & Faculty Directory</h1>
          <p class="text-xs text-slate-500 mt-1">Speciality credentials, medical board licenses, and shift availability</p>
        </div>

        <div class="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 subtle-shadow">
          Active Workforce: <span class="text-teal-600 font-mono">{{ store.employees().length }} Staff Members</span>
        </div>
      </div>

      <!-- ROLE FILTER STRIP -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1">
        <button 
          (click)="selectedRoleFilter.set('ALL')" 
          [class]="selectedRoleFilter() === 'ALL' ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
          class="px-3.5 py-1.5 rounded-xl text-xs transition-all">
          All Staff
        </button>
        <button 
          (click)="selectedRoleFilter.set('DOCTOR')" 
          [class]="selectedRoleFilter() === 'DOCTOR' ? 'bg-teal-600 text-white font-bold' : 'bg-teal-50 text-teal-800 border border-teal-200'"
          class="px-3.5 py-1.5 rounded-xl text-xs transition-all">
          Physicians & Doctors
        </button>
        <button 
          (click)="selectedRoleFilter.set('NURSE')" 
          [class]="selectedRoleFilter() === 'NURSE' ? 'bg-indigo-600 text-white font-bold' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'"
          class="px-3.5 py-1.5 rounded-xl text-xs transition-all">
          Nursing Staff
        </button>
        <button 
          (click)="selectedRoleFilter.set('PHARMACIST')" 
          [class]="selectedRoleFilter() === 'PHARMACIST' ? 'bg-emerald-600 text-white font-bold' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'"
          class="px-3.5 py-1.5 rounded-xl text-xs transition-all">
          Pharmacists
        </button>
        <button 
          (click)="selectedRoleFilter.set('LAB_TECH')" 
          [class]="selectedRoleFilter() === 'LAB_TECH' ? 'bg-purple-600 text-white font-bold' : 'bg-purple-50 text-purple-800 border border-purple-200'"
          class="px-3.5 py-1.5 rounded-xl text-xs transition-all">
          Lab Specialists
        </button>
      </div>

      <!-- STAFF DIRECTORY CARDS GRID -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (emp of filteredEmployees(); track emp.id) {
          <div class="bg-white rounded-2xl p-5 border border-slate-200/80 subtle-shadow card-hover space-y-4">
            
            <div class="flex items-start gap-3">
              <img 
                [src]="emp.avatarUrl" 
                alt="Avatar" 
                class="w-12 h-12 rounded-2xl object-cover border-2 border-slate-200 shrink-0" 
                referrerpolicy="no-referrer"
              />
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-bold text-slate-900 font-display truncate">{{ emp.name }}</h3>
                <p class="text-xs text-teal-600 font-semibold truncate">{{ emp.department }}</p>
                @if (emp.specialization) {
                  <p class="text-[10px] text-slate-400 truncate">{{ emp.specialization }}</p>
                }
              </div>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1 font-mono">
              <div class="flex items-center justify-between text-slate-600">
                <span>Role Badge:</span>
                <span class="font-bold text-slate-900 uppercase text-[10px] bg-white px-2 py-0.5 rounded border">{{ emp.role }}</span>
              </div>
              @if (emp.licenseNumber) {
                <div class="flex items-center justify-between text-slate-500 text-[10px]">
                  <span>Board License:</span>
                  <span class="font-bold text-slate-700">{{ emp.licenseNumber }}</span>
                </div>
              }
              <div class="flex items-center justify-between text-slate-500 text-[10px]">
                <span>Contact Phone:</span>
                <span class="text-slate-700">{{ emp.phone }}</span>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1 text-xs">
              <span class="inline-flex items-center gap-1.5 text-emerald-600 text-[11px] font-semibold">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                On Duty Shift
              </span>
              <span class="text-[10px] text-slate-400 font-mono">{{ emp.email }}</span>
            </div>

          </div>
        }
      </div>

    </div>
  `
})
export class DoctorsStaffComponent {
  store = inject(StoreService);

  selectedRoleFilter = signal<string>('ALL');

  /** Map BackendEmployee[] → display objects with avatarUrl, name, licenseNumber, email */
  filteredEmployees = computed(() => {
    const role = this.selectedRoleFilter();
    const all = this.store.employees();
    const filtered = role === 'ALL' ? all : all.filter(e => e.role === role);
    return filtered.map(emp => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      avatarUrl: AVATARS[emp.role.toLowerCase()] || AVATARS['default'],
      department: emp.department || 'Clinical',
      specialization: emp.specialization,
      role: emp.role,
      licenseNumber: emp.employeeNo,
      phone: emp.phone || '-',
      email: emp.emailAddress,
    }));
  });
}
