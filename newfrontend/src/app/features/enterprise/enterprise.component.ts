import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ApiService } from '../../api.service';
import type { BackendEnterpriseRecord } from '../../core/models';

@Component({
  selector: 'app-enterprise',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Enterprise Operations Desk</h1>
          <p class="text-xs text-slate-500 mt-1">Cross-departmental operational tracking and management</p>
        </div>
      </div>

      <!-- Module Tabs -->
      <div class="bg-white rounded-2xl border border-slate-200/80 subtle-shadow p-4">
        <div class="flex flex-wrap gap-1.5">
          @for (mod of store.enterpriseModules; track mod.id) {
            <button (click)="selectedModule.set(mod)" [class]="selectedModule().id === mod.id ? 'bg-teal-600 text-white font-bold' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'" class="px-3 py-1.5 rounded-lg text-[10px] transition-all">
              {{ mod.label }}
            </button>
          }
        </div>
      </div>

      @if (selectedModule(); as mod) {
        <!-- Module Header -->
        <div class="bg-white rounded-2xl border border-slate-200/80 subtle-shadow overflow-hidden">
          <div class="grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-0">
            <div class="p-6">
              <p class="text-[10px] font-bold uppercase text-teal-600">{{ mod.area }}</p>
              <h2 class="mt-1 text-lg font-black text-slate-900 font-display">{{ mod.label }}</h2>
              <p class="mt-2 text-xs text-slate-600">{{ mod.description }}</p>
              <button (click)="showNewRecord.set(true)" class="mt-4 px-4 py-2 bg-teal-600 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-500/20">{{ mod.action }}</button>
            </div>
            <div class="bg-slate-900 p-6 text-white">
              <p class="text-[10px] font-bold uppercase text-slate-300">Workflow</p>
              <div class="mt-4 space-y-2">
                @for (step of mod.workflow; track step; let i = $index) {
                  <div class="flex items-center gap-2 text-xs">
                    <span class="grid w-5 h-5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-black place-items-center">{{ i + 1 }}</span>
                    <span class="text-slate-300">{{ step }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Records Table -->
        <div class="bg-white rounded-2xl border border-slate-200/80 subtle-shadow overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 class="text-xs font-bold text-slate-800">{{ mod.label }} Worklist</h3>
            <button (click)="showNewRecord.set(true)" class="px-3 py-1.5 bg-teal-600 text-white font-bold rounded-lg text-xs">+ New Record</button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr><th>Record</th><th>Patient</th><th>Title</th><th>Owner</th><th>Priority</th><th>Status</th><th>Due</th><th>Action</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (rec of filteredRecords(); track rec.id) {
                  <tr class="hover:bg-slate-50/80">
                    <td class="py-3 px-4 font-bold text-slate-900 font-mono">{{ rec.recordNumber }}</td>
                    <td class="py-3 px-4 text-slate-600">{{ rec.patientId ? getPatientName(rec.patientId) : '-' }}</td>
                    <td class="py-3 px-4">{{ rec.title }}<br><span class="text-[10px] text-slate-400">{{ rec.details }}</span></td>
                    <td class="py-3 px-4">{{ rec.owner }}</td>
                    <td class="py-3 px-4">
                      <span [class]="rec.priority === 'High' || rec.priority === 'Urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'" class="px-2 py-0.5 rounded text-[10px] font-bold border">{{ rec.priority }}</span>
                    </td>
                    <td class="py-3 px-4">
                      <span [class]="rec.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : rec.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'" class="px-2 py-0.5 rounded-full text-[10px] font-bold border">{{ rec.status }}</span>
                    </td>
                    <td class="py-3 px-4 text-slate-400">{{ rec.dueAtUtc ? (rec.dueAtUtc | date: 'short') : '-' }}</td>
                    <td class="py-3 px-4">
                      <div class="flex gap-1">
                        @if (rec.status !== 'In Progress' && rec.status !== 'Completed') {<button (click)="updateStatus(rec.id, 'In Progress')" class="px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold">Start</button>}
                        @if (rec.status === 'In Progress') {<button (click)="updateStatus(rec.id, 'Under Review')" class="px-2 py-1 bg-amber-600 text-white rounded-lg text-[10px] font-bold">Review</button>}
                        @if (rec.status !== 'Completed') {<button (click)="updateStatus(rec.id, 'Completed')" class="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold">Close</button>}
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="py-8 text-center text-slate-400">No records in this area</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `
})
export class EnterpriseComponent {
  store = inject(StoreService);
  api = inject(ApiService);

  selectedModule = signal(this.store.enterpriseModules[0]);
  showNewRecord = signal(false);

  filteredRecords = computed(() =>
    this.store.enterpriseRecords().filter(r => r.area === this.selectedModule().area)
  );

  getPatientName(patientId: string): string {
    const p = this.store.patientById(patientId);
    return p ? p.name : patientId;
  }

  updateStatus(id: string, status: string) {
    this.store.updateEnterpriseRecordStatus(id, status).subscribe({
      next: () => {
        this.store.addToast('success', 'Status Updated', `Record moved to ${status}`);
        this.reloadRecords();
      },
      error: () => this.store.addToast('error', 'Update Failed', 'Could not update record status.'),
    });
  }

  private reloadRecords() {
    this.api.getEnterpriseRecords(this.selectedModule().area).subscribe({
      next: (r) => { if (r.data) this.store.enterpriseRecords.set(r.data); },
    });
  }
}
