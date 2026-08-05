import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ApiService } from '../../api.service';
import { AdminTab, RolePermission } from '../../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="grid gap-5">
      <div class="enterprise-panel p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-black text-slate-900">Administration Control Center</h2>
            <p class="text-sm text-slate-500">Create users, define roles, assign permissions, and maintain service departments.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary" type="button" [class.bg-brand-50]="adminTab() === 'users'" (click)="adminTab.set('users')">Users</button>
            <button class="btn-secondary" type="button" [class.bg-brand-50]="adminTab() === 'roles'" (click)="adminTab.set('roles')">Roles</button>
            <button class="btn-secondary" type="button" [class.bg-brand-50]="adminTab() === 'permissions'" (click)="adminTab.set('permissions')">Permissions</button>
            <button class="btn-secondary" type="button" [class.bg-brand-50]="adminTab() === 'departments'" (click)="adminTab.set('departments')">Departments</button>
            <button class="btn-secondary" type="button" [class.bg-brand-50]="adminTab() === 'emails'" (click)="adminTab.set('emails')">Email Outbox</button>
          </div>
        </div>
      </div>

      <!-- Admin Stats -->
      <section class="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
        <article *ngFor="let stat of store.adminStats()" class="enterprise-panel p-5">
          <span class="inline-flex rounded-lg px-3 py-1 text-xs font-black uppercase" [ngClass]="stat.tone">{{ stat.label }}</span>
          <strong class="mt-3 block text-3xl font-black text-slate-900">{{ stat.value }}</strong>
        </article>
      </section>

      <!-- Users Tab -->
      <section *ngIf="adminTab() === 'users'" class="enterprise-panel overflow-auto p-4">
        <div class="mb-3 flex justify-between gap-2 max-[700px]:flex-col">
          <strong class="text-sm text-slate-700">System Users</strong>
          <div class="flex gap-2">
            <button class="btn-primary" type="button" (click)="modal.set('employee')">New User</button>
            <button class="btn-secondary" (click)="store.exportExcel('employees', store.employees())">Excel</button>
            <button class="btn-secondary" (click)="store.printTable('employees', store.employees())">Print</button>
          </div>
        </div>
        <table class="data-table">
          <thead><tr><th>No</th><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Specialization</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.employees())">
              <td class="font-black">{{ row.employeeNo }}</td>
              <td>{{ row.firstName }} {{ row.lastName }}<br><span class="text-xs text-slate-500">{{ row.phone || '-' }}</span></td>
              <td>{{ row.emailAddress }}</td>
              <td><span class="badge badge-blue">{{ row.role }}</span></td>
              <td>{{ row.department || '-' }}</td>
              <td>{{ row.specialization || '-' }}</td>
              <td>
                <span class="badge" [class.badge-green]="row.isActive && row.passwordSetupCompleted">{{ !row.isActive ? 'Inactive' : row.passwordSetupCompleted ? 'Active' : 'Pending Setup' }}</span>
                <br><span class="text-xs text-slate-500" *ngIf="row.passwordSetupExpiresAtUtc">Expires {{ row.passwordSetupExpiresAtUtc | date:'short' }}</span>
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  <button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" [disabled]="store.saving()" (click)="resendInvite(row.id)">Send</button>
                  <button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" (click)="copyLatestEmailLink(row.emailAddress)">Copy Link</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Roles Tab -->
      <section *ngIf="adminTab() === 'roles'" class="grid gap-4">
        <div class="flex justify-end gap-2">
          <button class="btn-primary" type="button" (click)="modal.set('newRole')">New Role</button>
          <button class="btn-secondary" type="button" (click)="store.exportExcel('role-permissions', store.roles())">Excel</button>
          <button class="btn-secondary" type="button" (click)="store.printTable('role-permissions', store.roles())">Print</button>
        </div>
        <div class="grid grid-cols-3 gap-4 max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
          <article *ngFor="let role of store.roles()" class="enterprise-panel p-5">
            <div class="flex items-start justify-between gap-3">
              <div><span class="badge badge-blue">{{ role.role }}</span><h3 class="mt-3 text-base font-black text-slate-900">{{ role.description }}</h3></div>
              <strong class="rounded-lg bg-slate-100 px-3 py-2 text-sm">{{ role.userCount }} users</strong>
            </div>
            <div class="mt-4 flex flex-wrap gap-2"><span *ngFor="let p of role.permissions" class="badge">{{ p }}</span></div>
            <button class="btn-secondary mt-5 w-full" type="button" (click)="openRoleEditor(role)">Assign Permissions</button>
          </article>
        </div>
      </section>

      <!-- Permissions Tab -->
      <section *ngIf="adminTab() === 'permissions'" class="enterprise-panel overflow-auto p-4">
        <div class="mb-3 flex justify-between gap-2 max-[700px]:flex-col">
          <strong class="text-sm text-slate-700">Permission Dictionary</strong>
          <button class="btn-primary" type="button" (click)="modal.set('permission')">New Permission</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Key</th><th>Description</th><th>Module</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.permissions())">
              <td><span class="badge badge-blue">{{ row.key }}</span></td>
              <td>{{ row.description }}</td>
              <td>{{ row.module }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Departments Tab -->
      <section *ngIf="adminTab() === 'departments'" class="grid gap-4">
        <div class="flex justify-end"><button class="btn-primary" type="button" (click)="modal.set('department')">New Department</button></div>
        <div class="grid grid-cols-4 gap-4 max-[1200px]:grid-cols-2 max-[720px]:grid-cols-1">
          <article *ngFor="let dept of store.departments()" class="enterprise-panel p-5">
            <span class="badge badge-blue">{{ dept.code }}</span>
            <h3 class="mt-3 text-lg font-black text-slate-900">{{ dept.name }}</h3>
            <p class="text-sm text-slate-500">{{ dept.type }} | {{ dept.location }}</p>
            <strong class="mt-4 block text-2xl text-slate-900">{{ store.departmentStaffCount(dept.name) }}</strong>
            <span class="text-xs font-bold uppercase text-slate-500">assigned staff</span>
          </article>
        </div>
      </section>

      <!-- Emails Tab -->
      <section *ngIf="adminTab() === 'emails'" class="enterprise-panel overflow-auto p-4">
        <div class="mb-3 flex justify-between gap-2 max-[700px]:flex-col">
          <strong class="text-sm text-slate-700">Email Delivery Log</strong>
          <button class="btn-secondary" type="button" (click)="store.loadAll()">Refresh</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Recipient</th><th>Subject</th><th>Status</th><th>Created</th><th>Error</th><th>Link</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.emailOutbox()">
              <td>{{ row.recipient }}</td>
              <td>{{ row.subject }}</td>
              <td><span class="badge" [class.badge-green]="row.status === 'Sent'">{{ row.status }}</span></td>
              <td>{{ row.createdAtUtc | date:'short' }}</td>
              <td>{{ row.error || '-' }}</td>
              <td><button class="btn-secondary !min-h-8 !px-2 !py-1" *ngIf="row.setupUrl" type="button" (click)="store.copySetupUrl(row.setupUrl)">Copy</button></td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Modals -->
      <!-- Employee Modal -->
      <div *ngIf="modal() === 'employee'" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">New User</h2>
            <button class="btn-secondary" type="button" (click)="modal.set(null)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createEmployee()">
            <p class="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
              The user will receive a one-time password setup invitation.
            </p>
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">First Name<input class="field-control" name="efn" [(ngModel)]="employeeForm.firstName"></label>
              <label class="field-label">Last Name<input class="field-control" name="eln" [(ngModel)]="employeeForm.lastName"></label>
              <label class="field-label">Email<input class="field-control" name="eem" type="email" [(ngModel)]="employeeForm.emailAddress"></label>
              <label class="field-label">Phone<input class="field-control" name="ephone" [(ngModel)]="employeeForm.phone"></label>
              <label class="field-label">Role<select class="field-control" name="erole" [(ngModel)]="employeeForm.role"><option *ngFor="let role of store.roles()" [value]="role.role">{{ role.role }}</option></select></label>
              <label class="field-label">Department<select class="field-control" name="edepartment" [(ngModel)]="employeeForm.department"><option *ngFor="let dept of store.departments()" [value]="dept.name">{{ dept.name }}</option><option>Front Desk</option><option>Ward</option><option>Laboratory</option><option>Pharmacy</option><option>Finance</option></select></label>
              <label class="field-label col-span-2 max-[700px]:col-span-1">Specialization<input class="field-control" name="especialization" [(ngModel)]="employeeForm.specialization"></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Create User & Send Invitation</button>
          </form>
        </div>
      </div>

      <!-- Role Modal -->
      <div *ngIf="modal() === 'role'" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">Edit Role</h2>
            <button class="btn-secondary" type="button" (click)="modal.set(null)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="updateRole()">
            <div class="rounded-lg border border-brand-100 bg-brand-50 p-4">
              <span class="badge badge-blue">{{ roleForm.role }}</span>
              <p class="mt-2 text-sm text-slate-600">Edit the business meaning and comma-separated permission keys for this role.</p>
            </div>
            <label class="field-label">Description<input class="field-control" name="roleDescription" [(ngModel)]="roleForm.description"></label>
            <label class="field-label">Permissions<textarea class="field-control min-h-32" name="rolePermissions" [(ngModel)]="roleForm.permissionsText"></textarea></label>
            <button class="btn-primary" [disabled]="store.saving()">Update Role Permissions</button>
          </form>
        </div>
      </div>

      <!-- New Role Modal -->
      <div *ngIf="modal() === 'newRole'" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">New Role</h2>
            <button class="btn-secondary" type="button" (click)="modal.set(null)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createRole()">
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Role Key<input class="field-control" name="nrrole" [(ngModel)]="newRoleForm.role" placeholder="INSURANCE_MANAGER"></label>
              <label class="field-label">Description<input class="field-control" name="nrdesc" [(ngModel)]="newRoleForm.description"></label>
              <label class="field-label col-span-2 max-[700px]:col-span-1">Permissions<textarea class="field-control min-h-28" name="nrperms" [(ngModel)]="newRoleForm.permissionsText" placeholder="MANAGE_INSURANCE, VIEW_PATIENTS"></textarea></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Create Role</button>
          </form>
        </div>
      </div>

      <!-- Permission Modal -->
      <div *ngIf="modal() === 'permission'" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">New Permission</h2>
            <button class="btn-secondary" type="button" (click)="modal.set(null)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createPermission()">
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Permission Key<input class="field-control" name="pkey" [(ngModel)]="permissionForm.key" placeholder="APPROVE_CLAIMS"></label>
              <label class="field-label">Module<select class="field-control" name="pmod" [(ngModel)]="permissionForm.module"><option>Administration</option><option>Patient Management</option><option>Clinical</option><option>Billing</option></select></label>
              <label class="field-label col-span-2 max-[700px]:col-span-1">Description<input class="field-control" name="pdesc" [(ngModel)]="permissionForm.description"></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Save Permission</button>
          </form>
        </div>
      </div>

      <!-- Department Modal -->
      <div *ngIf="modal() === 'department'" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">New Department</h2>
            <button class="btn-secondary" type="button" (click)="modal.set(null)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createDepartment()">
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Code<input class="field-control" name="dcode" [(ngModel)]="departmentForm.code" placeholder="CARD"></label>
              <label class="field-label">Name<input class="field-control" name="dname" [(ngModel)]="departmentForm.name" placeholder="Cardiology"></label>
              <label class="field-label">Type<select class="field-control" name="dtype" [(ngModel)]="departmentForm.type"><option>Clinical</option><option>Administration</option><option>Support</option></select></label>
              <label class="field-label">Location<input class="field-control" name="dloc" [(ngModel)]="departmentForm.location"></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Save Department</button>
          </form>
        </div>
      </div>
    </section>
  `,
})
export class AdminComponent {
  adminTab = signal<AdminTab>('users');
  modal = signal<'role' | 'newRole' | 'permission' | 'department' | 'employee' | null>(null);

  employeeForm = { firstName: '', lastName: '', emailAddress: '', phone: '', role: 'DOCTOR', department: 'Outpatient', specialization: 'Internal Medicine' };
  roleForm = { role: '', description: '', permissionsText: '' };
  newRoleForm = { role: '', description: '', permissionsText: '' };
  permissionForm = { key: '', description: '', module: 'Administration' };
  departmentForm = { code: '', name: '', type: 'Clinical', location: 'Main Campus' };

  constructor(
    public store: StoreService,
    private api: ApiService
  ) {}

  createEmployee() {
    this.store.saving.set(true);
    this.store.createEmployee(this.employeeForm).subscribe({
      next: (res) => {
        this.store.saving.set(false);
        this.modal.set(null);
        this.store.toast('success', 'User created and password setup invitation prepared.');
        this.store.copySetupUrl(res.data.setupUrl);
        this.store.loadAll();
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'User creation failed.');
      },
    });
  }

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

  copyLatestEmailLink(email: string) {
    this.store.copyLatestEmailLink(email).subscribe({
      next: (res) => this.store.copySetupUrl(res.data.setupUrl),
      error: () => this.store.toast('error', 'No email setup link found for this user.'),
    });
  }

  openRoleEditor(role: RolePermission) {
    this.roleForm = { role: role.role, description: role.description, permissionsText: role.permissions.join(', ') };
    this.modal.set('role');
  }

  createRole() {
    const permissions = this.newRoleForm.permissionsText.split(',').map((p) => p.trim()).filter(Boolean);
    this.store.saving.set(true);
    this.store.createRole({ role: this.newRoleForm.role, description: this.newRoleForm.description, permissions }).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.modal.set(null);
        this.store.toast('success', 'Role created.');
        this.store.loadAll();
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'Role creation failed.');
      },
    });
  }

  updateRole() {
    const permissions = this.roleForm.permissionsText.split(',').map((p) => p.trim()).filter(Boolean);
    this.store.saving.set(true);
    this.store.updateRole(this.roleForm.role, { description: this.roleForm.description, permissions }).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.modal.set(null);
        this.store.toast('success', 'Role permissions updated.');
        this.store.loadAll();
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'Role update failed.');
      },
    });
  }

  createPermission() {
    this.store.saving.set(true);
    this.store.createPermission(this.permissionForm).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.modal.set(null);
        this.store.toast('success', 'Permission saved.');
        this.store.loadAll();
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'Permission creation failed.');
      },
    });
  }

  createDepartment() {
    this.store.saving.set(true);
    this.store.createDepartment(this.departmentForm).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.modal.set(null);
        this.store.toast('success', 'Department saved.');
        this.store.loadAll();
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'Department creation failed.');
      },
    });
  }
}
