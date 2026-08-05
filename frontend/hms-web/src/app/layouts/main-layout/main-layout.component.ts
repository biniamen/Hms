import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../api.service';
import { StoreService } from '../../core/services/store.service';
import { NavItem } from '../../core/models';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="fixed right-4 top-4 z-50 grid w-[min(420px,calc(100vw-2rem))] gap-3">
      <button
        *ngFor="let toast of store.toasts()"
        type="button"
        (click)="store.dismissToast(toast.id)"
        class="rounded-lg border px-4 py-3 text-left text-sm font-semibold shadow-float transition hover:opacity-80"
        [ngClass]="{
          'border-emerald-200 bg-emerald-50 text-emerald-800': toast.kind === 'success',
          'border-red-200 bg-red-50 text-red-800': toast.kind === 'error',
          'border-blue-200 bg-blue-50 text-blue-800': toast.kind === 'info'
        }"
      >
        {{ toast.message }}
      </button>
    </div>

    <div class="grid min-h-screen grid-cols-[280px_minmax(0,1fr)] max-[900px]:grid-cols-1" *ngIf="store.session() as user">
      <aside class="bg-brand-900 p-5 text-white">
        <div class="mb-7 flex items-center gap-3">
          <span class="grid h-11 w-11 place-items-center rounded-lg bg-mint-500 text-lg font-black">H</span>
          <div>
            <strong class="block text-lg">HMS Platform</strong>
            <span class="text-xs uppercase text-slate-300">{{ user.role }}</span>
          </div>
        </div>

        <nav class="grid gap-2 max-[900px]:grid-cols-2">
          <a
            *ngFor="let item of navItems"
            [routerLink]="item.path"
            routerLinkActive="!border-slate-500 !bg-slate-800"
            [hidden]="!canSee(item, user)"
            class="rounded-lg border border-transparent px-4 py-3 text-left text-sm font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
          >
            {{ item.label }}
          </a>
        </nav>
      </aside>

      <section class="min-w-0 overflow-auto p-7 max-[700px]:p-4">
        <header class="mb-5 flex items-center justify-between gap-4 max-[700px]:items-start max-[700px]:flex-col">
          <div>
            <p class="text-xs font-extrabold uppercase text-slate-500">Enterprise HMS Workspace</p>
            <h1 class="text-3xl font-black text-slate-900">{{ title }}</h1>
          </div>
          <div class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-panel">
            <div class="text-right">
              <strong class="block text-sm text-slate-800">{{ user.emailAddress }}</strong>
              <span class="text-xs font-bold uppercase text-slate-500">{{ user.permission }}</span>
            </div>
            <button class="btn-secondary" type="button" (click)="logout()">Logout</button>
          </div>
        </header>

        <router-outlet></router-outlet>
      </section>
    </div>
  `,
  styles: [],
})
export class MainLayoutComponent implements OnInit {
  readonly title = 'Dashboard';
  readonly routerLinkActiveOptions = { exact: false };

  readonly navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', roles: ['ALL'] },
    { id: 'operations', label: 'Service Portal', path: '/operations', roles: ['ADMIN'] },
    { id: 'admin', label: 'Administration', path: '/admin', roles: ['ADMIN'] },
    { id: 'enterprise', label: 'Enterprise HMS', path: '/enterprise', roles: ['ADMIN'] },
    { id: 'employees', label: 'Employees', path: '/employees', roles: ['ADMIN', 'HR_MANAGER'] },
    { id: 'patients', label: 'Patients', path: '/patients', roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'] },
    { id: 'insurance', label: 'Insurance', path: '/insurance', roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'] },
    { id: 'appointments', label: 'Appointments', path: '/appointments', roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR'] },
    { id: 'clinical', label: 'Clinical', path: '/clinical', roles: ['ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'PHARMACIST'] },
    { id: 'billing', label: 'Billing', path: '/billing', roles: ['ADMIN', 'ACCOUNTANT', 'CASHIER'] },
  ];

  constructor(
    private api: ApiService,
    public store: StoreService,
    public router: Router
  ) {}

  ngOnInit() {
    if (this.api.session()) {
      this.store.loadAll();
    }
  }

  canSee(item: NavItem, session: { role: string } | null) {
    return !!session && (item.roles.includes('ALL') || item.roles.includes(session.role));
  }

  logout() {
    this.api.clearSession();
    this.router.navigate(['/login']);
  }
}
