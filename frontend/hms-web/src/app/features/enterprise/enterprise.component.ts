import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { EnterpriseTab } from '../../core/models';

@Component({
  selector: 'app-enterprise',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="grid gap-5">
      <!-- KPIs -->
      <section class="enterprise-panel overflow-hidden">
        <div class="grid grid-cols-[1.15fr_.85fr] gap-0 max-[1000px]:grid-cols-1">
          <div class="p-6">
            <p class="text-xs font-extrabold uppercase text-brand-600">Hospital Operations Desk</p>
            <h2 class="mt-1 text-2xl font-black text-slate-900">{{ activeModule.label }}</h2>
            <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{{ activeModule.description }}</p>
            <div class="mt-5 flex flex-wrap gap-2">
              <button *ngFor="let tab of store.enterpriseModules" class="btn-secondary" type="button" [class.bg-brand-50]="store.enterpriseTab() === tab.id" (click)="store.enterpriseTab.set(tab.id)">
                {{ tab.label }}
              </button>
            </div>
          </div>
          <div class="bg-slate-900 p-6 text-white">
            <p class="text-xs font-extrabold uppercase text-slate-300">Daily Control</p>
            <div class="mt-5 grid gap-4">
              <div *ngFor="let item of enterpriseKpis()" class="rounded-lg border border-white/10 bg-white/5 p-4">
                <div class="flex items-start justify-between gap-3">
                  <span class="text-xs font-extrabold uppercase text-slate-300">{{ item.label }}</span>
                  <strong class="text-2xl font-black text-white">{{ item.value }}</strong>
                </div>
                <p class="mt-2 text-xs leading-5 text-slate-300">{{ item.hint }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Operational Metrics -->
      <section class="grid grid-cols-6 gap-4 max-[1300px]:grid-cols-3 max-[760px]:grid-cols-1">
        <article *ngFor="let metric of enterpriseOperationalMetrics()" class="enterprise-panel p-4">
          <span class="text-xs font-extrabold uppercase text-slate-500">{{ metric.label }}</span>
          <strong class="mt-3 block text-2xl font-black text-slate-900">{{ metric.value }}</strong>
          <p class="mt-2 text-xs leading-5 text-slate-500">{{ metric.hint }}</p>
        </article>
      </section>

      <!-- Workflow -->
      <section class="enterprise-panel p-5">
        <div class="flex items-center justify-between gap-3 max-[700px]:flex-col max-[700px]:items-start">
          <div>
            <h3 class="text-lg font-black text-slate-900">Department Workflow</h3>
            <p class="text-sm text-slate-500">Standard steps followed by the selected service area.</p>
          </div>
          <button class="btn-primary" type="button" (click)="openNewRecord()">{{ activeModule.action }}</button>
        </div>
        <div class="mt-5 grid grid-cols-6 gap-3 max-[1200px]:grid-cols-3 max-[700px]:grid-cols-1">
          <div *ngFor="let step of activeWorkflow(); let i = index" class="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <span class="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white">{{ i + 1 }}</span>
            <strong class="mt-3 block text-sm text-slate-900">{{ step }}</strong>
          </div>
        </div>
      </section>

      <!-- Module Cards -->
      <section class="grid grid-cols-3 gap-4 max-[1100px]:grid-cols-1">
        <article class="enterprise-panel p-5">
          <span class="badge badge-green">Care Delivery</span>
          <h3 class="mt-3 text-base font-black text-slate-900">Clinical departments</h3>
          <p class="mt-2 text-sm leading-6 text-slate-500">Pharmacy, laboratory, radiology, emergency, inpatient, and theatre teams can track work from request to closure.</p>
        </article>
        <article class="enterprise-panel p-5">
          <span class="badge badge-blue">Business Control</span>
          <h3 class="mt-3 text-base font-black text-slate-900">Finance and administration</h3>
          <p class="mt-2 text-sm leading-6 text-slate-500">Claims, inventory, procurement, assets, biomedical maintenance, documents, reporting, and integrations are managed in one desk.</p>
        </article>
        <article class="enterprise-panel p-5">
          <span class="badge">Platform Strength</span>
          <h3 class="mt-3 text-base font-black text-slate-900">Security and communication</h3>
          <p class="mt-2 text-sm leading-6 text-slate-500">Access reviews, notification tasks, document indexing, reports, and integration checks are traceable by owner and due date.</p>
        </article>
      </section>

      <!-- Worklist Table -->
      <section class="enterprise-panel overflow-auto p-4">
        <div class="mb-4 flex items-center justify-between gap-3 max-[700px]:flex-col max-[700px]:items-start">
          <div>
            <h3 class="text-lg font-black text-slate-900">{{ activeModule.label }} Worklist</h3>
            <p class="text-sm text-slate-500">Create records, assign responsibility, track due dates, and close work when it is completed.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-primary" type="button" (click)="openNewRecord()">New Record</button>
            <button class="btn-secondary" type="button" (click)="store.exportExcel(activeModule.area, enterpriseRows())">Excel</button>
            <button class="btn-secondary" type="button" (click)="store.printTable(activeModule.area, enterpriseRows())">Print</button>
          </div>
        </div>
        <table class="data-table">
          <thead><tr><th>Record</th><th>Patient</th><th>Title</th><th>Department</th><th>Owner</th><th>Priority</th><th>Status</th><th>Value</th><th>Due</th><th>Action</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of enterpriseRows()">
              <td class="font-black">{{ row.recordNumber }}</td>
              <td>{{ row.patientId ? store.patientName(row.patientId) : '-' }}</td>
              <td>{{ row.title }}<br><span class="text-xs text-slate-500">{{ row.details }}</span></td>
              <td>{{ row.department }}</td>
              <td>{{ row.owner }}</td>
              <td><span class="badge" [class.badge-blue]="row.priority === 'High'">{{ row.priority }}</span></td>
              <td><span class="badge" [class.badge-green]="row.status === 'Completed'" [class.badge-blue]="row.status === 'In Progress'">{{ row.status }}</span></td>
              <td>{{ row.amount | currency:'ETB' }}</td>
              <td>{{ row.dueAtUtc | date:'short' }}</td>
              <td>
                <div class="flex flex-wrap gap-1">
                  <button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" (click)="updateStatus(row.id, 'In Progress')">Start</button>
                  <button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" (click)="updateStatus(row.id, 'Under Review')">Review</button>
                  <button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" (click)="updateStatus(row.id, 'Completed')">Close</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="!enterpriseRows().length"><td colspan="10" class="text-center text-slate-500 py-8">No records in this area</td></tr>
          </tbody>
        </table>
      </section>

      <!-- New Record Modal -->
      <div *ngIf="showNewRecord()" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(880px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">New {{ activeModule.label }} Record</h2>
            <button class="btn-secondary" type="button" (click)="showNewRecord.set(false)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createRecord()">
            <div class="rounded-lg border border-brand-100 bg-brand-50 p-4">
              <span class="badge badge-blue">{{ recordForm.area }}</span>
              <p class="mt-2 text-sm text-slate-600">{{ activeModule.description }}</p>
            </div>
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Patient<select class="field-control" name="erPatient" [(ngModel)]="recordForm.patientId"><option value="">Not patient specific</option><option *ngFor="let p of store.patients()" [value]="p.id">{{ p.mrn }} - {{ p.firstName }} {{ p.lastName }}</option></select></label>
              <label class="field-label">Department<input class="field-control" name="erDept" [(ngModel)]="recordForm.department"></label>
              <label class="field-label col-span-2">Title<input class="field-control" name="erTitle" [(ngModel)]="recordForm.title" placeholder="Short work description" required></label>
              <label class="field-label">Owner<input class="field-control" name="erOwner" [(ngModel)]="recordForm.owner"></label>
              <label class="field-label">Priority<select class="field-control" name="erPriority" [(ngModel)]="recordForm.priority"><option>Normal</option><option>High</option><option>Urgent</option><option>Low</option></select></label>
              <label class="field-label">Status<select class="field-control" name="erStatus" [(ngModel)]="recordForm.status"><option>Open</option><option>In Progress</option><option>Under Review</option><option>Completed</option></select></label>
              <label class="field-label">Value<input class="field-control" name="erAmount" type="number" [(ngModel)]="recordForm.amount"></label>
              <label class="field-label">Due Date<input class="field-control" name="erDue" type="datetime-local" [(ngModel)]="recordForm.dueAtUtc"></label>
              <label class="field-label col-span-2">Details<textarea class="field-control min-h-28" name="erDetails" [(ngModel)]="recordForm.details"></textarea></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Save Record</button>
          </form>
        </div>
      </div>
    </section>
  `,
})
export class EnterpriseComponent {
  showNewRecord = signal(false);

  recordForm = {
    area: '', patientId: '', title: '', department: '', owner: '',
    priority: 'Normal', status: 'Open', amount: 0, dueAtUtc: '', details: '',
  };

  constructor(public store: StoreService) {}

  get activeModule() {
    return this.store.enterpriseModules.find((m) => m.id === this.store.enterpriseTab()) ?? this.store.enterpriseModules[0];
  }

  activeWorkflow() {
    return this.activeModule.workflow;
  }

  enterpriseRows() {
    return this.store.enterpriseRecords().filter((r) => r.area === this.activeModule.area);
  }

  enterpriseKpis() {
    const records = this.store.enterpriseRecords();
    const open = records.filter((r) => !['Completed', 'Closed'].includes(r.status));
    const highPriority = records.filter((r) => r.priority === 'High' && !['Completed', 'Closed'].includes(r.status));
    return [
      { label: 'Service Areas', value: this.store.enterpriseModules.length, hint: 'Departments available in the enterprise workspace' },
      { label: 'Open Work', value: open.length, hint: 'Active records that still need attention' },
      { label: 'High Priority', value: highPriority.length, hint: 'Urgent clinical, operational, or finance items' },
      { label: 'Completed', value: records.filter((r) => r.status === 'Completed').length, hint: 'Closed operational records' },
    ];
  }

  enterpriseOperationalMetrics() {
    return [
      { label: 'Average Waiting Time', value: `${this.averageWaitMinutes()} min`, hint: 'Current outpatient queue pressure' },
      { label: 'Doctor Utilization', value: `${this.doctorUtilization()}%`, hint: 'Doctors with active queue work' },
      { label: 'Bed Occupancy', value: `${this.bedOccupancyRate()}%`, hint: 'Occupied beds from the bed board' },
      { label: 'No-show Rate', value: `${this.noShowRate()}%`, hint: 'Appointments marked as no-show' },
      { label: 'Insurance Outstanding', value: this.store.money(this.insuranceOutstanding()), hint: 'Open insured patient balance' },
      { label: 'Operations Value', value: this.store.money(this.store.enterpriseRecords().reduce((s, r) => s + r.amount, 0)), hint: 'Value tracked across enterprise records' },
    ];
  }

  openNewRecord() {
    this.recordForm = {
      area: this.activeModule.area, patientId: '', title: '',
      department: this.activeModule.department, owner: this.activeModule.owner,
      priority: 'Normal', status: 'Open', amount: 0,
      dueAtUtc: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      details: '',
    };
    this.showNewRecord.set(true);
  }

  createRecord() {
    const payload = {
      ...this.recordForm,
      patientId: this.recordForm.patientId || undefined,
      amount: Number(this.recordForm.amount) || 0,
      dueAtUtc: new Date(this.recordForm.dueAtUtc).toISOString(),
    };

    this.store.saving.set(true);
    this.store.createEnterpriseRecord(payload).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.showNewRecord.set(false);
        this.store.toast('success', 'Record saved.');
        this.store.loadAll();
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'Record creation failed.');
      },
    });
  }

  updateStatus(id: string, status: string) {
    this.store.updateEnterpriseRecordStatus(id, status).subscribe({
      next: () => {
        this.store.toast('success', 'Status updated.');
        this.store.loadAll();
      },
      error: () => this.store.toast('error', 'Status update failed.'),
    });
  }

  private averageWaitMinutes() {
    const active = this.store.appointments().filter((a) => ['Scheduled', 'Waiting', 'In Service'].includes(a.queueStatus));
    if (!active.length) return 0;
    const now = Date.now();
    const minutes = active.map((a) => {
      const time = new Date(a.startsAtUtc).getTime();
      return Number.isFinite(time) ? Math.max(0, Math.round((now - time) / 60000)) : 0;
    });
    return Math.round(minutes.reduce((s, m) => s + m, 0) / active.length || active.length * 7);
  }

  private doctorUtilization() {
    const doctors = this.store.doctors();
    if (!doctors.length) return 0;
    const activeIds = new Set(this.store.appointments().filter((a) => ['Waiting', 'In Service'].includes(a.queueStatus)).map((a) => a.doctorId));
    return Math.round((activeIds.size / doctors.length) * 100);
  }

  private bedOccupancyRate() {
    const beds = this.store.beds();
    if (!beds.length) return 0;
    return Math.round((beds.filter((b) => !b.isAvailable).length / beds.length) * 100);
  }

  private noShowRate() {
    const a = this.store.appointments();
    if (!a.length) return 0;
    return Math.round((a.filter((x) => x.queueStatus === 'No Show').length / a.length) * 100);
  }

  private insuranceOutstanding() {
    return this.store.invoices()
      .filter((inv) => {
        const p = this.store.patientById(inv.patientId);
        return inv.balance > 0 && !!(p?.insuranceCompanyId || p?.insuranceCompanyName || p?.insuranceProvider);
      })
      .reduce((s, inv) => s + inv.balance, 0);
  }
}
