import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'setup-password', loadComponent: () => import('./features/auth/setup-password.component').then((m) => m.SetupPasswordComponent) },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent) },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        canActivate: [roleGuard(['ALL'])],
      },
      {
        path: 'operations',
        loadComponent: () => import('./features/operations/operations.component').then((m) => m.OperationsComponent),
        canActivate: [roleGuard(['ADMIN'])],
      },
      {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent),
        canActivate: [roleGuard(['ADMIN'])],
      },
      {
        path: 'employees',
        loadComponent: () => import('./features/employees/employees.component').then((m) => m.EmployeesComponent),
        canActivate: [roleGuard(['ADMIN', 'HR_MANAGER'])],
      },
      {
        path: 'patients',
        loadComponent: () => import('./features/patients/patients.component').then((m) => m.PatientsComponent),
        canActivate: [roleGuard(['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'])],
      },
      {
        path: 'insurance',
        loadComponent: () => import('./features/insurance/insurance.component').then((m) => m.InsuranceComponent),
        canActivate: [roleGuard(['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'])],
      },
      {
        path: 'appointments',
        loadComponent: () => import('./features/appointments/appointments.component').then((m) => m.AppointmentsComponent),
        canActivate: [roleGuard(['ADMIN', 'RECEPTIONIST', 'DOCTOR'])],
      },
      {
        path: 'clinical',
        loadComponent: () => import('./features/clinical/clinical.component').then((m) => m.ClinicalComponent),
        canActivate: [roleGuard(['ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'PHARMACIST'])],
      },
      {
        path: 'billing',
        loadComponent: () => import('./features/billing/billing.component').then((m) => m.BillingComponent),
        canActivate: [roleGuard(['ADMIN', 'ACCOUNTANT', 'CASHIER'])],
      },
      {
        path: 'enterprise',
        loadComponent: () => import('./features/enterprise/enterprise.component').then((m) => m.EnterpriseComponent),
        canActivate: [roleGuard(['ADMIN'])],
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
