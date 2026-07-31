import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ApiService } from '../../api.service';
import type { AdminTab, BackendRolePermission, BackendPermission, BackendEmailOutbox, BackendEmployee, DiagnosticTest } from '../../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in pb-20">
      
      <!-- TOP HEADER BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Administration Control Center</h1>
          <p class="text-xs text-slate-500 mt-1">System security, role-based access control, and department management</p>
        </div>

        @if (activeTab() === 'users' && !isFormVisible() && !isEditFormVisible()) {
          <button 
            (click)="openNewForm()" 
            class="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-2xl text-xs shadow-xl shadow-slate-200 flex items-center gap-2 self-start sm:self-auto hover:bg-slate-800 transition-all active:scale-95">
            <span class="material-icons text-base">person_add_alt</span>
            <span>Create New User</span>
          </button>
        }
      </div>

      <!-- INLINE NEW USER FORM -->
      @if (activeTab() === 'users' && isFormVisible()) {
        <div class="bg-white rounded-3xl border-2 border-teal-500/20 shadow-2xl shadow-teal-500/5 overflow-hidden animate-slide-down">
          <div class="bg-teal-50/50 px-6 py-4 border-b border-teal-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                <span class="material-icons text-base">person_add</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">Provision New System User</h3>
                <p class="text-[10px] text-teal-600 font-bold uppercase tracking-widest">Setup login and role permissions</p>
              </div>
            </div>
            <button (click)="resetNewForm()" class="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form #empForm="ngForm" (ngSubmit)="createEmployee()" class="p-6 sm:p-8 space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <!-- Column 1: Identity -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-teal-500 rounded-full"></span> Identity
                </h4>
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">First Name *</label>
                    <input [(ngModel)]="newEmployee.firstName" name="firstName" required [class]="inputClasses" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Last Name *</label>
                    <input [(ngModel)]="newEmployee.lastName" name="lastName" required [class]="inputClasses" />
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Professional Email *</label>
                  <input [(ngModel)]="newEmployee.emailAddress" name="email" type="email" required placeholder="name@hospital.com" [class]="inputClasses" />
                </div>
              </div>

              <!-- Column 2: Contact & Org -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-blue-500 rounded-full"></span> Contact & Org
                </h4>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Phone Number</label>
                  <input [(ngModel)]="newEmployee.phone" name="phone" [class]="inputClasses" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Specialization</label>
                  <input [(ngModel)]="newEmployee.specialization" name="specialization" placeholder="e.g. Oncology" [class]="inputClasses" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Department</label>
                  <input [(ngModel)]="newEmployee.department" name="department" placeholder="e.g. Cardiology" [class]="inputClasses" />
                </div>
              </div>

              <!-- Column 3: Security -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-amber-500 rounded-full"></span> Access Control
                </h4>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Assigned System Role *</label>
                  <select [(ngModel)]="newEmployee.role" name="role" required [class]="inputClasses">
                    <option value="">Select a Role</option>
                    @for (role of roles(); track role.role) {
                      <option [value]="role.role">{{ role.role }}</option>
                    }
                  </select>
                </div>

                <!-- Creation Mode Toggle -->
                <div class="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  <button type="button" (click)="creationMode.set('invite')" [class]="creationMode() === 'invite' ? 'bg-white text-teal-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'" class="flex-1 px-3 py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all">Send Invite</button>
                  <button type="button" (click)="creationMode.set('password')" [class]="creationMode() === 'password' ? 'bg-white text-amber-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'" class="flex-1 px-3 py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all">Set Password</button>
                </div>

                @if (creationMode() === 'invite') {
                  <div class="p-4 bg-teal-50 rounded-2xl border border-teal-200">
                    <p class="text-[10px] text-teal-700 leading-relaxed font-medium italic">
                      User will receive an automated invitation email to securely set their password and activate their account.
                    </p>
                  </div>
                }
                @if (creationMode() === 'password') {
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Set Initial Password *</label>
                    <input [(ngModel)]="newEmployeePassword" name="password" type="password" required minlength="8" placeholder="Minimum 8 characters" [class]="inputClasses + ' border-amber-200 focus:border-amber-500 focus:ring-amber-500/5'" />
                  </div>
                  <div class="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                    <p class="text-[10px] text-amber-700 leading-relaxed font-medium italic">
                      The user will be able to sign in immediately with this password. No invitation email will be sent.
                    </p>
                  </div>
                }
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button type="button" (click)="resetNewForm()" class="px-6 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Discard</button>
              @if (creationMode() === 'invite') {
                <button type="submit" class="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-0.5 active:scale-95">
                  Create User & Send Invite
                </button>
              }
              @if (creationMode() === 'password') {
                <button type="submit" class="px-8 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 active:scale-95">
                  Create User & Set Password
                </button>
              }
            </div>
          </form>
        </div>
      }

      <!-- INLINE EDIT USER FORM -->
      @if (activeTab() === 'users' && isEditFormVisible()) {
        <div class="bg-white rounded-3xl border-2 border-blue-500/20 shadow-2xl shadow-blue-500/5 overflow-hidden animate-slide-down">
          <div class="bg-blue-50/50 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <span class="material-icons text-base">edit</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">Edit System User</h3>
                <p class="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Update profile, role, and contact information</p>
              </div>
            </div>
            <button (click)="closeEditForm()" class="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form #editForm="ngForm" (ngSubmit)="updateEmployee()" class="p-6 sm:p-8 space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              <!-- Column 1: Identity -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-blue-500 rounded-full"></span> Identity
                </h4>
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">First Name *</label>
                    <input [(ngModel)]="editEmployee.firstName" name="editFirstName" required [class]="inputClasses" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Last Name *</label>
                    <input [(ngModel)]="editEmployee.lastName" name="editLastName" required [class]="inputClasses" />
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Professional Email *</label>
                  <input [(ngModel)]="editEmployee.emailAddress" name="editEmail" type="email" required placeholder="name@hospital.com" [class]="inputClasses" />
                </div>
              </div>

              <!-- Column 2: Contact & Org -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-blue-500 rounded-full"></span> Contact & Org
                </h4>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Phone Number</label>
                  <input [(ngModel)]="editEmployee.phone" name="editPhone" [class]="inputClasses" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Specialization</label>
                  <input [(ngModel)]="editEmployee.specialization" name="editSpecialization" placeholder="e.g. Oncology" [class]="inputClasses" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Department</label>
                  <input [(ngModel)]="editEmployee.department" name="editDepartment" placeholder="e.g. Cardiology" [class]="inputClasses" />
                </div>
              </div>

              <!-- Column 3: Access Control -->
              <div class="space-y-4">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span class="w-1 h-3 bg-blue-500 rounded-full"></span> Access Control
                </h4>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-500 ml-1 uppercase">Assigned System Role *</label>
                  <select [(ngModel)]="editEmployee.role" name="editRole" required [class]="inputClasses">
                    <option value="">Select a Role</option>
                    @for (role of roles(); track role.role) {
                      <option [value]="role.role">{{ role.role }}</option>
                    }
                  </select>
                </div>
                <div class="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                  <p class="text-[10px] text-blue-700 leading-relaxed font-medium italic">
                    Changing a user's role updates their system permissions immediately.
                  </p>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button type="button" (click)="closeEditForm()" class="px-6 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button type="submit" class="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:scale-95">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <span class="material-icons text-blue-500 bg-blue-50 p-2 rounded-xl text-base">groups</span>
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Users</span>
          </div>
          <p class="text-2xl font-black text-slate-900 font-display">{{ store.employees().length }}</p>
        </div>
        <div class="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <span class="material-icons text-violet-500 bg-violet-50 p-2 rounded-xl text-base">admin_panel_settings</span>
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Defined Roles</span>
          </div>
          <p class="text-2xl font-black text-slate-900 font-display">{{ roles().length }}</p>
        </div>
        <div class="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <span class="material-icons text-cyan-500 bg-cyan-50 p-2 rounded-xl text-base">vpn_key</span>
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Permissions</span>
          </div>
          <p class="text-2xl font-black text-slate-900 font-display">{{ permissions().length }}</p>
        </div>
        <div class="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <span class="material-icons text-amber-500 bg-amber-50 p-2 rounded-xl text-base">lan</span>
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Departments</span>
          </div>
          <p class="text-2xl font-black text-slate-900 font-display">{{ store.departments().length }}</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="bg-white/50 backdrop-blur-md sticky top-0 z-20 -mx-4 px-4 py-2 flex items-center justify-center sm:justify-start border-y border-slate-100 overflow-x-auto custom-scrollbar no-scrollbar">
        <div class="flex gap-2 p-1 bg-slate-100/50 rounded-2xl">
          @for (tab of tabs; track tab.id) {
            <button 
              (click)="activeTab.set(tab.id)" 
              [class]="activeTab() === tab.id ? 'bg-white text-slate-900 shadow-md font-bold' : 'text-slate-500 hover:bg-white/50'"
              class="px-5 py-2 rounded-xl text-[11px] uppercase tracking-widest transition-all">
              {{ tab.label }}
            </button>
          }
        </div>
      </div>

      <!-- Tab Content Area -->
      <div class="min-h-[400px]">
        
        <!-- Users Tab -->
        @if (activeTab() === 'users') {
          <div class="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-500 uppercase tracking-widest font-black text-[9px] border-b border-slate-200">
                  <tr>
                    <th class="py-4 px-6">System Identity</th>
                    <th class="py-4 px-6">Login Email</th>
                    <th class="py-4 px-6">Assigned Role</th>
                    <th class="py-4 px-6">Department</th>
                    <th class="py-4 px-6">Account Status</th>
                    <th class="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (emp of store.employees(); track emp.id) {
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="py-4 px-6 font-bold text-slate-900">{{ emp.firstName }} {{ emp.lastName }}</td>
                      <td class="py-4 px-6 text-slate-500 font-medium">{{ emp.emailAddress }}</td>
                      <td class="py-4 px-6">
                        <span class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-100 uppercase tracking-tight">
                          {{ emp.role }}
                        </span>
                      </td>
                      <td class="py-4 px-6 text-slate-600 font-medium italic">{{ emp.department || 'Not Assigned' }}</td>
                      <td class="py-4 px-6">
                        <span [class]="emp.isActive && emp.passwordSetupCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'" 
                          class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest">
                          {{ !emp.isActive ? 'Deactivated' : emp.passwordSetupCompleted ? 'Ready' : 'Setup Pending' }}
                        </span>
                      </td>
                      <td class="py-4 px-6 text-right flex items-center justify-end gap-2">
                        <button (click)="openEditForm(emp)" class="px-3 py-1.5 bg-white hover:bg-blue-50 rounded-xl text-[10px] font-black uppercase tracking-wider text-blue-600 border border-blue-200 hover:border-blue-300 transition-all">Edit</button>
                        @if (emp.isActive) {
                          <button (click)="toggleUserStatus(emp.id, emp.firstName + ' ' + emp.lastName, false)" class="px-3 py-1.5 bg-white hover:bg-rose-50 rounded-xl text-[10px] font-black uppercase tracking-wider text-rose-600 border border-rose-200 hover:border-rose-300 transition-all">Deactivate</button>
                        } @else {
                          <button (click)="toggleUserStatus(emp.id, emp.firstName + ' ' + emp.lastName, true)" class="px-3 py-1.5 bg-white hover:bg-emerald-50 rounded-xl text-[10px] font-black uppercase tracking-wider text-emerald-600 border border-emerald-200 hover:border-emerald-300 transition-all">Activate</button>
                        }
                        @if (emp.isActive) {
                          <button (click)="resendInvite(emp.id)" class="px-3 py-1.5 bg-white hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 border border-slate-200 transition-all">Invite</button>
                        }
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
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (role of roles(); track role.role) {
              <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                <div class="absolute top-0 left-0 right-0 h-1.5 bg-blue-50 group-hover:bg-blue-500 transition-colors"></div>
                <div class="flex items-center justify-between mb-4">
                  <span class="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-black text-[10px] uppercase tracking-widest border border-blue-100">{{ role.role }}</span>
                  <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ role.userCount }} Active Users</div>
                </div>
                <p class="text-xs text-slate-500 leading-relaxed font-medium">{{ role.description }}</p>
                <div class="flex flex-wrap gap-1.5 pt-4">
                  @for (p of role.permissions; track p) {
                    <span class="px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-mono font-bold text-slate-500 uppercase">{{ p }}</span>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Permissions Tab -->
        @if (activeTab() === 'permissions') {
          <div class="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-500 uppercase tracking-widest font-black text-[9px] border-b border-slate-200">
                  <tr><th class="py-4 px-6">System Permission Key</th><th class="py-4 px-6">Functional Description</th><th class="py-4 px-6">Module Scope</th></tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (perm of permissions(); track perm.key) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="py-4 px-6"><span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">{{ perm.key }}</span></td>
                      <td class="py-4 px-6 text-slate-600 font-medium">{{ perm.description }}</td>
                      <td class="py-4 px-6"><span class="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-[10px] uppercase">{{ perm.module }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Departments Tab -->
        @if (activeTab() === 'departments') {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            @for (dept of store.departments(); track dept.id) {
              <div class="bg-white p-6 rounded-[2.5rem] border border-slate-200/80 shadow-sm group">
                <div class="flex items-center justify-between mb-4">
                   <div class="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">{{ dept.code }}</div>
                   <span class="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 font-black text-[9px] uppercase tracking-widest">{{ dept.type }}</span>
                </div>
                <h3 class="text-sm font-bold text-slate-900 mb-1">{{ dept.name }}</h3>
                <p class="text-[10px] text-slate-400 font-medium italic mb-4">{{ dept.location }}</p>
                <div class="pt-4 border-t border-slate-50 flex items-center justify-between">
                   <div class="text-2xl font-black text-slate-900 leading-none">{{ dept.activeStaffCount }}</div>
                   <div class="text-[9px] font-black text-slate-300 uppercase tracking-widest text-right">Registered Staff</div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Diagnostic Catalog Tab -->
        @if (activeTab() === 'diagnostics') {
          <div class="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
            <form (ngSubmit)="saveDiagnosticCatalogItem()" class="rounded-[2rem] border border-purple-100 bg-white p-6 shadow-sm">
              <div class="mb-5 flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600 text-white">
                  <span class="material-icons text-base">biotech</span>
                </div>
                <div>
                  <h3 class="text-sm font-black text-slate-900">Diagnostic Catalog</h3>
                  <p class="text-[10px] font-bold uppercase tracking-widest text-purple-600">Lab and imaging master data</p>
                </div>
              </div>

              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                  <label class="space-y-1">
                    <span class="text-[10px] font-bold uppercase text-slate-500">Group *</span>
                    <input [(ngModel)]="diagnosticForm.groupName" name="diagGroup" required placeholder="Radiology" [class]="inputClasses" />
                  </label>
                  <label class="space-y-1">
                    <span class="text-[10px] font-bold uppercase text-slate-500">Sub Group</span>
                    <input [(ngModel)]="diagnosticForm.subGroup" name="diagSubGroup" placeholder="MRI" [class]="inputClasses" />
                  </label>
                </div>
                <label class="block space-y-1">
                  <span class="text-[10px] font-bold uppercase text-slate-500">Test Name *</span>
                  <input [(ngModel)]="diagnosticForm.testName" name="diagTestName" required placeholder="MRI Brain" [class]="inputClasses" />
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <label class="space-y-1">
                    <span class="text-[10px] font-bold uppercase text-slate-500">Specimen</span>
                    <input [(ngModel)]="diagnosticForm.specimenType" name="diagSpecimen" placeholder="Imaging only" [class]="inputClasses" />
                  </label>
                  <label class="space-y-1">
                    <span class="text-[10px] font-bold uppercase text-slate-500">Unit</span>
                    <input [(ngModel)]="diagnosticForm.unit" name="diagUnit" placeholder="mg/dL" [class]="inputClasses" />
                  </label>
                </div>
                <label class="block space-y-1">
                  <span class="text-[10px] font-bold uppercase text-slate-500">Reference Range</span>
                  <input [(ngModel)]="diagnosticForm.referenceRange" name="diagRange" placeholder="30-100 or Radiologist report" [class]="inputClasses" />
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <label class="space-y-1">
                    <span class="text-[10px] font-bold uppercase text-slate-500">Sort Order</span>
                    <input [(ngModel)]="diagnosticForm.sortOrder" name="diagSort" type="number" [class]="inputClasses" />
                  </label>
                  <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
                    <input [(ngModel)]="diagnosticForm.isActive" name="diagActive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
                    Active in order screens
                  </label>
                </div>
              </div>

              <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" (click)="resetDiagnosticForm()" class="rounded-xl px-4 py-2 text-xs font-black text-slate-500 hover:bg-slate-100">Clear</button>
                <button type="submit" class="rounded-xl bg-purple-600 px-5 py-2 text-xs font-black text-white shadow-lg shadow-purple-500/20 hover:bg-purple-700">
                  {{ diagnosticForm.id ? 'Update Test' : 'Add Test' }}
                </button>
              </div>
            </form>

            <div class="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div class="border-b border-slate-100 bg-slate-50/50 p-5">
                <div class="text-[11px] font-black uppercase tracking-widest text-slate-900">Active Diagnostic Groups</div>
                <p class="mt-1 text-xs text-slate-500">Doctors and lab technicians use this catalog for checkbox order entry and predefined result ranges.</p>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="border-b border-slate-200 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <tr><th class="px-5 py-4">Group</th><th class="px-5 py-4">Sub Group</th><th class="px-5 py-4">Test</th><th class="px-5 py-4">Specimen</th><th class="px-5 py-4">Range</th><th class="px-5 py-4 text-right">Action</th></tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (test of sortedDiagnosticTests(); track test.id) {
                      <tr class="hover:bg-slate-50/60">
                        <td class="px-5 py-4 font-black text-slate-900">{{ test.groupName }}</td>
                        <td class="px-5 py-4 text-slate-600">{{ test.subGroup }}</td>
                        <td class="px-5 py-4 font-bold text-slate-800">{{ test.testName }}</td>
                        <td class="px-5 py-4 text-slate-500">{{ test.specimenType || 'As applicable' }}</td>
                        <td class="px-5 py-4 font-mono text-[10px] text-slate-500">{{ test.referenceRange || 'Report based' }} {{ test.unit }}</td>
                        <td class="px-5 py-4 text-right">
                          <button type="button" (click)="editDiagnosticCatalogItem(test)" class="rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-purple-700 hover:bg-purple-50">Edit</button>
                        </td>
                      </tr>
                    } @empty {
                      <tr><td colspan="6" class="py-16 text-center text-xs font-bold text-slate-400">No diagnostic catalog items loaded.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- Emails Tab -->
        @if (activeTab() === 'emails') {
          <div class="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div class="flex items-center gap-2">
                <span class="material-icons text-slate-400 text-sm">alternate_email</span>
                <span class="text-[11px] font-black text-slate-900 uppercase tracking-widest">Global SMTP Delivery Outbox</span>
              </div>
              <button (click)="loadEmails()" class="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all">Refresh Logs</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-500 uppercase tracking-widest font-black text-[9px] border-b border-slate-200">
                  <tr><th class="py-4 px-6">Recipient Address</th><th class="py-4 px-6">Email Subject Header</th><th class="py-4 px-6">Delivery Status</th><th class="py-4 px-6">Timestamp</th></tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (email of emails(); track email.id) {
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="py-4 px-6 text-slate-600 font-medium">{{ email.recipient }}</td>
                      <td class="py-4 px-6 text-slate-900 font-bold">{{ email.subject }}</td>
                      <td class="py-4 px-6">
                        <span [class]="email.status === 'Sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'" class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest">
                          {{ email.status }}
                        </span>
                      </td>
                      <td class="py-4 px-6 text-slate-400 font-mono">{{ email.createdAtUtc | date: 'MMM dd, HH:mm' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="4" class="py-20 text-center text-slate-400 font-medium italic tracking-wide">The secure delivery outbox is currently empty.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class AdminComponent {
  store = inject(StoreService);
  api = inject(ApiService);

  activeTab = signal<AdminTab>('users');
  isFormVisible = signal(false);
  isEditFormVisible = signal(false);
  editEmployeeId = signal<string | null>(null);
  roles = signal<BackendRolePermission[]>([]);
  permissions = signal<BackendPermission[]>([]);
  emails = signal<BackendEmailOutbox[]>([]);
  creationMode = signal<'invite' | 'password'>('invite');

  readonly inputClasses = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all font-medium';

  newEmployee = {
    firstName: '',
    lastName: '',
    emailAddress: '',
    phone: '',
    role: '',
    specialization: '',
    department: '',
  };
  newEmployeePassword = '';

  editEmployee = {
    firstName: '',
    lastName: '',
    emailAddress: '',
    phone: '',
    role: '',
    specialization: '',
    department: '',
  };

  diagnosticForm: Omit<DiagnosticTest, 'id'> & { id?: string } = {
    groupName: 'Radiology',
    subGroup: 'MRI',
    testName: '',
    specimenType: 'Imaging only',
    unit: '',
    referenceRange: 'Radiologist report',
    sortOrder: 0,
    isActive: true,
  };

  sortedDiagnosticTests = computed(() =>
    [...this.store.diagnosticTests()].sort((a, b) =>
      a.groupName.localeCompare(b.groupName) ||
      a.subGroup.localeCompare(b.subGroup) ||
      a.sortOrder - b.sortOrder ||
      a.testName.localeCompare(b.testName)));

  tabs = [
    { id: 'users' as AdminTab, label: 'Identity Management' },
    { id: 'roles' as AdminTab, label: 'Role Dictionary' },
    { id: 'permissions' as AdminTab, label: 'System Access' },
    { id: 'departments' as AdminTab, label: 'Org Structure' },
    { id: 'diagnostics' as AdminTab, label: 'Diagnostics Catalog' },
    { id: 'emails' as AdminTab, label: 'SMTP Logs' },
  ];

  constructor() {
    this.loadRoles();
    this.loadPermissions();
  }

  resetDiagnosticForm() {
    this.diagnosticForm = {
      groupName: 'Radiology',
      subGroup: 'MRI',
      testName: '',
      specimenType: 'Imaging only',
      unit: '',
      referenceRange: 'Radiologist report',
      sortOrder: 0,
      isActive: true,
    };
  }

  editDiagnosticCatalogItem(test: DiagnosticTest) {
    this.diagnosticForm = { ...test };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  saveDiagnosticCatalogItem() {
    if (!this.diagnosticForm.groupName || !this.diagnosticForm.testName) {
      this.store.addToast('error', 'Catalog Validation', 'Group and test name are required.');
      return;
    }
    this.store.saveDiagnosticTest({
      ...this.diagnosticForm,
      subGroup: this.diagnosticForm.subGroup || 'General',
      specimenType: this.diagnosticForm.specimenType || '',
      unit: this.diagnosticForm.unit || '',
      referenceRange: this.diagnosticForm.referenceRange || '',
      sortOrder: Number(this.diagnosticForm.sortOrder || 0),
      isActive: !!this.diagnosticForm.isActive,
    });
    this.resetDiagnosticForm();
  }

  loadRoles() {
    this.api.getRoles().subscribe({
      next: (r) => { if (r.data) this.roles.set(r.data); },
      error: () => this.store.addToast('error', 'Roles Unavailable', 'The role directory could not be loaded. Role-based access controls may be affected. Please try refreshing the page.'),
    });
  }

  loadPermissions() {
    this.api.getPermissions().subscribe({
      next: (r) => { if (r.data) this.permissions.set(r.data); },
      error: () => this.store.addToast('error', 'Permissions Unavailable', 'System permissions could not be fetched. Access control lists may not reflect the current state. Please refresh and try again.'),
    });
  }

  loadEmails() {
    this.api.getEmailOutbox().subscribe({
      next: (r) => { if (r.data) this.emails.set(r.data); },
      error: () => this.store.addToast('error', 'Outbox Unavailable', 'The SMTP delivery log could not be retrieved. The email service may be offline. Please try again later.'),
    });
  }

  resendInvite(id: string) {
    this.store.isSaving.set(true);
    this.api.resendEmployeeInvite(id).subscribe({
      next: () => {
        this.store.isSaving.set(false);
        this.store.addToast('success', 'Invitation Sent', 'A password setup email has been dispatched to the user. They will receive instructions to activate their account.');
      },
      error: (err) => {
        this.store.isSaving.set(false);
        const msg = err?.error?.message || err?.message || '';
        if (msg.includes('already') || msg.includes('pending')) {
          this.store.addToast('error', 'Duplicate Invitation', 'This user already has a pending invitation. Please wait for the current invitation to expire before sending a new one.');
        } else if (msg.includes('not found') || msg.includes('404')) {
          this.store.addToast('error', 'User Not Found', 'The user you are trying to invite no longer exists in the system. The list has been refreshed.');
        } else if (msg.includes('inactive')) {
          this.store.addToast('error', 'Inactive Account', 'This user account is currently deactivated. Invitations can only be sent to active users. Please activate the account first.');
        } else {
          this.store.addToast('error', 'Invitation Failed', 'The invitation email could not be sent. This may be due to an email service outage or a network issue. Please try again later or contact IT support.');
        }
      },
    });
  }

  openNewForm() {
    this.isEditFormVisible.set(false);
    this.editEmployeeId.set(null);
    this.isFormVisible.set(true);
  }

  openEditForm(emp: BackendEmployee) {
    this.isFormVisible.set(false);
    this.editEmployeeId.set(emp.id);
    this.editEmployee = {
      firstName: emp.firstName,
      lastName: emp.lastName,
      emailAddress: emp.emailAddress,
      phone: emp.phone || '',
      role: emp.role,
      specialization: emp.specialization || '',
      department: emp.department || '',
    };
    this.isEditFormVisible.set(true);
  }

  closeEditForm() {
    this.isEditFormVisible.set(false);
    this.editEmployeeId.set(null);
  }

  updateEmployee() {
    const id = this.editEmployeeId();
    if (!id || !this.editEmployee.firstName || !this.editEmployee.lastName || !this.editEmployee.emailAddress || !this.editEmployee.role) return;

    const name = `${this.editEmployee.firstName} ${this.editEmployee.lastName}`;
    this.store.isSaving.set(true);
    this.api.updateEmployee(id, this.editEmployee).subscribe({
      next: (res) => {
        this.store.isSaving.set(false);
        if (res.success) {
          this.closeEditForm();
          this.api.getEmployees().subscribe(r => { if (r.data) this.store.employees.set(r.data); });
          this.store.addToast('success', 'User Updated', `${name}'s profile has been updated successfully.`);
        }
      },
      error: (err) => {
        this.store.isSaving.set(false);
        const msg = err?.error?.message || err?.message || '';
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          this.store.addToast('error', 'Duplicate Email', 'Another user is already using this email address. Please use a different email.');
        } else if (msg.includes('not found') || msg.includes('404')) {
          this.store.addToast('error', 'User Not Found', 'This user no longer exists in the system. The list has been refreshed.');
          this.closeEditForm();
        } else {
          this.store.addToast('error', 'Update Failed', 'Unable to save changes to this user. Please verify the information and try again.');
        }
      },
    });
  }

  toggleUserStatus(id: string, name: string, activate: boolean) {
    this.store.isSaving.set(true);
    this.api.updateEmployeeStatus(id, activate).subscribe({
      next: (res) => {
        this.store.isSaving.set(false);
        if (res.success) {
          this.api.getEmployees().subscribe(r => { if (r.data) this.store.employees.set(r.data); });
          this.store.addToast('success', activate ? 'User Activated' : 'User Deactivated', `${name} has been ${activate ? 'reactivated' : 'deactivated'} successfully.`);
        }
      },
      error: (err) => {
        this.store.isSaving.set(false);
        const msg = err?.error?.message || err?.message || '';
        if (msg.includes('last admin') || msg.includes('last active')) {
          this.store.addToast('error', 'Action Blocked', 'You cannot deactivate the last active administrator account. At least one admin must remain active.');
        } else {
          const action = activate ? 'activate' : 'deactivate';
          this.store.addToast('error', 'Status Change Failed', `Unable to ${action} this user right now. This could be due to a network issue or a server error. Please try again.`);
        }
      },
    });
  }

  createEmployee() {
    if (!this.newEmployee.firstName || !this.newEmployee.lastName || !this.newEmployee.emailAddress || !this.newEmployee.role) return;

    if (this.creationMode() === 'password') {
      if (!this.newEmployeePassword || this.newEmployeePassword.length < 8) {
        this.store.addToast('error', 'Weak Password', 'The password must be at least 8 characters long. Please provide a stronger password.');
        return;
      }
      this.createEmployeeWithPassword();
      return;
    }

    this.createEmployeeWithInvite();
  }

  private createEmployeeWithInvite() {
    const name = `${this.newEmployee.firstName} ${this.newEmployee.lastName}`;
    this.store.isSaving.set(true);
    this.api.createEmployee({
      firstName: this.newEmployee.firstName,
      lastName: this.newEmployee.lastName,
      emailAddress: this.newEmployee.emailAddress,
      phone: this.newEmployee.phone || undefined,
      role: this.newEmployee.role,
      specialization: this.newEmployee.specialization || undefined,
      department: this.newEmployee.department || undefined,
    }).subscribe({
      next: (res) => {
        this.store.isSaving.set(false);
        if (res.success) {
          this.resetNewForm();
          this.api.getEmployees().subscribe(r => { if (r.data) this.store.employees.set(r.data); });
          this.store.addToast('success', 'User Created', `${name} has been added to the registry. An invitation has been sent to their email.`);
          if (res.data?.setupUrl) {
            this.store.addToast('info', 'Secure Setup Link', res.data.setupUrl);
          }
        }
      },
      error: (err) => {
        this.store.isSaving.set(false);
        const msg = err?.error?.message || err?.message || '';
        if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('already registered')) {
          this.store.addToast('error', 'Duplicate Email', 'A user with this email address is already registered in the system. Please use a different email address.');
        } else if (msg.includes('validation') || msg.includes('required') || msg.includes('invalid')) {
          this.store.addToast('error', 'Invalid Input', 'Some of the information provided is not valid. Please check all fields and ensure the email format is correct before resubmitting.');
        } else {
          this.store.addToast('error', 'User Creation Failed', 'We were unable to create this user. This could be due to a network issue or a server error. Please try again. If the problem persists, contact IT support.');
        }
      },
    });
  }

  private createEmployeeWithPassword() {
    const name = `${this.newEmployee.firstName} ${this.newEmployee.lastName}`;
    this.store.isSaving.set(true);
    this.api.createEmployeeWithPassword({
      firstName: this.newEmployee.firstName,
      lastName: this.newEmployee.lastName,
      emailAddress: this.newEmployee.emailAddress,
      phone: this.newEmployee.phone || undefined,
      role: this.newEmployee.role,
      specialization: this.newEmployee.specialization || undefined,
      department: this.newEmployee.department || undefined,
      password: this.newEmployeePassword,
    }).subscribe({
      next: (res) => {
        this.store.isSaving.set(false);
        if (res.success) {
          this.resetNewForm();
          this.api.getEmployees().subscribe(r => { if (r.data) this.store.employees.set(r.data); });
          this.store.addToast('success', 'User Created', `${name} has been registered with a password. They can now sign in immediately.`);
        }
      },
      error: (err) => {
        this.store.isSaving.set(false);
        const msg = err?.error?.message || err?.message || '';
        if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('already registered')) {
          this.store.addToast('error', 'Duplicate Email', 'A user with this email address is already registered in the system. Please use a different email address.');
        } else if (msg.includes('validation') || msg.includes('required') || msg.includes('invalid') || msg.includes('password')) {
          this.store.addToast('error', 'Invalid Input', 'Some of the information provided is not valid. Please ensure the password is at least 8 characters and all fields are correct.');
        } else {
          this.store.addToast('error', 'User Creation Failed', 'We were unable to create this user. This could be due to a network issue or a server error. Please try again. If the problem persists, contact IT support.');
        }
      },
    });
  }

  resetNewForm() {
    this.isFormVisible.set(false);
    this.newEmployee = { firstName: '', lastName: '', emailAddress: '', phone: '', role: '', specialization: '', department: '' };
    this.newEmployeePassword = '';
    this.creationMode.set('invite');
  }
}
