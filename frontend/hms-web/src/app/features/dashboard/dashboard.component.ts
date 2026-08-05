import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="store.session() as user">
      <!-- Stats Cards -->
      <section
        class="mb-5 grid gap-4"
        [ngClass]="{
          'grid-cols-5 max-[1200px]:grid-cols-3 max-[700px]:grid-cols-1': store.dashboardRoleStats().length === 5,
          'grid-cols-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1': store.dashboardRoleStats().length !== 5
        }"
      >
        <article *ngFor="let stat of store.dashboardRoleStats()" class="enterprise-panel p-5">
          <span class="inline-flex rounded-lg px-3 py-1 text-xs font-black uppercase" [ngClass]="stat.tone">{{ stat.label }}</span>
          <strong class="mt-3 block text-3xl font-black text-slate-900">{{ stat.value }}</strong>
        </article>
      </section>

      <!-- ADMIN Dashboard -->
      <ng-container *ngIf="user.role === 'ADMIN'">
        <section class="enterprise-panel overflow-hidden">
          <div class="grid grid-cols-[1.2fr_.8fr] gap-0 max-[950px]:grid-cols-1">
            <div class="p-7">
              <p class="text-xs font-extrabold uppercase text-brand-600">Command Center</p>
              <h2 class="mt-1 text-2xl font-black text-slate-900">Hospital operations snapshot</h2>
              <div class="mt-5 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
                <button class="btn-primary" type="button" (click)="navigate('patients')">Patient Intake</button>
                <button class="btn-primary" type="button" (click)="navigate('clinical')">Clinical Chart</button>
                <button class="btn-primary" type="button" (click)="navigate('billing')">Billing</button>
                <button class="btn-primary" type="button" (click)="navigate('admin')">Admin</button>
              </div>
            </div>
            <div class="bg-slate-900 p-7 text-white">
              <p class="text-xs font-extrabold uppercase text-slate-300">Revenue Health</p>
              <div class="mt-5 grid gap-4">
                <div *ngFor="let item of store.revenueChart()" class="grid gap-2">
                  <div class="flex justify-between text-sm"><span>{{ item.label }}</span><strong>{{ item.value | currency:'ETB' }}</strong></div>
                  <div class="h-2 rounded-full bg-slate-700"><div class="h-2 rounded-full bg-mint-500" [style.width.%]="item.percent"></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-5 grid grid-cols-2 gap-5 max-[950px]:grid-cols-1">
          <article class="enterprise-panel p-5">
            <h3 class="text-base font-black text-slate-900">Queue Flow</h3>
            <div class="mt-4 grid gap-3">
              <div *ngFor="let item of store.queueChart()" class="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-sm">
                <span class="font-bold text-slate-600">{{ item.label }}</span>
                <div class="h-3 rounded-full bg-slate-100"><div class="h-3 rounded-full bg-cyan-500" [style.width.%]="item.percent"></div></div>
                <strong class="text-right">{{ item.value }}</strong>
              </div>
            </div>
          </article>
          <article class="enterprise-panel p-5">
            <h3 class="text-base font-black text-slate-900">Clinical Workload</h3>
            <div class="mt-4 grid gap-3">
              <div *ngFor="let item of store.clinicalChart()" class="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-sm">
                <span class="font-bold text-slate-600">{{ item.label }}</span>
                <div class="h-3 rounded-full bg-slate-100"><div class="h-3 rounded-full bg-violet-500" [style.width.%]="item.percent"></div></div>
                <strong class="text-right">{{ item.value }}</strong>
              </div>
            </div>
          </article>
        </section>
      </ng-container>

      <!-- DOCTOR Dashboard -->
      <ng-container *ngIf="user.role === 'DOCTOR'">
        <section class="enterprise-panel overflow-hidden">
          <div class="grid grid-cols-[1.2fr_.8fr] gap-0 max-[950px]:grid-cols-1">
            <div class="p-7">
              <p class="text-xs font-extrabold uppercase text-brand-600">Clinical Command Center</p>
              <h2 class="mt-1 text-2xl font-black text-slate-900">Your patient queue and clinical activity</h2>
              <div class="mt-5 grid grid-cols-3 gap-3 max-[600px]:grid-cols-1">
                <button class="btn-primary" type="button" (click)="navigate('appointments')">View Queue</button>
                <button class="btn-primary" type="button" (click)="navigate('clinical')">Clinical Chart</button>
                <button class="btn-primary" type="button" (click)="navigate('patients')">Patient Records</button>
              </div>
            </div>
            <div class="bg-slate-900 p-7 text-white">
              <p class="text-xs font-extrabold uppercase text-slate-300">Queue Flow</p>
              <div class="mt-5 grid gap-4">
                <div *ngFor="let item of store.queueChart()" class="grid gap-2">
                  <div class="flex justify-between text-sm"><span>{{ item.label }}</span><strong class="text-white">{{ item.value }}</strong></div>
                  <div class="h-2 rounded-full bg-slate-700"><div class="h-2 rounded-full bg-cyan-500" [style.width.%]="item.percent"></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-5 grid grid-cols-2 gap-5 max-[950px]:grid-cols-1">
          <article class="enterprise-panel p-5">
            <h3 class="text-base font-black text-slate-900">Clinical Workload</h3>
            <div class="mt-4 grid gap-3">
              <div *ngFor="let item of store.clinicalChart()" class="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-sm">
                <span class="font-bold text-slate-600">{{ item.label }}</span>
                <div class="h-3 rounded-full bg-slate-100"><div class="h-3 rounded-full bg-violet-500" [style.width.%]="item.percent"></div></div>
                <strong class="text-right">{{ item.value }}</strong>
              </div>
            </div>
          </article>
          <article class="enterprise-panel p-5">
            <h3 class="text-base font-black text-slate-900">Doctor Queues</h3>
            <div class="mt-4 grid divide-y divide-slate-100">
              <div *ngFor="let doctor of store.doctors()" class="flex items-center justify-between py-3 text-sm">
                <span class="font-semibold text-slate-700">Dr. {{ doctor.firstName }} {{ doctor.lastName }}</span>
                <span class="badge">{{ store.doctorQueueCount(doctor.id) }} active</span>
              </div>
              <div *ngIf="!store.doctors().length" class="py-3 text-sm text-slate-500">No doctors loaded</div>
            </div>
          </article>
        </section>
      </ng-container>

      <!-- NURSE Dashboard -->
      <ng-container *ngIf="user.role === 'NURSE'">
        <section class="enterprise-panel overflow-hidden">
          <div class="grid grid-cols-[1.2fr_.8fr] gap-0 max-[950px]:grid-cols-1">
            <div class="p-7">
              <p class="text-xs font-extrabold uppercase text-brand-600">Nursing Station</p>
              <h2 class="mt-1 text-2xl font-black text-slate-900">Patient flow and bed management</h2>
              <div class="mt-5 grid grid-cols-3 gap-3 max-[600px]:grid-cols-1">
                <button class="btn-primary" type="button" (click)="navigate('clinical')">Record Vitals</button>
                <button class="btn-primary" type="button" (click)="navigate('appointments')">Queue View</button>
                <button class="btn-primary" type="button" (click)="navigate('patients')">Patient List</button>
              </div>
            </div>
            <div class="bg-slate-900 p-7 text-white">
              <p class="text-xs font-extrabold uppercase text-slate-300">Queue Flow</p>
              <div class="mt-5 grid gap-4">
                <div *ngFor="let item of store.queueChart()" class="grid gap-2">
                  <div class="flex justify-between text-sm"><span>{{ item.label }}</span><strong class="text-white">{{ item.value }}</strong></div>
                  <div class="h-2 rounded-full bg-slate-700"><div class="h-2 rounded-full bg-cyan-500" [style.width.%]="item.percent"></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-5 grid grid-cols-2 gap-5 max-[950px]:grid-cols-1">
          <article class="enterprise-panel p-5">
            <h3 class="text-base font-black text-slate-900">Bed Board</h3>
            <div class="mt-4 grid gap-3">
              <div *ngFor="let bed of store.beds().slice(0, 12)" class="grid grid-cols-[1fr_80px] items-center gap-3 text-sm">
                <span><strong>{{ bed.ward }}</strong> - {{ bed.room }} / {{ bed.bedNumber }}</span>
                <span class="badge text-center" [class.badge-green]="bed.isAvailable">{{ bed.isAvailable ? 'Available' : 'Occupied' }}</span>
              </div>
            </div>
          </article>
          <article class="enterprise-panel p-5">
            <h3 class="text-base font-black text-slate-900">Doctor Queues</h3>
            <div class="mt-4 grid divide-y divide-slate-100">
              <div *ngFor="let doctor of store.doctors()" class="flex items-center justify-between py-3 text-sm">
                <span class="font-semibold text-slate-700">Dr. {{ doctor.firstName }} {{ doctor.lastName }}</span>
                <span class="badge">{{ store.doctorQueueCount(doctor.id) }} active</span>
              </div>
              <div *ngIf="!store.doctors().length" class="py-3 text-sm text-slate-500">No doctors loaded</div>
            </div>
          </article>
        </section>
      </ng-container>

      <!-- RECEPTIONIST Dashboard -->
      <ng-container *ngIf="user.role === 'RECEPTIONIST'">
        <section class="enterprise-panel overflow-hidden">
          <div class="grid grid-cols-[1.2fr_.8fr] gap-0 max-[950px]:grid-cols-1">
            <div class="p-7">
              <p class="text-xs font-extrabold uppercase text-brand-600">Front Desk</p>
              <h2 class="mt-1 text-2xl font-black text-slate-900">Patient intake and queue management</h2>
              <div class="mt-5 grid grid-cols-3 gap-3 max-[600px]:grid-cols-1">
                <button class="btn-primary" type="button" (click)="navigate('patients')">Register Patient</button>
                <button class="btn-primary" type="button" (click)="navigate('appointments')">Book Appointment</button>
                <button class="btn-primary" type="button" (click)="navigate('appointments')">Manage Queue</button>
              </div>
            </div>
            <div class="bg-slate-900 p-7 text-white">
              <p class="text-xs font-extrabold uppercase text-slate-300">Queue Flow</p>
              <div class="mt-5 grid gap-4">
                <div *ngFor="let item of store.queueChart()" class="grid gap-2">
                  <div class="flex justify-between text-sm"><span>{{ item.label }}</span><strong class="text-white">{{ item.value }}</strong></div>
                  <div class="h-2 rounded-full bg-slate-700"><div class="h-2 rounded-full bg-cyan-500" [style.width.%]="item.percent"></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-5 grid grid-cols-2 gap-5 max-[950px]:grid-cols-1">
          <article class="enterprise-panel p-5">
            <h3 class="text-base font-black text-slate-900">Doctor Queues</h3>
            <div class="mt-4 grid divide-y divide-slate-100">
              <div *ngFor="let doctor of store.doctors()" class="flex items-center justify-between py-3 text-sm">
                <span class="font-semibold text-slate-700">Dr. {{ doctor.firstName }} {{ doctor.lastName }}</span>
                <span class="badge">{{ store.doctorQueueCount(doctor.id) }} active</span>
              </div>
              <div *ngIf="!store.doctors().length" class="py-3 text-sm text-slate-500">No doctors loaded</div>
            </div>
          </article>
          <article class="enterprise-panel p-5">
            <h3 class="text-base font-black text-slate-900">Bed Availability</h3>
            <div class="mt-4 grid gap-3">
              <div *ngFor="let bed of store.beds().slice(0, 10)" class="grid grid-cols-[1fr_80px] items-center gap-3 text-sm">
                <span><strong>{{ bed.ward }}</strong> - {{ bed.room }} / {{ bed.bedNumber }}</span>
                <span class="badge text-center" [class.badge-green]="bed.isAvailable">{{ bed.isAvailable ? 'Free' : 'Occupied' }}</span>
              </div>
            </div>
          </article>
        </section>
      </ng-container>

      <!-- PHARMACIST Dashboard -->
      <ng-container *ngIf="user.role === 'PHARMACIST'">
        <section class="enterprise-panel overflow-hidden">
          <div class="grid grid-cols-[1.2fr_.8fr] gap-0 max-[950px]:grid-cols-1">
            <div class="p-7">
              <p class="text-xs font-extrabold uppercase text-brand-600">Pharmacy Desk</p>
              <h2 class="mt-1 text-2xl font-black text-slate-900">Prescription fulfillment and inventory</h2>
              <div class="mt-5 grid grid-cols-2 gap-3">
                <button class="btn-primary" type="button" (click)="navigate('clinical')">View Prescriptions</button>
                <button class="btn-primary" type="button" (click)="navigate('enterprise'); store.enterpriseTab.set('pharmacy')">Pharmacy Records</button>
              </div>
            </div>
            <div class="bg-slate-900 p-7 text-white">
              <p class="text-xs font-extrabold uppercase text-slate-300">Clinical Workload</p>
              <div class="mt-5 grid gap-4">
                <div *ngFor="let item of store.clinicalChart()" class="grid gap-2">
                  <div class="flex justify-between text-sm"><span>{{ item.label }}</span><strong class="text-white">{{ item.value }}</strong></div>
                  <div class="h-2 rounded-full bg-slate-700"><div class="h-2 rounded-full bg-violet-500" [style.width.%]="item.percent"></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-5 enterprise-panel overflow-auto p-4">
          <h3 class="mb-3 text-base font-black text-slate-900">Recent Prescriptions</h3>
          <table class="data-table">
            <thead><tr><th>Patient</th><th>Doctor</th><th>Medication</th><th>Instructions</th><th>Ordered</th></tr></thead>
            <tbody>
              <tr *ngFor="let row of recentPrescriptions()">
                <td>{{ store.patientName(row.patientId) }}</td>
                <td>{{ store.doctorName(row.doctorId) }}</td>
                <td><strong>{{ row.medication }}</strong></td>
                <td>{{ row.instructions }}</td>
                <td>{{ row.orderedAtUtc | date:'short' }}</td>
              </tr>
              <tr *ngIf="!store.prescriptions().length"><td colspan="5" class="text-center text-slate-500">No prescriptions yet</td></tr>
            </tbody>
          </table>
        </section>
      </ng-container>

      <!-- LAB_TECHNICIAN Dashboard -->
      <ng-container *ngIf="user.role === 'LAB_TECHNICIAN'">
        <section class="enterprise-panel overflow-hidden">
          <div class="grid grid-cols-[1.2fr_.8fr] gap-0 max-[950px]:grid-cols-1">
            <div class="p-7">
              <p class="text-xs font-extrabold uppercase text-brand-600">Laboratory Console</p>
              <h2 class="mt-1 text-2xl font-black text-slate-900">Test processing and results</h2>
              <div class="mt-5 grid grid-cols-2 gap-3">
                <button class="btn-primary" type="button" (click)="navigate('clinical')">Lab Requests</button>
                <button class="btn-primary" type="button" (click)="navigate('enterprise'); store.enterpriseTab.set('laboratory')">Lab Records</button>
              </div>
            </div>
            <div class="bg-slate-900 p-7 text-white">
              <p class="text-xs font-extrabold uppercase text-slate-300">Clinical Workload</p>
              <div class="mt-5 grid gap-4">
                <div *ngFor="let item of store.clinicalChart()" class="grid gap-2">
                  <div class="flex justify-between text-sm"><span>{{ item.label }}</span><strong class="text-white">{{ item.value }}</strong></div>
                  <div class="h-2 rounded-full bg-slate-700"><div class="h-2 rounded-full bg-violet-500" [style.width.%]="item.percent"></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-5 enterprise-panel overflow-auto p-4">
          <h3 class="mb-3 text-base font-black text-slate-900">Pending Lab Requests</h3>
          <table class="data-table">
            <thead><tr><th>Patient</th><th>Doctor</th><th>Test</th><th>Status</th><th>Ordered</th></tr></thead>
            <tbody>
              <tr *ngFor="let row of store.labRequests()">
                <td>{{ store.patientName(row.patientId) }}</td>
                <td>{{ store.doctorName(row.doctorId) }}</td>
                <td><strong>{{ row.testName }}</strong></td>
                <td><span class="badge badge-blue">{{ row.status }}</span></td>
                <td>{{ row.orderedAtUtc | date:'short' }}</td>
              </tr>
              <tr *ngIf="!store.labRequests().length"><td colspan="5" class="text-center text-slate-500">No lab requests yet</td></tr>
            </tbody>
          </table>
        </section>
      </ng-container>

      <!-- ACCOUNTANT Dashboard -->
      <ng-container *ngIf="user.role === 'ACCOUNTANT'">
        <section class="enterprise-panel overflow-hidden">
          <div class="grid grid-cols-[1.2fr_.8fr] gap-0 max-[950px]:grid-cols-1">
            <div class="p-7">
              <p class="text-xs font-extrabold uppercase text-brand-600">Finance Console</p>
              <h2 class="mt-1 text-2xl font-black text-slate-900">Revenue, claims, and financial oversight</h2>
              <div class="mt-5 grid grid-cols-2 gap-3">
                <button class="btn-primary" type="button" (click)="navigate('billing')">Invoices</button>
                <button class="btn-primary" type="button" (click)="navigate('enterprise'); store.enterpriseTab.set('claims')">Insurance Claims</button>
              </div>
            </div>
            <div class="bg-slate-900 p-7 text-white">
              <p class="text-xs font-extrabold uppercase text-slate-300">Revenue Health</p>
              <div class="mt-5 grid gap-4">
                <div *ngFor="let item of store.revenueChart()" class="grid gap-2">
                  <div class="flex justify-between text-sm"><span>{{ item.label }}</span><strong>{{ item.value | currency:'ETB' }}</strong></div>
                  <div class="h-2 rounded-full bg-slate-700"><div class="h-2 rounded-full bg-mint-500" [style.width.%]="item.percent"></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-5 enterprises-grid grid-cols-2 gap-5 max-[950px]:grid-cols-1">
          <article class="enterprise-panel p-5">
            <h3 class="text-base font-black text-slate-900">Recent Invoices</h3>
            <div class="mt-4 grid divide-y divide-slate-100">
              <div *ngFor="let invoice of recentInvoices()" class="flex items-center justify-between py-3 text-sm">
                <div><strong>{{ invoice.invoiceNumber }}</strong><br><span class="text-xs text-slate-500">{{ store.patientName(invoice.patientId) }}</span></div>
                <span class="text-right"><strong>{{ invoice.total | currency:'ETB' }}</strong><br><span class="badge" [class.badge-green]="invoice.status === 'Paid'">{{ invoice.status }}</span></span>
              </div>
              <div *ngIf="!store.invoices().length" class="py-3 text-sm text-slate-500">No invoices yet</div>
            </div>
          </article>
          <article class="enterprise-panel p-5">
            <h3 class="text-base font-black text-slate-900">Claims Overview</h3>
            <div class="mt-4 grid divide-y divide-slate-100">
              <div *ngFor="let record of insuranceClaimsRecords()" class="flex items-center justify-between py-3 text-sm">
                <div><strong>{{ record.title }}</strong><br><span class="text-xs text-slate-500">{{ record.owner }}</span></div>
                <span class="text-right"><strong>{{ record.amount | currency:'ETB' }}</strong><br><span class="badge">{{ record.status }}</span></span>
              </div>
              <div *ngIf="!hasInsuranceClaims()" class="py-3 text-sm text-slate-500">No claims yet</div>
            </div>
          </article>
        </section>
      </ng-container>

      <!-- CASHIER Dashboard -->
      <ng-container *ngIf="user.role === 'CASHIER'">
        <section class="enterprise-panel overflow-hidden">
          <div class="grid grid-cols-[1.2fr_.8fr] gap-0 max-[950px]:grid-cols-1">
            <div class="p-7">
              <p class="text-xs font-extrabold uppercase text-brand-600">Payment Station</p>
              <h2 class="mt-1 text-2xl font-black text-slate-900">Payment collection and receipting</h2>
              <div class="mt-5 grid grid-cols-2 gap-3">
                <button class="btn-primary" type="button" (click)="navigate('billing')">Record Payment</button>
                <button class="btn-primary" type="button" (click)="navigate('billing')">View Receipts</button>
              </div>
            </div>
            <div class="bg-slate-900 p-7 text-white">
              <p class="text-xs font-extrabold uppercase text-slate-300">Revenue Health</p>
              <div class="mt-5 grid gap-4">
                <div *ngFor="let item of store.revenueChart()" class="grid gap-2">
                  <div class="flex justify-between text-sm"><span>{{ item.label }}</span><strong>{{ item.value | currency:'ETB' }}</strong></div>
                  <div class="h-2 rounded-full bg-slate-700"><div class="h-2 rounded-full bg-mint-500" [style.width.%]="item.percent"></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-5 enterprise-panel overflow-auto p-4">
          <h3 class="mb-3 text-base font-black text-slate-900">Recent Payments</h3>
          <table class="data-table">
            <thead><tr><th>Receipt</th><th>Invoice</th><th>Patient</th><th>Amount</th><th>Method</th><th>Received By</th><th>Paid At</th></tr></thead>
            <tbody>
              <tr *ngFor="let row of recentPayments()">
                <td class="font-black">{{ row.receiptNumber }}</td>
                <td>{{ store.invoiceFor(row.invoiceId)?.invoiceNumber }}</td>
                <td>{{ store.patientName(store.invoiceFor(row.invoiceId)?.patientId ?? '') }}</td>
                <td><strong>{{ row.amount | currency:'ETB' }}</strong></td>
                <td>{{ row.method }}</td>
                <td>{{ row.receivedBy }}</td>
                <td>{{ row.paidAtUtc | date:'short' }}</td>
              </tr>
              <tr *ngIf="!store.payments().length"><td colspan="7" class="text-center text-slate-500">No payments recorded yet</td></tr>
            </tbody>
          </table>
        </section>
      </ng-container>

      <!-- HR_MANAGER Dashboard -->
      <ng-container *ngIf="user.role === 'HR_MANAGER'">
        <section class="enterprise-panel overflow-hidden">
          <div class="p-7">
            <p class="text-xs font-extrabold uppercase text-brand-600">HR Console</p>
            <h2 class="mt-1 text-2xl font-black text-slate-900">Workforce management and staffing</h2>
            <div class="mt-5 grid grid-cols-3 gap-3 max-[600px]:grid-cols-1">
              <button class="btn-primary" type="button" (click)="navigate('employees')">Manage Employees</button>
              <button class="btn-primary" type="button" (click)="navigate('employees')">Send Invitations</button>
              <button class="btn-primary" type="button" (click)="navigate('admin')">Roles & Permissions</button>
            </div>
          </div>
        </section>

        <section class="mt-5 grid grid-cols-2 gap-5 max-[950px]:grid-cols-1">
          <article class="enterprise-panel p-5">
            <h3 class="text-base font-black text-slate-900">Pending Setup Invitations</h3>
            <div class="mt-4 grid divide-y divide-slate-100">
              <div *ngFor="let emp of pendingEmployees()" class="flex items-center justify-between py-3 text-sm">
                <div><strong>{{ emp.firstName }} {{ emp.lastName }}</strong><br><span class="text-xs text-slate-500">{{ emp.emailAddress }}</span></div>
                <button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" (click)="resendInvite(emp)">Resend</button>
              </div>
              <div *ngIf="!hasPendingEmployees()" class="py-3 text-sm text-slate-500">All invitations completed</div>
            </div>
          </article>
          <article class="enterprise-panel p-5">
            <h3 class="text-base font-black text-slate-900">Department Staffing</h3>
            <div class="mt-4 grid divide-y divide-slate-100">
              <div *ngFor="let dept of store.departments()" class="flex items-center justify-between py-3 text-sm">
                <span class="font-semibold text-slate-700">{{ dept.name }}</span>
                <span class="badge">{{ store.departmentStaffCount(dept.name) }} staff</span>
              </div>
              <div *ngIf="!store.departments().length" class="py-3 text-sm text-slate-500">No departments loaded</div>
            </div>
          </article>
        </section>
      </ng-container>

      <!-- Unknown / Fallback Dashboard -->
      <ng-container *ngIf="!knownRoles().includes(user.role)">
        <section class="enterprise-panel p-7">
          <p class="text-xs font-extrabold uppercase text-brand-600">Welcome</p>
          <h2 class="mt-1 text-2xl font-black text-slate-900">Your workspace is ready</h2>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Use the sidebar to navigate between sections. Your role ({{ user.role }}) gives you access to specific modules configured by your administrator.
          </p>
        </section>
      </ng-container>
    </ng-container>
  `,
})
export class DashboardComponent {
  constructor(
    public store: StoreService,
    private router: Router
  ) {}

  navigate(path: string) {
    this.router.navigate(['/' + path]);
  }

  pendingEmployees() {
    return this.store.employees().filter((e) => !e.passwordSetupCompleted).slice(0, 8);
  }

  hasPendingEmployees() {
    return this.store.employees().filter((e) => !e.passwordSetupCompleted).length > 0;
  }

  insuranceClaimsRecords() {
    return this.store.enterpriseRecords().filter((r) => r.area === 'Insurance Claims').slice(-5);
  }

  hasInsuranceClaims() {
    return this.store.enterpriseRecords().filter((r) => r.area === 'Insurance Claims').length > 0;
  }

  recentPayments() {
    return this.store.payments().slice(-10).reverse();
  }

  recentPrescriptions() {
    return this.store.prescriptions().slice(-10).reverse();
  }

  recentInvoices() {
    return this.store.invoices().slice(-5).reverse();
  }

  knownRoles() {
    return ['ADMIN','DOCTOR','NURSE','RECEPTIONIST','PHARMACIST','LAB_TECHNICIAN','ACCOUNTANT','CASHIER','HR_MANAGER'];
  }

  resendInvite(emp: import('../../core/models').Employee) {
    this.store.saving.set(true);
    this.store.resendEmployeeInvite(emp.id).subscribe({
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
