import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="grid gap-4">
      <!-- Stats -->
      <section class="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
        <article *ngFor="let stat of store.employeeStats()" class="enterprise-panel p-5">
          <span class="inline-flex rounded-lg px-3 py-1 text-xs font-black uppercase" [ngClass]="stat.tone">{{ stat.label }}</span>
          <strong class="mt-3 block text-3xl font-black text-slate-900">{{ stat.value }}</strong>
        </article>
      </section>

      <!-- Search + Actions -->
      <div class="enterprise-panel p-4">
        <div class="flex items-center justify-between gap-3 max-[900px]:flex-col max-[900px]:items-stretch">
          <label class="field-label max-w-sm flex-1">Search
            <input class="field-control" [ngModel]="store.search()" (ngModelChange)="store.search.set($event)" placeholder="Filter employees..." [ngModelOptions]="{standalone: true}">
          </label>
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary" (click)="store.exportExcel('employees', store.employees())">Excel</button>
            <button class="btn-secondary" (click)="store.exportPdf('employees', store.employees())">PDF</button>
            <button class="btn-secondary" (click)="store.printTable('employees', store.employees())">Print</button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="enterprise-panel overflow-auto p-4">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Permission</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.employees())">
              <td class="font-bold">{{ row.firstName }} {{ row.lastName }}</td>
              <td>{{ row.emailAddress }}</td>
              <td><span class="badge badge-blue">{{ row.role }}</span></td>
              <td>{{ row.permission }}</td>
              <td><span class="badge" [class.badge-green]="row.isActive && row.passwordSetupCompleted">{{ !row.isActive ? 'Inactive' : row.passwordSetupCompleted ? 'Active' : 'Pending Setup' }}</span></td>
              <td><button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" [disabled]="store.saving()" (click)="resendInvite(row.id)">Send Invite</button></td>
            </tr>
            <tr *ngIf="!store.employees().length"><td colspan="6" class="text-center text-slate-500 py-8">No employees loaded</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class EmployeesComponent {
  constructor(public store: StoreService) {}

  resendInvite(id: string) {
    this.store.saving.set(true);
    this.store.resendEmployeeInvite(id).subscribe({
      next: (res) => {
        this.store.saving.set(false);
        this.store.copySetupUrl(res.data.setupUrl);
        this.store.toast('success', 'Invitation prepared.');
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'Invitation could not be prepared.');
      },
    });
  }
}
