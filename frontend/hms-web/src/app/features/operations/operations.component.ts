import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-operations',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid gap-5">
      <div class="flex items-center justify-between gap-3 max-[700px]:flex-col max-[700px]:items-stretch">
        <div>
          <h2 class="text-xl font-black text-slate-900">Microservice Operations Portal</h2>
          <p class="text-sm text-slate-500">Four production-focused services: Identity/Admin, Patient Management, Clinical, and Billing.</p>
        </div>
        <button class="btn-secondary" type="button" (click)="store.loadAll()">Refresh Status</button>
      </div>

      <div class="grid grid-cols-4 gap-4 max-[1200px]:grid-cols-2 max-[720px]:grid-cols-1">
        <article *ngFor="let service of store.services()" class="enterprise-panel p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-black text-slate-900">{{ service.name }}</h3>
              <p class="mt-1 text-sm leading-6 text-slate-500">{{ service.description }}</p>
            </div>
            <span class="badge" [class.badge-green]="service.status === 'Running'">{{ service.status }}</span>
          </div>
          <div class="mt-4 rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-600">{{ service.url }}</div>
          <button class="btn-primary mt-4 w-full" type="button" [disabled]="!service.canStart || store.saving()" (click)="startService(service.id)">
            {{ service.canStart ? 'Start Service' : 'Managed Externally' }}
          </button>
        </article>
      </div>
    </section>
  `,
})
export class OperationsComponent {
  constructor(public store: StoreService) {}

  startService(id: string) {
    this.store.saving.set(true);
    this.store.startService(id).subscribe({
      next: (res) => {
        this.store.saving.set(false);
        this.store.toast('success', res.message);
        setTimeout(() => this.store.loadAll(), 1800);
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'Service start is available only when the gateway runs locally in Development mode.');
      },
    });
  }
}
