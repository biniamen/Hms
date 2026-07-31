import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 animate-fade-in">
      
      <!-- PAGE HEADER -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight font-display">Dashboard Overview</h1>
          <p class="text-slate-500 text-sm mt-1">Monitor your clinical activity and patient flow in real-time.</p>
        </div>
        <a routerLink="/appointments" class="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all flex items-center space-x-2 active:scale-95">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
          <span>New Appointment</span>
        </a>
      </div>

      <!-- KPI METRIC TILES GRID -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <!-- Total Active Patients Card -->
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
          <div class="flex items-center justify-between">
            <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            </div>
            <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+12.5%</span>
          </div>
          <p class="text-slate-500 text-sm font-medium mt-4">Total Patients</p>
          <p class="text-2xl font-black text-slate-900 font-display">{{ store.totalPatientsCount() }}</p>
        </div>

        <!-- Bed Occupancy Card -->
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
          <div class="flex items-center justify-between">
            <div class="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"></path></svg>
            </div>
            <span class="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">-2.1%</span>
          </div>
          <p class="text-slate-500 text-sm font-medium mt-4">Bed Occupancy</p>
          <p class="text-2xl font-black text-slate-900 font-display">{{ store.bedOccupancyRate() }}%</p>
        </div>

        <!-- Today's Appointments Card -->
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
          <div class="flex items-center justify-between">
            <div class="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <span class="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">Stable</span>
          </div>
          <p class="text-slate-500 text-sm font-medium mt-4">Appointments Today</p>
          <p class="text-2xl font-black text-slate-900 font-display">{{ store.todayAppointmentsCount() }}</p>
        </div>

        <!-- Revenue Card -->
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
          <div class="flex items-center justify-between">
            <div class="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+24%</span>
          </div>
          <p class="text-slate-500 text-sm font-medium mt-4">Revenue (MoM)</p>
          <p class="text-2xl font-black text-slate-900 font-display">$242.5k</p>
        </div>

      </div>

      <!-- MAIN SECTION: INCOMING APPOINTMENTS & UNIT AVAILABILITY -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left 2 Cols: Incoming Appointments & Patients Queue -->
        <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h3 class="font-black text-lg text-slate-900 font-display">Incoming Appointments & Triage</h3>
            <a routerLink="/appointments" class="text-sm font-bold text-teal-600 hover:underline">View All</a>
          </div>
          
          <div class="flex-1 overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead class="bg-slate-50 sticky top-0">
                <tr>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vitals</th>
                  <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50 text-sm">
                @for (patient of store.patients(); track patient.id) {
                  <tr class="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                    <td class="px-6 py-4">
                      <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {{ patient.name.charAt(0) }}
                        </div>
                        <div>
                          <span class="text-sm font-bold text-slate-700 group-hover:text-teal-600 transition-colors block">{{ patient.name }}</span>
                          <span class="text-[10px] text-slate-400 font-mono">{{ patient.mrn }}</span>
                        </div>
                      </div>
                    </td>

                    <td class="px-6 py-4 text-sm text-slate-500 font-medium">
                      {{ patient.primaryCondition }}
                    </td>

                    <td class="px-6 py-4">
                      <span [class]="getStatusPillClass(patient.status)" class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase">
                        <span class="w-1.5 h-1.5 rounded-full" [class]="getStatusDotClass(patient.status)"></span>
                        <span>{{ patient.status }}</span>
                      </span>
                    </td>

                    <td class="px-6 py-4 text-xs font-mono text-slate-600">
                      BP: {{ patient.vitals.bp }}
                    </td>

                    <td class="px-6 py-4 text-right">
                      <a routerLink="/patients" class="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-2.5 py-1 rounded-lg transition-colors">
                        Chart
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right 1 Col: Unit Availability Panel -->
        <div class="bg-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <h3 class="font-black text-lg mb-6 font-display">Unit Availability</h3>
            <div class="space-y-6">
              <div>
                <div class="flex justify-between text-xs mb-2">
                  <span class="text-slate-400 font-medium">ICU Capacity</span>
                  <span class="font-bold">92%</span>
                </div>
                <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full bg-rose-500 rounded-full w-[92%] transition-all duration-500"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs mb-2">
                  <span class="text-slate-400 font-medium">Emergency Dept.</span>
                  <span class="font-bold">45%</span>
                </div>
                <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 rounded-full w-[45%] transition-all duration-500"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs mb-2">
                  <span class="text-slate-400 font-medium">Outpatient Center</span>
                  <span class="font-bold">78%</span>
                </div>
                <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-500 rounded-full w-[78%] transition-all duration-500"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-auto">
            <div class="bg-slate-800 p-4 rounded-xl">
              <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Queue Health</p>
              <div class="flex items-baseline space-x-2">
                <span class="text-2xl font-black font-display">08m</span>
                <span class="text-xs text-emerald-400 font-bold">Avg Wait</span>
              </div>
              <div class="flex mt-4 space-x-1 h-8 items-end">
                <div class="flex-1 bg-emerald-500 h-[20%] rounded-sm opacity-50"></div>
                <div class="flex-1 bg-emerald-500 h-[40%] rounded-sm opacity-60"></div>
                <div class="flex-1 bg-emerald-500 h-[30%] rounded-sm opacity-50"></div>
                <div class="flex-1 bg-emerald-500 h-[60%] rounded-sm opacity-80"></div>
                <div class="flex-1 bg-emerald-500 h-[90%] rounded-sm"></div>
                <div class="flex-1 bg-emerald-500 h-[70%] rounded-sm opacity-90"></div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  `
})
export class DashboardComponent {
  store = inject(StoreService);

  currentUser = computed(() => this.store.currentUser());
  todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  getAge(dobStr: string): number {
    const dob = new Date(dobStr);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  getPercent(num: number, total: number): number {
    if (!total) return 0;
    return Math.round((num / total) * 100);
  }

  getStatusPillClass(status: string): string {
    switch (status) {
      case 'ADMITTED': return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'OUTPATIENT': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'IN_TRIAGE': return 'bg-amber-50 text-amber-700 border border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'ADMITTED': return 'bg-rose-500';
      case 'OUTPATIENT': return 'bg-emerald-500';
      case 'IN_TRIAGE': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  }
}
