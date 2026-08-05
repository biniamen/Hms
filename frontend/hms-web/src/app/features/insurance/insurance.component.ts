import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-insurance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="grid gap-4">
      <!-- Stats -->
      <section class="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
        <article *ngFor="let stat of store.insuranceStats()" class="enterprise-panel p-5">
          <span class="inline-flex rounded-lg px-3 py-1 text-xs font-black uppercase" [ngClass]="stat.tone">{{ stat.label }}</span>
          <strong class="mt-3 block text-3xl font-black text-slate-900">{{ stat.value }}</strong>
        </article>
      </section>

      <!-- Search + Actions -->
      <div class="enterprise-panel p-4">
        <div class="flex items-center justify-between gap-3 max-[900px]:flex-col max-[900px]:items-stretch">
          <label class="field-label max-w-sm flex-1">Search
            <input class="field-control" [ngModel]="store.search()" (ngModelChange)="store.search.set($event)" placeholder="Filter insurance companies..." [ngModelOptions]="{standalone: true}">
          </label>
          <div class="flex flex-wrap gap-2">
            <button class="btn-primary" type="button" (click)="showModal.set(true)">Register Company</button>
            <button class="btn-secondary" (click)="store.exportExcel('insurance', store.insuranceCompanies())">Excel</button>
          </div>
        </div>
      </div>

      <!-- Insurance Cards -->
      <div class="grid grid-cols-3 gap-4 max-[1000px]:grid-cols-1">
        <article *ngFor="let company of store.filtered(store.insuranceCompanies())" class="enterprise-panel p-5">
          <div class="flex items-start justify-between gap-3">
            <div><span class="badge badge-blue">{{ company.payerCode }}</span><h3 class="mt-3 text-lg font-black text-slate-900">{{ company.name }}</h3></div>
            <span class="badge" [class.badge-green]="company.isActive">{{ company.coveragePercent }}%</span>
          </div>
          <p class="mt-3 text-sm text-slate-500">{{ company.coverageType }} coverage</p>
          <div class="mt-4 grid gap-2 text-sm text-slate-700">
            <span><strong>Contact:</strong> {{ company.contactPerson || '-' }}</span>
            <span><strong>Phone:</strong> {{ company.phone }}</span>
            <span><strong>Email:</strong> {{ company.email || '-' }}</span>
            <span><strong>Address:</strong> {{ company.address || '-' }}</span>
          </div>
        </article>
        <article *ngIf="!store.insuranceCompanies().length" class="enterprise-panel p-5 col-span-full text-center text-slate-500 py-8">
          No insurance companies registered
        </article>
      </div>

      <!-- Register Modal -->
      <div *ngIf="showModal()" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">Register Insurance Company</h2>
            <button class="btn-secondary" type="button" (click)="showModal.set(false)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createInsuranceCompany()">
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Company Name<input class="field-control" name="icname" [(ngModel)]="form.name"></label>
              <label class="field-label">Payer Code<input class="field-control" name="iccode" [(ngModel)]="form.payerCode"></label>
              <label class="field-label">Contact Person<input class="field-control" name="icperson" [(ngModel)]="form.contactPerson"></label>
              <label class="field-label">Phone<input class="field-control" name="icphone" [(ngModel)]="form.phone"></label>
              <label class="field-label">Email<input class="field-control" type="email" name="icemail" [(ngModel)]="form.email"></label>
              <label class="field-label">Coverage Type<select class="field-control" name="ictype" [(ngModel)]="form.coverageType"><option>Corporate</option><option>Employer Fund</option><option>Community</option><option>Private</option></select></label>
              <label class="field-label">Coverage %<input class="field-control" type="number" min="0" max="100" name="icpercent" [(ngModel)]="form.coveragePercent"></label>
              <label class="field-label">Address<input class="field-control" name="icaddr" [(ngModel)]="form.address"></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Register Insurance Company</button>
          </form>
        </div>
      </div>
    </section>
  `,
})
export class InsuranceComponent {
  showModal = signal(false);
  form = { name: '', payerCode: '', contactPerson: '', phone: '', email: '', address: '', coverageType: 'Corporate', coveragePercent: 80 };

  constructor(
    public store: StoreService,
    private api: ApiService
  ) {}

  createInsuranceCompany() {
    this.store.saving.set(true);
    this.store.createInsuranceCompany(this.form).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.showModal.set(false);
        this.store.toast('success', 'Insurance company registered.');
        this.store.loadAll();
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'Registration failed.');
      },
    });
  }
}
