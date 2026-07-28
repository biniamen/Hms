import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../core/services/store.service';
import { ApiService } from '../../api.service';
import type { BackendServiceStatus } from '../../core/models';

@Component({
  selector: 'app-operations',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Microservice Operations Portal</h1>
          <p class="text-xs text-slate-500 mt-1">Monitor and manage backend service health</p>
        </div>
        <button (click)="refresh()" class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 self-start sm:self-auto">
          Refresh Status
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        @for (svc of services(); track svc.id) {
          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 subtle-shadow">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-sm font-bold text-slate-900">{{ svc.name }}</h3>
                <p class="text-[11px] text-slate-500 mt-1">{{ svc.description }}</p>
              </div>
              <span [class]="svc.status === 'Running' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'" class="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0">
                {{ svc.status }}
              </span>
            </div>
            <div class="mt-3 bg-slate-50 rounded-lg p-2 text-[10px] font-mono text-slate-600 truncate">{{ svc.url }}</div>
          </div>
        } @empty {
          <div class="col-span-full text-center py-12 text-slate-400 text-sm">No services loaded. Click Refresh to check status.</div>
        }
      </div>
    </div>
  `
})
export class OperationsComponent {
  store = inject(StoreService);
  api = inject(ApiService);
  services = signal<BackendServiceStatus[]>([]);

  constructor() {
    this.refresh();
  }

  refresh() {
    this.api.getServiceStatuses().subscribe({
      next: (data) => this.services.set(data),
      error: () => this.store.addToast('error', 'Connection Error', 'Could not reach the API Gateway.'),
    });
  }
}
