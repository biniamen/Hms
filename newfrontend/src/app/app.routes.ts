import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./features/layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'patients', loadComponent: () => import('./features/patients/patients.component').then(m => m.PatientsComponent) },
      { path: 'appointments', loadComponent: () => import('./features/appointments/appointments.component').then(m => m.AppointmentsComponent) },
      {
        path: 'clinical-ehr',
        loadComponent: () => import('./features/clinical-ehr/clinical-ehr.component').then(m => m.ClinicalEhrComponent),
        canActivate: [roleGuard],
        data: { roles: ['DOCTOR', 'NURSE', 'ADMIN'] },
        children: [
          { path: 'encounter', loadComponent: () => import('./features/clinical-ehr/encounter-page.component').then(m => m.EncounterPageComponent) },
          { path: 'vitals', loadComponent: () => import('./features/clinical-ehr/vitals-page.component').then(m => m.VitalsPageComponent) },
          { path: 'diagnosis', loadComponent: () => import('./features/clinical-ehr/diagnosis-page.component').then(m => m.DiagnosisPageComponent) },
          { path: 'prescription', loadComponent: () => import('./features/clinical-ehr/prescription-page.component').then(m => m.PrescriptionPageComponent) },
          { path: 'lab-order', loadComponent: () => import('./features/clinical-ehr/lab-order-page.component').then(m => m.LabOrderPageComponent) },
        ]
      },
      { path: 'pharmacy', loadComponent: () => import('./features/pharmacy/pharmacy.component').then(m => m.PharmacyComponent), canActivate: [roleGuard], data: { roles: ['PHARMACIST', 'DOCTOR', 'NURSE', 'ADMIN'] } },
      { path: 'laboratory', loadComponent: () => import('./features/laboratory/laboratory.component').then(m => m.LaboratoryComponent), canActivate: [roleGuard], data: { roles: ['LAB_TECHNICIAN', 'DOCTOR', 'ADMIN'] } },
      { path: 'laboratory/record-result', loadComponent: () => import('./features/laboratory/record-result-page.component').then(m => m.RecordResultPageComponent), canActivate: [roleGuard], data: { roles: ['LAB_TECHNICIAN', 'DOCTOR', 'ADMIN'] } },
      { path: 'billing', loadComponent: () => import('./features/billing/billing-insurance.component').then(m => m.BillingInsuranceComponent), canActivate: [roleGuard], data: { roles: ['ACCOUNTANT', 'CASHIER', 'ADMIN', 'RECEPTIONIST'] } },
      { path: 'doctor-pricing', loadComponent: () => import('./features/billing/doctor-pricing.component').then(m => m.DoctorPricingComponent), canActivate: [roleGuard], data: { roles: ['ACCOUNTANT', 'ADMIN'] } },
      { path: 'wards-beds', loadComponent: () => import('./features/wards/wards-beds.component').then(m => m.WardsBedsComponent), canActivate: [roleGuard], data: { roles: ['NURSE', 'DOCTOR', 'ADMIN', 'RECEPTIONIST'] } },
      { path: 'staff', loadComponent: () => import('./features/staff/doctors-staff.component').then(m => m.DoctorsStaffComponent), canActivate: [roleGuard], data: { roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'HR_MANAGER'] } },
      { path: 'admin', loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent), canActivate: [roleGuard], data: { roles: ['ADMIN'] } },
      { path: 'operations', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), canActivate: [roleGuard], data: { roles: ['ADMIN'] } },
      { path: 'enterprise', loadComponent: () => import('./features/enterprise/enterprise.component').then(m => m.EnterpriseComponent), canActivate: [roleGuard], data: { roles: ['ADMIN'] } },
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
