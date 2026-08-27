import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import type { UserRole } from '../../core/models';

type ReportKey =
  | 'executive'
  | 'patient-registry'
  | 'appointment-queue'
  | 'clinical-activity'
  | 'laboratory'
  | 'pharmacy'
  | 'billing-revenue'
  | 'insurance-claims'
  | 'ward-occupancy'
  | 'staff-access'
  | 'emergency-flow'
  | 'enterprise-operations';

type ReportColumnKey =
  | 'date'
  | 'module'
  | 'record'
  | 'patient'
  | 'mrn'
  | 'department'
  | 'owner'
  | 'type'
  | 'ward'
  | 'payer'
  | 'amount'
  | 'status'
  | 'details';

interface ReportColumn {
  key: ReportColumnKey;
  label: string;
  align?: 'left' | 'right' | 'center';
  wide?: boolean;
}

interface ReportDefinition {
  id: ReportKey;
  title: string;
  subtitle: string;
  icon: string;
  tone: string;
  allowedRoles: UserRole[];
  columns: ReportColumn[];
}

interface ReportRow {
  id: string;
  date: string;
  module: string;
  record: string;
  patient: string;
  mrn: string;
  department: string;
  owner: string;
  type: string;
  ward: string;
  payer: string;
  amount: number;
  status: string;
  details: string;
  sortDate: number;
  searchText: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 animate-fade-in pb-16">
      @if (isDashboardPage()) {
      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-teal-600">Enterprise Reporting</p>
          <h1 class="mt-1 text-2xl font-black tracking-tight text-slate-950 font-display">Reports Center</h1>
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div class="mini-kpi"><span>Patients</span><strong>{{ store.totalPatientsCount() }}</strong></div>
          <div class="mini-kpi"><span>Queue</span><strong>{{ activeQueueCount() }}</strong></div>
          <div class="mini-kpi"><span>Receivable</span><strong>{{ money(store.unpaidInvoicesTotal()) }}</strong></div>
          <div class="mini-kpi"><span>Beds</span><strong>{{ store.bedOccupancyRate() }}%</strong></div>
        </div>
      </div>

      <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          @for (report of visibleReports(); track report.id) {
            <button
              type="button"
              (click)="selectReport(report.id)"
              [class]="activeReport().id === report.id ? 'border-slate-900 bg-white shadow-md ring-2 ring-slate-900/5' : 'border-slate-200 bg-white/70 hover:bg-white hover:shadow-sm'"
              class="group min-h-[118px] rounded-2xl border p-4 text-left transition">
              <div class="flex items-center justify-between gap-3">
                <span [class]="report.tone" class="flex h-9 w-9 items-center justify-center rounded-xl">
                  <span class="material-icons text-lg">{{ report.icon }}</span>
                </span>
                <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500">{{ reportRowsById(report.id).length }}</span>
              </div>
              <h2 class="mt-3 text-[13px] font-black text-slate-950">{{ report.title }}</h2>
              <p class="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-500">{{ report.subtitle }}</p>
            </button>
          }
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 class="text-base font-black text-slate-950">Report Dashboard</h2>
            <p class="text-xs font-semibold text-slate-500">Live reporting indicators from the selected report and system data.</p>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Generated {{ generatedAt() }}</span>
        </div>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div class="metric-card"><span>Filtered Records</span><strong>{{ filteredRows().length }}</strong><small>{{ pageStart() }}-{{ pageEnd() }} visible</small></div>
          <div class="metric-card accent-emerald"><span>Amount</span><strong>{{ money(filteredAmount()) }}</strong><small>Filtered ETB total</small></div>
          <div class="metric-card accent-amber"><span>Open Items</span><strong>{{ openItemCount() }}</strong><small>Pending and active work</small></div>
          <div class="metric-card accent-rose"><span>Priority Items</span><strong>{{ priorityItemCount() }}</strong><small>Emergency and exception rows</small></div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div class="chart-card xl:col-span-2">
            <div class="chart-title"><span>Revenue By Payer</span><strong>{{ money(totalRevenue()) }}</strong></div>
            <div class="mt-4 space-y-3">
              @for (item of payerAmountChart(); track item.label) {
                <div>
                  <div class="mb-1 flex items-center justify-between text-[11px] font-black text-slate-600">
                    <span class="truncate">{{ item.label }}</span>
                    <span>{{ money(item.amount) }}</span>
                  </div>
                  <div class="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-teal-500" [style.width.%]="item.percent"></div>
                  </div>
                </div>
              } @empty {
                <p class="empty-chart">No billing data available.</p>
              }
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-title"><span>Patient Mix</span><strong>{{ store.totalPatientsCount() }}</strong></div>
            <div class="mt-4 space-y-3">
              @for (item of patientStatusChart(); track item.label) {
                <div class="flex items-center gap-3">
                  <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-blue-500" [style.width.%]="item.percent"></div>
                  </div>
                  <div class="w-28 text-right text-[11px] font-black text-slate-600">{{ item.label }} · {{ item.count }}</div>
                </div>
              } @empty {
                <p class="empty-chart">No patient data available.</p>
              }
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-title"><span>Queue By Department</span><strong>{{ activeQueueCount() }}</strong></div>
            <div class="mt-4 space-y-3">
              @for (item of queueDepartmentChart(); track item.label) {
                <div>
                  <div class="mb-1 flex items-center justify-between text-[11px] font-black text-slate-600">
                    <span class="truncate">{{ item.label }}</span>
                    <span>{{ item.count }}</span>
                  </div>
                  <div class="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-amber-500" [style.width.%]="item.percent"></div>
                  </div>
                </div>
              } @empty {
                <p class="empty-chart">No active queue data.</p>
              }
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-title"><span>Ward Occupancy</span><strong>{{ store.bedOccupancyRate() }}%</strong></div>
            <div class="mt-4 space-y-3">
              @for (item of wardOccupancyChart(); track item.label) {
                <div>
                  <div class="mb-1 flex items-center justify-between text-[11px] font-black text-slate-600">
                    <span class="truncate">{{ item.label }}</span>
                    <span>{{ item.occupied }}/{{ item.total }}</span>
                  </div>
                  <div class="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-rose-500" [style.width.%]="item.percent"></div>
                  </div>
                </div>
              } @empty {
                <p class="empty-chart">No bed data available.</p>
              }
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-title"><span>Claim Status</span><strong>{{ store.insuranceClaims().length }}</strong></div>
            <div class="mt-4 space-y-3">
              @for (item of claimStatusChart(); track item.label) {
                <div>
                  <div class="mb-1 flex items-center justify-between text-[11px] font-black text-slate-600">
                    <span>{{ item.label }}</span>
                    <span>{{ item.count }}</span>
                  </div>
                  <div class="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-indigo-500" [style.width.%]="item.percent"></div>
                  </div>
                </div>
              } @empty {
                <p class="empty-chart">No insurance claims prepared.</p>
              }
            </div>
          </div>
        </div>
      </section>
      } @else {
      <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="flex items-center gap-3">
            <span [class]="activeReport().tone" class="flex h-11 w-11 items-center justify-center rounded-2xl">
              <span class="material-icons">{{ activeReport().icon }}</span>
            </span>
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.24em] text-teal-600">Report Generation</p>
              <h1 class="mt-1 text-2xl font-black tracking-tight text-slate-950 font-display">Generate Report</h1>
            </div>
          </div>
          <label class="field w-full xl:w-96">Report Type
            <select [ngModel]="selectedReportId()" (ngModelChange)="selectReport($event)" class="input-control">
              @for (report of visibleReports(); track report.id) {
                <option [ngValue]="report.id">{{ report.title }}</option>
              }
            </select>
          </label>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div class="mini-kpi"><span>Rows</span><strong>{{ filteredRows().length }}</strong></div>
          <div class="mini-kpi"><span>Amount</span><strong>{{ money(filteredAmount()) }}</strong></div>
          <div class="mini-kpi"><span>Open</span><strong>{{ openItemCount() }}</strong></div>
          <div class="mini-kpi"><span>Priority</span><strong>{{ priorityItemCount() }}</strong></div>
        </div>
      </section>
      }

      @if (!isDashboardPage()) {
      <section class="space-y-5">
        <div class="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 p-5">
            <div class="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
              <div>
                <div class="flex items-center gap-3">
                  <span [class]="activeReport().tone" class="flex h-11 w-11 items-center justify-center rounded-2xl">
                    <span class="material-icons">{{ activeReport().icon }}</span>
                  </span>
                  <div>
                    <h2 class="text-lg font-black text-slate-950">{{ activeReport().title }}</h2>
                    <p class="text-xs font-semibold text-slate-500">{{ activeReport().subtitle }}</p>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <button type="button" (click)="exportCsv()" class="report-action">
                  <span class="material-icons text-base">table_view</span> CSV
                </button>
                <button type="button" (click)="exportExcel()" class="report-action">
                  <span class="material-icons text-base">grid_on</span> Excel
                </button>
                <button type="button" (click)="printReport()" class="report-action-primary">
                  <span class="material-icons text-base">print</span> Print / PDF
                </button>
              </div>
            </div>

            <div class="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-6">
              <label class="field lg:col-span-2">Search
                <input [(ngModel)]="searchText" (ngModelChange)="resetPage()" class="input-control" placeholder="Patient, MRN, invoice, doctor, status..." />
              </label>
              <label class="field">From
                <input type="date" [(ngModel)]="dateFrom" (ngModelChange)="resetPage()" class="input-control" />
              </label>
              <label class="field">To
                <input type="date" [(ngModel)]="dateTo" (ngModelChange)="resetPage()" class="input-control" />
              </label>
              <label class="field">Status
                <select [(ngModel)]="statusFilter" (ngModelChange)="resetPage()" class="input-control">
                  <option value="ALL">All Status</option>
                  @for (status of statusOptions(); track status) {
                    <option [value]="status">{{ status }}</option>
                  }
                </select>
              </label>
              <label class="field">Rows
                <select [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)" class="input-control">
                  @for (size of pageSizeOptions; track size) {
                    <option [ngValue]="size">{{ size }}</option>
                  }
                </select>
              </label>
            </div>

            <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-6">
              <label class="field">Department
                <select [(ngModel)]="departmentFilter" (ngModelChange)="resetPage()" class="input-control">
                  <option value="ALL">All Departments</option>
                  @for (item of departmentOptions(); track item) {
                    <option [value]="item">{{ item }}</option>
                  }
                </select>
              </label>
              <label class="field">Doctor / Owner
                <select [(ngModel)]="ownerFilter" (ngModelChange)="resetPage()" class="input-control">
                  <option value="ALL">All Owners</option>
                  @for (item of ownerOptions(); track item) {
                    <option [value]="item">{{ item }}</option>
                  }
                </select>
              </label>
              <label class="field">Payer
                <select [(ngModel)]="payerFilter" (ngModelChange)="resetPage()" class="input-control">
                  <option value="ALL">All Payers</option>
                  @for (item of payerOptions(); track item) {
                    <option [value]="item">{{ item }}</option>
                  }
                </select>
              </label>
              <label class="field">Ward
                <select [(ngModel)]="wardFilter" (ngModelChange)="resetPage()" class="input-control">
                  <option value="ALL">All Wards</option>
                  @for (item of wardOptions(); track item) {
                    <option [value]="item">{{ item }}</option>
                  }
                </select>
              </label>
              <label class="field">Min ETB
                <input type="number" [(ngModel)]="amountMin" (ngModelChange)="resetPage()" class="input-control" placeholder="0" />
              </label>
              <label class="field">Max ETB
                <input type="number" [(ngModel)]="amountMax" (ngModelChange)="resetPage()" class="input-control" placeholder="Any" />
              </label>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span class="rounded-full bg-slate-100 px-3 py-1">Generated {{ generatedAt() }}</span>
                <span class="rounded-full bg-teal-50 px-3 py-1 text-teal-700">Role {{ store.currentUser()?.role || 'User' }}</span>
                <span class="rounded-full bg-blue-50 px-3 py-1 text-blue-700">All amounts ETB</span>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" (click)="generateReport()" class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-700">
                  Generate Report
                </button>
                <button type="button" (click)="clearFilters()" class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50">
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-xs">
              <thead class="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  @for (column of activeReport().columns; track column.key) {
                    <th [class]="column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'" class="px-4 py-3">
                      {{ column.label }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (row of pagedRows(); track row.id) {
                  <tr class="hover:bg-slate-50/80">
                    @for (column of activeReport().columns; track column.key) {
                      <td [class]="cellClass(column, row)" class="px-4 py-3 align-top">
                        @if (column.key === 'status') {
                          <span [class]="statusClass(row.status)" class="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase">{{ row.status || 'N/A' }}</span>
                        } @else if (column.key === 'amount') {
                          <span class="font-mono font-black text-slate-900">{{ row.amount ? money(row.amount) : '-' }}</span>
                        } @else if (column.key === 'details') {
                          <span class="block max-w-xl whitespace-pre-line text-[11px] font-semibold leading-5 text-slate-500">{{ row.details || '-' }}</span>
                        } @else if (column.key === 'record') {
                          <span class="font-mono font-black text-slate-900">{{ cellValue(row, column.key) }}</span>
                        } @else if (column.key === 'patient') {
                          <span class="font-black text-slate-900">{{ cellValue(row, column.key) || '-' }}</span>
                        } @else {
                          {{ cellValue(row, column.key) || '-' }}
                        }
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="activeReport().columns.length" class="px-5 py-16 text-center">
                      <span class="material-icons text-5xl text-slate-200">manage_search</span>
                      <p class="mt-3 text-sm font-black text-slate-400">No report rows match the selected filters.</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="flex flex-col gap-4 border-t border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <p class="text-[11px] font-semibold text-slate-500">
              Showing <span class="font-black text-slate-900">{{ pageStart() }}</span>-<span class="font-black text-slate-900">{{ pageEnd() }}</span>
              of <span class="font-black text-slate-900">{{ filteredRows().length }}</span> records
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" (click)="prevPage()" [disabled]="currentPage() === 1" class="pager-button">
                <span class="material-icons text-base">chevron_left</span>
              </button>
              @for (item of pageItems(); track $index) {
                @if (item === '...') {
                  <span class="px-1 text-xs font-black text-slate-300">...</span>
                } @else {
                  <button type="button" (click)="goToPage(item)" [class]="item === currentPage() ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'" class="h-8 min-w-8 rounded-xl px-2 text-[11px] font-black transition">
                    {{ item }}
                  </button>
                }
              }
              <button type="button" (click)="nextPage()" [disabled]="currentPage() === totalPages()" class="pager-button">
                <span class="material-icons text-base">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <aside class="space-y-5">
          <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 class="text-sm font-black text-slate-950">Status Mix</h3>
            <div class="mt-4 space-y-3">
              @for (item of statusBreakdown(); track item.label) {
                <div>
                  <div class="mb-1 flex items-center justify-between text-[11px] font-black text-slate-600">
                    <span>{{ item.label }}</span>
                    <span>{{ item.count }}</span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-teal-500" [style.width.%]="item.percent"></div>
                  </div>
                </div>
              } @empty {
                <p class="rounded-2xl bg-slate-50 p-5 text-center text-xs font-bold text-slate-400">No status data.</p>
              }
            </div>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 class="text-sm font-black text-slate-950">Department Load</h3>
            <div class="mt-4 space-y-3">
              @for (item of departmentBreakdown(); track item.label) {
                <div>
                  <div class="mb-1 flex items-center justify-between text-[11px] font-black text-slate-600">
                    <span class="truncate">{{ item.label }}</span>
                    <span>{{ item.count }}</span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-blue-500" [style.width.%]="item.percent"></div>
                  </div>
                </div>
              } @empty {
                <p class="rounded-2xl bg-slate-50 p-5 text-center text-xs font-bold text-slate-400">No department data.</p>
              }
            </div>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 class="text-sm font-black text-slate-950">Report Controls</h3>
            <div class="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div class="rounded-2xl bg-slate-50 p-4">
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">Pages</div>
                <div class="mt-1 text-lg font-black text-slate-900">{{ totalPages() }}</div>
              </div>
              <div class="rounded-2xl bg-slate-50 p-4">
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">Export</div>
                <div class="mt-1 text-lg font-black text-slate-900">CSV/XLS</div>
              </div>
            </div>
          </div>
        </aside>
      </section>
      }
    </div>
  `,
  styles: [`
    .mini-kpi {
      min-width: 7.5rem;
      border-radius: 1rem;
      border: 1px solid rgb(226 232 240);
      background: rgb(248 250 252);
      padding: .65rem .8rem;
    }
    .mini-kpi span,
    .metric-card span {
      display: block;
      font-size: .6rem;
      font-weight: 900;
      color: rgb(100 116 139);
      text-transform: uppercase;
      letter-spacing: .09em;
    }
    .mini-kpi strong {
      display: block;
      margin-top: .1rem;
      font-size: .95rem;
      font-weight: 900;
      color: rgb(15 23 42);
      white-space: nowrap;
    }
    .metric-card,
    .chart-card {
      border-radius: 1.25rem;
      border: 1px solid rgb(226 232 240);
      background: #fff;
      padding: 1rem;
      box-shadow: 0 1px 2px rgba(15, 23, 42, .04);
    }
    .metric-card strong {
      display: block;
      margin-top: .15rem;
      font-size: 1.45rem;
      font-weight: 900;
      color: rgb(15 23 42);
      line-height: 1.1;
    }
    .metric-card small {
      margin-top: .35rem;
      display: block;
      font-size: .68rem;
      font-weight: 800;
      color: rgb(100 116 139);
    }
    .metric-card.accent-emerald strong,
    .metric-card.accent-emerald small { color: rgb(4 120 87); }
    .metric-card.accent-amber strong,
    .metric-card.accent-amber small { color: rgb(180 83 9); }
    .metric-card.accent-rose strong,
    .metric-card.accent-rose small { color: rgb(225 29 72); }
    .chart-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
      font-size: .8rem;
      font-weight: 900;
      color: rgb(15 23 42);
    }
    .chart-title strong {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      color: rgb(51 65 85);
      white-space: nowrap;
    }
    .empty-chart {
      border-radius: 1rem;
      background: rgb(248 250 252);
      padding: 1.25rem;
      text-align: center;
      font-size: .75rem;
      font-weight: 800;
      color: rgb(148 163 184);
    }
    .field {
      display: grid;
      gap: .375rem;
      font-size: .625rem;
      font-weight: 900;
      color: rgb(71 85 105);
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .input-control {
      width: 100%;
      border-radius: .875rem;
      border: 1px solid rgb(226 232 240);
      background: rgb(248 250 252);
      padding: .7rem .85rem;
      font-size: .75rem;
      font-weight: 700;
      color: rgb(30 41 59);
      outline: none;
      transition: all .18s ease;
    }
    .input-control:focus {
      border-color: rgb(20 184 166);
      background: #fff;
      box-shadow: 0 0 0 4px rgba(20, 184, 166, .08);
    }
    .report-action,
    .report-action-primary,
    .pager-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: .4rem;
      border-radius: .875rem;
      font-size: .75rem;
      font-weight: 900;
      transition: all .18s ease;
    }
    .report-action {
      border: 1px solid rgb(226 232 240);
      background: #fff;
      color: rgb(51 65 85);
      padding: .65rem .9rem;
    }
    .report-action:hover { background: rgb(248 250 252); }
    .report-action-primary {
      background: rgb(15 23 42);
      color: #fff;
      padding: .65rem .95rem;
      box-shadow: 0 12px 25px rgba(15, 23, 42, .16);
    }
    .pager-button {
      width: 2rem;
      height: 2rem;
      border: 1px solid rgb(226 232 240);
      color: rgb(71 85 105);
      background: #fff;
    }
    .pager-button:hover { background: rgb(248 250 252); }
    .pager-button:disabled { opacity: .4; cursor: not-allowed; }
  `]
})
export class ReportsComponent {
  readonly store = inject(StoreService);
  private readonly route = inject(ActivatedRoute);

  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly selectedReportId = signal<ReportKey>('executive');
  readonly pageSize = signal(10);
  readonly currentPage = signal(1);
  readonly generatedAtLabel = signal(new Date().toLocaleString());
  readonly isDashboardPage = signal(false);

  searchText = '';
  dateFrom = '';
  dateTo = '';
  statusFilter = 'ALL';
  departmentFilter = 'ALL';
  ownerFilter = 'ALL';
  payerFilter = 'ALL';
  wardFilter = 'ALL';
  amountMin: number | null = null;
  amountMax: number | null = null;

  readonly reportDefinitions: ReportDefinition[] = [
    {
      id: 'executive',
      title: 'Executive Summary',
      subtitle: 'Hospital-wide activity, revenue, queue, claims, and operational movement.',
      icon: 'monitoring',
      tone: 'bg-slate-900 text-white',
      allowedRoles: ['ADMIN', 'HR_MANAGER', 'ACCOUNTANT'],
      columns: this.columns(['date', 'module', 'record', 'patient', 'department', 'owner', 'amount', 'status', 'details']),
    },
    {
      id: 'patient-registry',
      title: 'Patient Registry',
      subtitle: 'Demographics, insurance, registration status, and clinical ownership.',
      icon: 'groups',
      tone: 'bg-blue-50 text-blue-700',
      allowedRoles: ['ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR'],
      columns: this.columns(['date', 'record', 'patient', 'mrn', 'type', 'payer', 'status', 'details']),
    },
    {
      id: 'appointment-queue',
      title: 'Appointment and Queue',
      subtitle: 'Doctor assignment, emergency priority, queue status, and waiting load.',
      icon: 'event_available',
      tone: 'bg-amber-50 text-amber-700',
      allowedRoles: ['ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR'],
      columns: this.columns(['date', 'record', 'patient', 'mrn', 'department', 'owner', 'type', 'status', 'details']),
    },
    {
      id: 'clinical-activity',
      title: 'Clinical Activity',
      subtitle: 'Encounters, diagnosis, vitals, certificates, and referral activity.',
      icon: 'clinical_notes',
      tone: 'bg-cyan-50 text-cyan-700',
      allowedRoles: ['ADMIN', 'DOCTOR', 'NURSE'],
      columns: this.columns(['date', 'module', 'patient', 'mrn', 'owner', 'type', 'status', 'details']),
    },
    {
      id: 'laboratory',
      title: 'Laboratory Report',
      subtitle: 'Lab requests, payment clearance, sample status, result readiness, and abnormal flags.',
      icon: 'biotech',
      tone: 'bg-purple-50 text-purple-700',
      allowedRoles: ['ADMIN', 'LAB_TECHNICIAN', 'DOCTOR'],
      columns: this.columns(['date', 'record', 'patient', 'mrn', 'owner', 'type', 'status', 'details']),
    },
    {
      id: 'pharmacy',
      title: 'Pharmacy Report',
      subtitle: 'Prescription workload, dispensing status, doctor source, and medication summary.',
      icon: 'medication',
      tone: 'bg-emerald-50 text-emerald-700',
      allowedRoles: ['ADMIN', 'PHARMACIST', 'DOCTOR', 'NURSE'],
      columns: this.columns(['date', 'record', 'patient', 'mrn', 'owner', 'status', 'details']),
    },
    {
      id: 'billing-revenue',
      title: 'Billing and Revenue',
      subtitle: 'Invoices, patient payments, unpaid balances, insurer coverage, and receipts queue.',
      icon: 'payments',
      tone: 'bg-teal-50 text-teal-700',
      allowedRoles: ['ADMIN', 'ACCOUNTANT', 'CASHIER'],
      columns: this.columns(['date', 'record', 'patient', 'mrn', 'payer', 'amount', 'status', 'details']),
    },
    {
      id: 'insurance-claims',
      title: 'Insurance Claims',
      subtitle: 'Prepared, submitted, approved, rejected, and paid payer claims.',
      icon: 'verified_user',
      tone: 'bg-indigo-50 text-indigo-700',
      allowedRoles: ['ADMIN', 'ACCOUNTANT', 'CASHIER'],
      columns: this.columns(['date', 'record', 'patient', 'mrn', 'payer', 'amount', 'status', 'details']),
    },
    {
      id: 'ward-occupancy',
      title: 'Ward and Bed Occupancy',
      subtitle: 'Ward profile, bed category, active admissions, discharge charges, and availability.',
      icon: 'king_bed',
      tone: 'bg-rose-50 text-rose-700',
      allowedRoles: ['ADMIN', 'NURSE', 'DOCTOR', 'RECEPTIONIST'],
      columns: this.columns(['date', 'record', 'patient', 'mrn', 'ward', 'type', 'amount', 'status', 'details']),
    },
    {
      id: 'staff-access',
      title: 'Staff and Access',
      subtitle: 'Employee roster, role assignment, department coverage, and account activation.',
      icon: 'admin_panel_settings',
      tone: 'bg-orange-50 text-orange-700',
      allowedRoles: ['ADMIN', 'HR_MANAGER'],
      columns: this.columns(['record', 'patient', 'department', 'owner', 'type', 'status', 'details']),
    },
    {
      id: 'emergency-flow',
      title: 'Emergency Flow',
      subtitle: 'Emergency appointments, triage patients, emergency diagnostics, admissions, and billing handoff.',
      icon: 'emergency',
      tone: 'bg-red-50 text-red-700',
      allowedRoles: ['ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ACCOUNTANT'],
      columns: this.columns(['date', 'module', 'record', 'patient', 'department', 'owner', 'amount', 'status', 'details']),
    },
    {
      id: 'enterprise-operations',
      title: 'Enterprise Operations',
      subtitle: 'Operational records across pharmacy, lab, claims, inventory, documents, and support units.',
      icon: 'business_center',
      tone: 'bg-sky-50 text-sky-700',
      allowedRoles: ['ADMIN'],
      columns: this.columns(['date', 'module', 'record', 'patient', 'department', 'owner', 'amount', 'status', 'details']),
    },
  ];

  readonly visibleReports = computed(() => {
    const role = this.store.currentUser()?.role;
    if (!role) return [];
    return this.reportDefinitions.filter(report => role === 'ADMIN' || report.allowedRoles.includes(role));
  });

  readonly activeReport = computed(() =>
    this.visibleReports().find(report => report.id === this.selectedReportId()) ||
    this.visibleReports()[0] ||
    this.reportDefinitions[0]
  );

  readonly reportRows = computed(() => this.reportRowsById(this.activeReport().id));

  readonly filteredRows = computed(() => {
    const query = this.normalize(this.searchText || this.store.globalSearchQuery());
    const from = this.dateFrom ? new Date(`${this.dateFrom}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const to = this.dateTo ? new Date(`${this.dateTo}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
    const minValue = this.amountMin as number | string | null;
    const maxValue = this.amountMax as number | string | null;
    const min = minValue === null || minValue === undefined || String(minValue) === '' ? null : Number(minValue);
    const max = maxValue === null || maxValue === undefined || String(maxValue) === '' ? null : Number(maxValue);

    return this.reportRows().filter(row => {
      if (query && !row.searchText.includes(query)) return false;
      if (row.sortDate < from || row.sortDate > to) return false;
      if (this.statusFilter !== 'ALL' && row.status !== this.statusFilter) return false;
      if (this.departmentFilter !== 'ALL' && row.department !== this.departmentFilter) return false;
      if (this.ownerFilter !== 'ALL' && row.owner !== this.ownerFilter) return false;
      if (this.payerFilter !== 'ALL' && row.payer !== this.payerFilter) return false;
      if (this.wardFilter !== 'ALL' && row.ward !== this.wardFilter) return false;
      if (min !== null && row.amount < min) return false;
      if (max !== null && row.amount > max) return false;
      return true;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize())));
  readonly pageStart = computed(() => this.filteredRows().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
  readonly pageEnd = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredRows().length));
  readonly pagedRows = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize();
    return this.filteredRows().slice(start, start + this.pageSize());
  });

  readonly pageItems = computed<(number | '...')[]>(() => {
    const total = this.totalPages();
    const current = Math.min(this.currentPage(), total);
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
    const items: (number | '...')[] = [1];
    if (current > 3) items.push('...');
    for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page++) items.push(page);
    if (current < total - 2) items.push('...');
    items.push(total);
    return items;
  });

  readonly statusOptions = computed(() => this.unique(this.reportRows().map(row => row.status).filter(Boolean)));
  readonly departmentOptions = computed(() => this.unique([
    ...this.store.departments().map(item => item.name),
    ...this.store.employees().map(item => item.department || ''),
    ...this.store.doctors().map(item => item.department || ''),
    ...this.reportRows().map(row => row.department),
  ].filter(Boolean)));
  readonly ownerOptions = computed(() => this.unique([
    ...this.store.doctors().flatMap(item => [`Dr. ${item.firstName} ${item.lastName}`, `${item.firstName} ${item.lastName}`]),
    ...this.store.employees().map(item => `${item.firstName} ${item.lastName}`),
    ...this.reportRows().map(row => row.owner),
  ].filter(Boolean)));
  readonly payerOptions = computed(() => this.unique([
    ...this.store.insuranceCompanies().map(item => item.name),
    ...this.reportRows().map(row => row.payer),
    'Self Pay',
  ].filter(Boolean)));
  readonly wardOptions = computed(() => this.unique([
    ...this.store.wardConfigs().map(item => item.name),
    ...this.store.beds().map(item => item.wardName),
    ...this.reportRows().map(row => row.ward),
  ].filter(Boolean)));

  readonly filteredAmount = computed(() => this.filteredRows().reduce((sum, row) => sum + row.amount, 0));
  readonly openItemCount = computed(() => this.filteredRows().filter(row => this.isOpenStatus(row.status)).length);
  readonly priorityItemCount = computed(() => this.filteredRows().filter(row => this.isPriorityRow(row)).length);
  readonly activeQueueCount = computed(() => this.store.appointments().filter(item => item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS').length);

  readonly statusBreakdown = computed(() => this.breakdown(this.filteredRows().map(row => row.status || 'N/A')));
  readonly departmentBreakdown = computed(() => this.breakdown(this.filteredRows().map(row => row.department || row.module || 'General')));
  readonly totalRevenue = computed(() => this.store.billingInvoices().reduce((sum, invoice) => sum + invoice.totalAmount, 0));
  readonly payerAmountChart = computed(() => {
    const groups = new Map<string, number>();
    for (const invoice of this.store.billingInvoices()) {
      const payer = invoice.insuranceProvider || 'Self Pay';
      groups.set(payer, (groups.get(payer) || 0) + invoice.totalAmount);
    }
    const max = Math.max(1, ...groups.values());
    return Array.from(groups.entries())
      .map(([label, amount]) => ({ label, amount, percent: Math.max(6, Math.round((amount / max) * 100)) }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 6);
  });
  readonly patientStatusChart = computed(() => this.countChart(this.store.patients().map(patient => patient.status)));
  readonly queueDepartmentChart = computed(() => this.countChart(
    this.store.appointments()
      .filter(appointment => appointment.status === 'SCHEDULED' || appointment.status === 'IN_PROGRESS')
      .map(appointment => appointment.department || 'General')
  ));
  readonly claimStatusChart = computed(() => this.countChart(this.store.insuranceClaims().map(claim => claim.status)));
  readonly wardOccupancyChart = computed(() => {
    const groups = new Map<string, { label: string; total: number; occupied: number; percent: number }>();
    for (const bed of this.store.beds()) {
      const current = groups.get(bed.wardName) || { label: bed.wardName, total: 0, occupied: 0, percent: 0 };
      current.total += 1;
      current.occupied += bed.isOccupied ? 1 : 0;
      groups.set(bed.wardName, current);
    }
    return Array.from(groups.values())
      .map(item => ({ ...item, percent: item.total ? Math.round((item.occupied / item.total) * 100) : 0 }))
      .sort((left, right) => right.percent - left.percent || left.label.localeCompare(right.label))
      .slice(0, 6);
  });

  constructor() {
    this.isDashboardPage.set(this.route.snapshot.data?.['mode'] === 'dashboard');
    const type = this.route.snapshot.queryParamMap.get('type') as ReportKey | null;
    if (type && this.reportDefinitions.some(report => report.id === type)) {
      this.selectedReportId.set(type);
    }
  }

  selectReport(reportId: ReportKey) {
    this.selectedReportId.set(reportId);
    this.clearFilters(false);
  }

  reportRowsById(reportId: ReportKey): ReportRow[] {
    const rows = this.buildRows(reportId);
    return rows
      .map(row => ({ ...row, searchText: this.rowSearchText(row) }))
      .sort((left, right) => right.sortDate - left.sortDate || left.record.localeCompare(right.record));
  }

  goToPage(page: number) {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  prevPage() {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage() {
    this.goToPage(this.currentPage() + 1);
  }

  changePageSize(size: number) {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  resetPage() {
    this.currentPage.set(1);
  }

  clearFilters(showToast = true) {
    this.searchText = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.statusFilter = 'ALL';
    this.departmentFilter = 'ALL';
    this.ownerFilter = 'ALL';
    this.payerFilter = 'ALL';
    this.wardFilter = 'ALL';
    this.amountMin = null;
    this.amountMax = null;
    this.currentPage.set(1);
    if (showToast) this.store.addToast('info', 'Filters Cleared', 'The report filter panel has been reset.');
  }

  generateReport(showToast = true) {
    this.generatedAtLabel.set(new Date().toLocaleString());
    this.currentPage.set(1);
    if (showToast) {
      this.store.addToast('success', 'Report Generated', `${this.activeReport().title} prepared with ${this.filteredRows().length} filtered rows.`);
    }
  }

  exportCsv() {
    this.generateReport(false);
    const report = this.activeReport();
    const csv = this.csvFor(report.columns, this.filteredRows());
    this.downloadFile(`${report.id}-${this.todayStamp()}.csv`, csv, 'text/csv;charset=utf-8;');
    this.store.addToast('success', 'CSV Exported', `${report.title} exported with ${this.filteredRows().length} rows.`);
  }

  exportExcel() {
    this.generateReport(false);
    const report = this.activeReport();
    const html = this.excelHtml(report.title, report.columns, this.filteredRows());
    this.downloadFile(`${report.id}-${this.todayStamp()}.xls`, html, 'application/vnd.ms-excel;charset=utf-8;');
    this.store.addToast('success', 'Excel Exported', `${report.title} exported as an Excel-compatible file.`);
  }

  printReport() {
    this.generateReport(false);
    const popup = window.open('', '_blank', 'width=1200,height=850');
    if (!popup) return;
    const report = this.activeReport();
    popup.document.write(this.printHtml(report.title, report.columns, this.filteredRows()));
    popup.document.close();
    popup.focus();
    popup.print();
  }

  cellValue(row: ReportRow, key: ReportColumnKey): string {
    if (key === 'amount') return row.amount ? this.money(row.amount) : '';
    return String(row[key] ?? '');
  }

  cellClass(column: ReportColumn, row: ReportRow): string {
    const align = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
    const width = column.wide ? ' min-w-[260px]' : '';
    const tone = column.key === 'status' ? '' : column.key === 'amount' ? ' font-mono' : ' text-slate-700';
    return `${align}${width}${tone}`;
  }

  statusClass(status: string): string {
    const value = this.normalize(status);
    if (value.includes('paid') || value.includes('completed') || value.includes('active') || value.includes('dispensed') || value.includes('available') || value.includes('approved')) {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    if (value.includes('emergency') || value.includes('critical') || value.includes('rejected') || value.includes('unpaid')) {
      return 'border-rose-200 bg-rose-50 text-rose-700';
    }
    if (value.includes('pending') || value.includes('waiting') || value.includes('prepared') || value.includes('analysis') || value.includes('admitted')) {
      return 'border-amber-200 bg-amber-50 text-amber-700';
    }
    return 'border-slate-200 bg-slate-50 text-slate-600';
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(value || 0);
  }

  generatedAt(): string {
    return this.generatedAtLabel();
  }

  private buildRows(reportId: ReportKey): ReportRow[] {
    switch (reportId) {
      case 'patient-registry': return this.patientRows();
      case 'appointment-queue': return this.appointmentRows();
      case 'clinical-activity': return this.clinicalRows();
      case 'laboratory': return this.labRows();
      case 'pharmacy': return this.pharmacyRows();
      case 'billing-revenue': return this.billingRows();
      case 'insurance-claims': return this.claimRows();
      case 'ward-occupancy': return this.wardRows();
      case 'staff-access': return this.staffRows();
      case 'emergency-flow': return this.emergencyRows();
      case 'enterprise-operations': return this.enterpriseRows();
      default: return [
        ...this.appointmentRows(),
        ...this.clinicalRows(),
        ...this.labRows(),
        ...this.billingRows(),
        ...this.claimRows(),
        ...this.wardRows(),
        ...this.enterpriseRows(),
      ];
    }
  }

  private patientRows(): ReportRow[] {
    return this.store.roleVisiblePatients().map(patient => this.row({
      id: `patient-${patient.id}`,
      date: patient.registeredDate,
      module: 'Patient Management',
      record: patient.mrn,
      patient: patient.name,
      mrn: patient.mrn,
      department: patient.assignedWard || 'Outpatient',
      owner: patient.assignedDoctorName || 'Front Desk',
      type: patient.insuranceMemberType || 'Self Pay',
      ward: patient.assignedWard || '',
      payer: patient.insuranceCompanyName || patient.insuranceProvider || 'Self Pay',
      amount: 0,
      status: patient.status,
      details: `${patient.gender}, blood ${patient.bloodType || 'N/A'}, phone ${patient.phone || 'N/A'}${patient.principalMemberName ? `, principal member ${patient.principalMemberName}` : ''}`,
    }));
  }

  private appointmentRows(): ReportRow[] {
    return this.store.appointments().map(appointment => this.row({
      id: `appointment-${appointment.id}`,
      date: appointment.dateTime,
      module: 'Appointments',
      record: `Q-${appointment.queueNumber || 'N/A'}`,
      patient: appointment.patientName,
      mrn: appointment.patientMrn,
      department: appointment.department,
      owner: appointment.doctorName,
      type: appointment.type,
      ward: '',
      payer: '',
      amount: 0,
      status: appointment.status,
      details: `${appointment.reason || 'Consultation'}${appointment.waitingAhead ? `, ${appointment.waitingAhead} waiting ahead` : ''}`,
    }));
  }

  private clinicalRows(): ReportRow[] {
    const encounters = this.store.medicalRecords().map(record => this.row({
      id: `encounter-${record.id}`,
      date: record.date,
      module: 'Encounter',
      record: record.id,
      patient: record.patientName,
      mrn: this.store.patientMrn(record.patientId),
      department: this.doctorDepartment(record.doctorId),
      owner: record.doctorName,
      type: 'Encounter',
      ward: '',
      payer: '',
      amount: 0,
      status: 'Completed',
      details: `${record.diagnosis || 'Assessment recorded'}\n${record.clinicalNotes || ''}`,
    }));
    const diagnoses = this.store.clinicalDiagnoses().map(diagnosis => this.row({
      id: `diagnosis-${diagnosis.id}`,
      date: diagnosis.diagnosedAtUtc,
      module: 'Diagnosis',
      record: diagnosis.code,
      patient: diagnosis.patientName,
      mrn: diagnosis.patientMrn,
      department: this.doctorDepartment(diagnosis.doctorId),
      owner: diagnosis.doctorName,
      type: diagnosis.severity,
      ward: '',
      payer: '',
      amount: 0,
      status: diagnosis.severity,
      details: diagnosis.description,
    }));
    const vitals = this.store.clinicalVitals().map(vital => this.row({
      id: `vital-${vital.id}`,
      date: vital.recordedAtUtc,
      module: 'Vitals',
      record: vital.id,
      patient: vital.patientName,
      mrn: vital.patientMrn,
      department: 'Nursing',
      owner: 'Nurse',
      type: 'Vitals',
      ward: '',
      payer: '',
      amount: 0,
      status: 'Recorded',
      details: `BP ${vital.bloodPressure}, pulse ${vital.pulse}, RR ${vital.respiratoryRate}, temp ${vital.temperatureC} C`,
    }));
    const certificates = this.store.medicalCertificates().map(certificate => this.row({
      id: `certificate-${certificate.id}`,
      date: certificate.approvedAt,
      module: 'Certificate',
      record: certificate.id,
      patient: certificate.patientName,
      mrn: certificate.patientMrn,
      department: this.doctorDepartment(certificate.doctorId),
      owner: certificate.doctorName,
      type: 'Medical Certificate',
      ward: '',
      payer: '',
      amount: 0,
      status: 'Approved',
      details: `${certificate.reason}\n${certificate.fitnessStatus}`,
    }));
    const referrals = this.store.referralRecords().map(referral => this.row({
      id: `referral-${referral.id}`,
      date: referral.createdAt,
      module: 'Referral',
      record: referral.id,
      patient: referral.patientName,
      mrn: referral.patientMrn,
      department: referral.department,
      owner: referral.approvedByName,
      type: referral.urgency,
      ward: '',
      payer: '',
      amount: 0,
      status: 'Approved',
      details: `To ${referral.facilityName}. ${referral.reason}`,
    }));
    return [...encounters, ...diagnoses, ...vitals, ...certificates, ...referrals];
  }

  private labRows(): ReportRow[] {
    return this.store.labOrders().map(lab => this.row({
      id: `lab-${lab.id}`,
      date: lab.orderedDate,
      module: 'Laboratory',
      record: lab.id,
      patient: lab.patientName,
      mrn: lab.patientMrn,
      department: lab.category || 'Laboratory',
      owner: lab.doctorName,
      type: lab.priority || 'Routine',
      ward: '',
      payer: '',
      amount: 0,
      status: lab.status,
      details: `${lab.testName}${lab.result ? `\nResult: ${lab.result}` : ''}${lab.resultFlag ? `\nFlag: ${lab.resultFlag}` : ''}`,
    }));
  }

  private pharmacyRows(): ReportRow[] {
    return this.store.prescriptions().map(prescription => this.row({
      id: `rx-${prescription.id}`,
      date: prescription.date,
      module: 'Pharmacy',
      record: prescription.id,
      patient: prescription.patientName,
      mrn: prescription.patientMrn,
      department: 'Pharmacy',
      owner: prescription.doctorName,
      type: 'Prescription',
      ward: '',
      payer: '',
      amount: 0,
      status: prescription.status,
      details: prescription.medications.map(med => `${med.name} ${med.dosage} ${med.frequency} ${med.duration}`).join('\n'),
    }));
  }

  private billingRows(): ReportRow[] {
    return this.store.billingInvoices().map(invoice => this.row({
      id: `invoice-${invoice.id}`,
      date: invoice.date,
      module: 'Billing',
      record: invoice.invoiceNumber,
      patient: invoice.patientName || this.store.patientDisplayName(invoice.patientId),
      mrn: invoice.patientMrn || this.store.patientMrn(invoice.patientId),
      department: this.invoiceDepartment(invoice),
      owner: invoice.paymentMethod || 'Billing Desk',
      type: invoice.paymentType || 'CASH',
      ward: this.invoiceWard(invoice),
      payer: invoice.insuranceProvider || 'Self Pay',
      amount: invoice.totalAmount,
      status: invoice.status,
      details: `Patient paid ${this.money(invoice.patientPaidAmount)}, insurance covered ${this.money(invoice.insuranceCoveredAmount)}, balance ${this.money(Math.max(0, invoice.totalAmount - invoice.patientPaidAmount - invoice.insuranceCoveredAmount))}`,
    }));
  }

  private claimRows(): ReportRow[] {
    return this.store.insuranceClaims().map(claim => this.row({
      id: `claim-${claim.id}`,
      date: claim.submittedDate,
      module: 'Insurance Claims',
      record: claim.claimNumber,
      patient: claim.patientName,
      mrn: claim.patientMrn,
      department: 'Finance',
      owner: 'Accountant',
      type: 'Claim',
      ward: '',
      payer: claim.provider,
      amount: claim.claimAmount,
      status: claim.status,
      details: `Policy ${claim.policyNumber}. Approved ${this.money(claim.approvedAmount || 0)}. ${claim.notes || ''}`,
    }));
  }

  private wardRows(): ReportRow[] {
    const bedRows = this.store.beds().map(bed => this.row({
      id: `bed-${bed.id}`,
      date: bed.admittedAtUtc || new Date().toISOString(),
      module: 'Bed Board',
      record: bed.bedNumber,
      patient: bed.patientName || '',
      mrn: bed.patientMrn || '',
      department: bed.wardName,
      owner: bed.patientName ? 'Ward Team' : 'Bed Control',
      type: bed.category,
      ward: bed.wardName,
      payer: '',
      amount: bed.isOccupied ? bed.dailyRate : 0,
      status: bed.isOccupied ? 'Occupied' : 'Available',
      details: `${bed.roomNumber}, ${bed.currency} ${bed.dailyRate.toLocaleString()} daily rate`,
    }));
    const admissionRows = this.store.bedAdmissions().map(admission => this.row({
      id: `admission-${admission.id}`,
      date: admission.dischargedAtUtc || admission.admittedAtUtc,
      module: 'Admission',
      record: admission.bedNumber,
      patient: admission.patientName,
      mrn: admission.patientMrn,
      department: admission.wardName,
      owner: 'Ward Team',
      type: admission.bedCategory,
      ward: admission.wardName,
      payer: '',
      amount: admission.bedCharge,
      status: admission.status,
      details: `${admission.chargeableDays || 0} chargeable day(s), daily rate ${admission.currency} ${admission.dailyRate.toLocaleString()}`,
    }));
    return [...bedRows, ...admissionRows];
  }

  private staffRows(): ReportRow[] {
    return this.store.employees().map(employee => this.row({
      id: `staff-${employee.id}`,
      date: employee.invitationSentAtUtc || new Date().toISOString(),
      module: 'Identity',
      record: employee.employeeNo,
      patient: `${employee.firstName} ${employee.lastName}`,
      mrn: employee.emailAddress,
      department: employee.department || 'General',
      owner: employee.role,
      type: employee.specialization || employee.permission || 'General',
      ward: '',
      payer: '',
      amount: 0,
      status: employee.isActive ? (employee.passwordSetupCompleted ? 'Active' : 'Pending Setup') : 'Inactive',
      details: `${employee.phone || 'No phone'} - permission ${employee.permission || 'Default'}`,
    }));
  }

  private emergencyRows(): ReportRow[] {
    const appointments = this.appointmentRows().filter(row => this.normalize(row.type + row.details).includes('emergency'));
    const labs = this.labRows().filter(row => this.normalize(row.type + row.details).includes('emergency') || this.normalize(row.type).includes('critical'));
    const patients = this.patientRows().filter(row => this.normalize(row.status + row.details).includes('triage') || this.normalize(row.details).includes('accident'));
    const admissions = this.wardRows().filter(row => this.normalize(row.details + row.status).includes('emergency') || this.normalize(row.department).includes('emergency'));
    const emergencyBilling = this.billingRows().filter(row => this.normalize(row.details + row.department).includes('emergency'));
    return [...appointments, ...labs, ...patients, ...admissions, ...emergencyBilling];
  }

  private enterpriseRows(): ReportRow[] {
    return this.store.enterpriseRecords().map(record => this.row({
      id: `enterprise-${record.id}`,
      date: record.updatedAtUtc || record.createdAtUtc,
      module: record.area,
      record: record.recordNumber,
      patient: record.patientId ? this.store.patientDisplayName(record.patientId) : '',
      mrn: record.patientId ? this.store.patientMrn(record.patientId) : '',
      department: record.department,
      owner: record.owner,
      type: record.priority,
      ward: '',
      payer: '',
      amount: record.amount || 0,
      status: record.status,
      details: `${record.title}\n${record.details || ''}`,
    }));
  }

  private row(input: Omit<ReportRow, 'sortDate' | 'searchText'>): ReportRow {
    return {
      ...input,
      date: this.formatDate(input.date),
      sortDate: this.timestamp(input.date),
      searchText: '',
    };
  }

  private columns(keys: ReportColumnKey[]): ReportColumn[] {
    const labels: Record<ReportColumnKey, string> = {
      date: 'Date',
      module: 'Module',
      record: 'Record',
      patient: 'Patient / Staff',
      mrn: 'MRN / Email',
      department: 'Department',
      owner: 'Owner',
      type: 'Type',
      ward: 'Ward',
      payer: 'Payer',
      amount: 'Amount',
      status: 'Status',
      details: 'Details',
    };
    return keys.map(key => ({
      key,
      label: labels[key],
      align: key === 'amount' ? 'right' : key === 'status' ? 'center' : 'left',
      wide: key === 'details',
    }));
  }

  private invoiceDepartment(invoice: { items: { category?: string; description: string }[] }): string {
    return invoice.items[0]?.category || 'Billing';
  }

  private invoiceWard(invoice: { items: { category?: string; description: string }[] }): string {
    const roomCharge = invoice.items.find(item => item.category === 'Room Charge');
    if (!roomCharge) return '';
    return roomCharge.description.split(' bed ')[0] || '';
  }

  private doctorDepartment(doctorId: string): string {
    const employee = this.store.employees().find(item => item.id === doctorId);
    return employee?.department || 'Clinical';
  }

  private unique(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
  }

  private breakdown(values: string[]): { label: string; count: number; percent: number }[] {
    const counts = new Map<string, number>();
    for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
    const max = Math.max(1, ...counts.values());
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count, percent: Math.max(8, Math.round((count / max) * 100)) }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
      .slice(0, 8);
  }

  private countChart(values: string[]): { label: string; count: number; percent: number }[] {
    const counts = new Map<string, number>();
    for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
    const total = Math.max(1, Array.from(counts.values()).reduce((sum, count) => sum + count, 0));
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count, percent: Math.max(6, Math.round((count / total) * 100)) }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
      .slice(0, 6);
  }

  private isOpenStatus(status: string): boolean {
    const value = this.normalize(status);
    return ['pending', 'waiting', 'unpaid', 'partial', 'prepared', 'submitted', 'analysis', 'ordered', 'admitted', 'occupied', 'progress'].some(token => value.includes(token));
  }

  private isPriorityRow(row: ReportRow): boolean {
    const value = this.normalize(`${row.status} ${row.type} ${row.details}`);
    return ['emergency', 'critical', 'urgent', 'rejected', 'overdue', 'unpaid', 'abnormal'].some(token => value.includes(token));
  }

  private rowSearchText(row: ReportRow): string {
    return this.normalize(Object.values(row).join(' '));
  }

  private normalize(value: unknown): string {
    return String(value || '').trim().toLowerCase();
  }

  private timestamp(value: string): number {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  private formatDate(value: string): string {
    const time = new Date(value);
    if (Number.isNaN(time.getTime())) return value || '';
    return time.toISOString().slice(0, 10);
  }

  private todayStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private csvFor(columns: ReportColumn[], rows: ReportRow[]): string {
    const header = columns.map(column => this.csvCell(column.label)).join(',');
    const body = rows.map(row => columns.map(column => this.csvCell(this.cellValue(row, column.key))).join(',')).join('\n');
    return [header, body].filter(Boolean).join('\n');
  }

  private csvCell(value: unknown): string {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  private downloadFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private excelHtml(title: string, columns: ReportColumn[], rows: ReportRow[]): string {
    const header = columns.map(column => `<th>${this.escapeHtml(column.label)}</th>`).join('');
    const body = rows.map(row => `<tr>${columns.map(column => `<td>${this.escapeHtml(this.cellValue(row, column.key))}</td>`).join('')}</tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${this.escapeHtml(title)}</title></head><body><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  }

  private printHtml(title: string, columns: ReportColumn[], rows: ReportRow[]): string {
    const header = columns.map(column => `<th>${this.escapeHtml(column.label)}</th>`).join('');
    const body = rows.map(row => `<tr>${columns.map(column => `<td class="${column.key === 'amount' ? 'num' : ''}">${this.escapeHtml(this.cellValue(row, column.key))}</td>`).join('')}</tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${this.escapeHtml(title)}</title><style>
      @page { size: A4 landscape; margin: 14mm; }
      body { font-family: Arial, sans-serif; color: #0f172a; }
      .head { display: flex; justify-content: space-between; border: 2px solid #0f172a; padding: 12px 16px; }
      .head h2 { margin: 0; font-size: 18px; letter-spacing: 1px; }
      .head p { margin: 3px 0 0; font-size: 10px; color: #475569; }
      .doc { text-align: right; font-size: 10px; }
      .title { border: 1px solid #cbd5e1; border-top: 0; padding: 8px 12px; font-size: 11px; display: flex; justify-content: space-between; }
      h1 { text-align: center; margin: 18px 0 12px; font-size: 18px; text-transform: uppercase; }
      .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; font-size: 11px; }
      .meta div { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background: #e2e8f0; color: #334155; text-align: left; padding: 7px; border: 1px solid #cbd5e1; }
      td { padding: 6px; border: 1px solid #dbe4ee; vertical-align: top; white-space: pre-line; }
      .num { text-align: right; font-weight: 700; }
      .footer { margin-top: 20px; display: flex; justify-content: space-between; border-top: 1px solid #0f172a; padding-top: 8px; font-size: 10px; color: #475569; }
    </style></head><body>
      <div class="head"><div><h2>BETHZATHA GENERAL HOSPITAL</h2><p>Addis Ababa, Ethiopia | Tel: +251-115-535980 | info@bethzatha.com</p></div><div class="doc">Document<br><strong>HMS Report</strong></div></div>
      <div class="title"><span><strong>Document Title:</strong> ${this.escapeHtml(title)}</span><span><strong>Printed:</strong> ${this.escapeHtml(new Date().toLocaleString())}</span></div>
      <h1>${this.escapeHtml(title)}</h1>
      <div class="meta"><div><strong>Rows</strong><br>${rows.length}</div><div><strong>Total Amount</strong><br>${this.money(rows.reduce((sum, row) => sum + row.amount, 0))}</div><div><strong>Status Filter</strong><br>${this.escapeHtml(this.statusFilter)}</div><div><strong>Prepared By</strong><br>${this.escapeHtml(this.store.currentUser()?.name || 'HMS User')}</div></div>
      <table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
      <div class="footer"><span>Bethzatha General Hospital</span><span>Generated from HMS Reports Center</span></div>
    </body></html>`;
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
