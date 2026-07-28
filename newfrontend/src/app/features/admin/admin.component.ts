import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ApiService } from '../../api.service';
import type { AdminTab, BackendRolePermission, BackendPermission, BackendEmailOutbox } from '../../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Administration Control Center</h1>
          <p class="text-xs text-slate-500 mt-1">Create users, define roles, assign permissions, and manage departments</p>
        </div>
      </div>

      <!-- Tab Switcher -->
      <div class="bg-white rounded-2xl border border-slate-200/80 subtle-shadow p-4">
        <div class="flex flex-wrap gap-2">
          @for (tab of tabs; track tab.id) {
            <button (click)="activeTab.set(tab.id)" [class]="activeTab() === tab.id ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'" class="px-4 py-2 rounded-xl text-xs transition-all">
              {{ tab.label }}
            </button>
          }
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 subtle-shadow">
          <span class="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">Users</span>
          <p class="text-2xl font-black text-slate-900 mt-2 font-display">{{ store.employees().length }}</p>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 subtle-shadow">
          <span class="text-[10px] font-bold uppercase text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg">Roles</span>
          <p class="text-2xl font-black text-slate-900 mt-2 font-display">{{ roles().length }}</p>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 subtle-shadow">
          <span class="text-[10px] font-bold uppercase text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-lg">Permissions</span>
          <p class="text-2xl font-black text-slate-900 mt-2 font-display">{{ permissions().length }}</p>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 subtle-shadow">
          <span class="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">Departments</span>
          <p class="text-2xl font-black text-slate-900 mt-2 font-display">{{ store.departments().length }}</p>
        </div>
      </div>

      <!-- Users Tab -->
      @if (activeTab() === 'users') {
        <div class="bg-white rounded-2xl border border-slate-200/80 subtle-shadow overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 class="text-xs font-bold text-slate-800">System Users</h3>
            <button (click)="showEmployeeModal.set(true)" class="px-3 py-1.5 bg-teal-600 text-white font-bold rounded-lg text-xs">+ New User</button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr><th class="py-3.5 px-4">Name</th><th class="py-3.5 px-4">Email</th><th class="py-3.5 px-4">Role</th><th class="py-3.5 px-4">Department</th><th class="py-3.5 px-4">Status</th><th class="py-3.5 px-4">Action</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (emp of store.employees(); track emp.id) {
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3.5 px-4 font-bold text-slate-900">{{ emp.firstName }} {{ emp.lastName }}</td>
                    <td class="py-3.5 px-4 text-slate-600">{{ emp.emailAddress }}</td>
                    <td class="py-3.5 px-4"><span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px] border border-blue-200">{{ emp.role }}</span></td>
                    <td class="py-3.5 px-4 text-slate-600">{{ emp.department || '-' }}</td>
                    <td class="py-3.5 px-4">
                      <span [class]="emp.isActive && emp.passwordSetupCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'" class="px-2 py-0.5 rounded-full text-[10px] font-bold border">
                        {{ !emp.isActive ? 'Inactive' : emp.passwordSetupCompleted ? 'Active' : 'Pending' }}
                      </span>
                    </td>
                    <td class="py-3.5 px-4">
                      <button (click)="resendInvite(emp.id)" class="px-2 py-1 bg-slate-100 hover:bg-teal-50 rounded-lg text-[10px] font-semibold border border-slate-200">Send Invite</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Roles Tab -->
      @if (activeTab() === 'roles') {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (role of roles(); track role.role) {
            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 subtle-shadow space-y-3">
              <div class="flex items-start justify-between gap-3">
                <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">{{ role.role }}</span>
                <strong class="text-xs bg-slate-100 px-2 py-1 rounded-lg">{{ role.userCount }} users</strong>
              </div>
              <p class="text-xs text-slate-500">{{ role.description }}</p>
              <div class="flex flex-wrap gap-1">
                @for (p of role.permissions; track p) {
                  <span class="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600">{{ p }}</span>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Permissions Tab -->
      @if (activeTab() === 'permissions') {
        <div class="bg-white rounded-2xl border border-slate-200/80 subtle-shadow overflow-hidden">
          <div class="p-4 border-b border-slate-100 bg-slate-50/50"><h3 class="text-xs font-bold text-slate-800">Permission Dictionary</h3></div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr><th class="py-3.5 px-4">Key</th><th class="py-3.5 px-4">Description</th><th class="py-3.5 px-4">Module</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (perm of permissions(); track perm.key) {
                  <tr class="hover:bg-slate-50/80">
                    <td class="py-3.5 px-4"><span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px]">{{ perm.key }}</span></td>
                    <td class="py-3.5 px-4 text-slate-600">{{ perm.description }}</td>
                    <td class="py-3.5 px-4 text-slate-600">{{ perm.module }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Departments Tab -->
      @if (activeTab() === 'departments') {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          @for (dept of store.departments(); track dept.id) {
            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 subtle-shadow">
              <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">{{ dept.code }}</span>
              <h3 class="mt-3 text-sm font-bold text-slate-900">{{ dept.name }}</h3>
              <p class="text-[11px] text-slate-500">{{ dept.type }} | {{ dept.location }}</p>
              <strong class="mt-3 block text-xl text-slate-900">{{ dept.activeStaffCount }}</strong>
              <span class="text-[10px] font-bold uppercase text-slate-500">assigned staff</span>
            </div>
          }
        </div>
      }

      <!-- Emails Tab -->
      @if (activeTab() === 'emails') {
        <div class="bg-white rounded-2xl border border-slate-200/80 subtle-shadow overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 class="text-xs font-bold text-slate-800">Email Delivery Log</h3>
            <button (click)="loadEmails()" class="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-semibold">Refresh</button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr><th class="py-3.5 px-4">Recipient</th><th class="py-3.5 px-4">Subject</th><th class="py-3.5 px-4">Status</th><th class="py-3.5 px-4">Created</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (email of emails(); track email.id) {
                  <tr class="hover:bg-slate-50/80">
                    <td class="py-3.5 px-4 text-slate-600">{{ email.recipient }}</td>
                    <td class="py-3.5 px-4 text-slate-800 font-medium">{{ email.subject }}</td>
                    <td class="py-3.5 px-4">
                      <span [class]="email.status === 'Sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'" class="px-2 py-0.5 rounded-full text-[10px] font-bold border">
                        {{ email.status }}
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-slate-400">{{ email.createdAtUtc | date: 'short' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="py-8 text-center text-slate-400">No emails in outbox</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminComponent {
  store = inject(StoreService);
  api = inject(ApiService);

  activeTab = signal<AdminTab>('users');
  showEmployeeModal = signal(false);
  roles = signal<BackendRolePermission[]>([]);
  permissions = signal<BackendPermission[]>([]);
  emails = signal<BackendEmailOutbox[]>([]);

  tabs = [
    { id: 'users' as AdminTab, label: 'Users' },
    { id: 'roles' as AdminTab, label: 'Roles' },
    { id: 'permissions' as AdminTab, label: 'Permissions' },
    { id: 'departments' as AdminTab, label: 'Departments' },
    { id: 'emails' as AdminTab, label: 'Email Outbox' },
  ];

  constructor() {
    this.loadRoles();
    this.loadPermissions();
  }

  loadRoles() {
    this.api.getRoles().subscribe({ next: (r) => { if (r.data) this.roles.set(r.data); } });
  }

  loadPermissions() {
    this.api.getPermissions().subscribe({ next: (r) => { if (r.data) this.permissions.set(r.data); } });
  }

  loadEmails() {
    this.api.getEmailOutbox().subscribe({ next: (r) => { if (r.data) this.emails.set(r.data); } });
  }

  resendInvite(id: string) {
    this.store.isSaving.set(true);
    this.api.resendEmployeeInvite(id).subscribe({
      next: () => { this.store.isSaving.set(false); this.store.addToast('success', 'Invitation Sent', 'Password setup invitation prepared.'); },
      error: () => { this.store.isSaving.set(false); this.store.addToast('error', 'Failed', 'Invitation could not be sent.'); },
    });
  }
}
