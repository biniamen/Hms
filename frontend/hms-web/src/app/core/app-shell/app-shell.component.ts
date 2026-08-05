import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardPageComponent } from '../../features/dashboard/dashboard-page/dashboard-page.component';
import { SystemHealthPageComponent } from '../../features/system-health/system-health-page/system-health-page.component';
import { AccessControlPageComponent } from '../../features/access-control/access-control-page/access-control-page.component';
import { OperationsWorkbenchPageComponent } from '../../features/operations-workbench/operations-workbench-page/operations-workbench-page.component';
import { StaffDirectoryPageComponent } from '../../features/staff-directory/staff-directory-page/staff-directory-page.component';
import { PatientsPageComponent } from '../../features/patients/patients-page/patients-page.component';
import { InsurancePageComponent } from '../../features/insurance/insurance-page/insurance-page.component';
import { AppointmentsPageComponent } from '../../features/appointments/appointments-page/appointments-page.component';
import { ClinicalPageComponent } from '../../features/clinical/clinical-page/clinical-page.component';
import { BillingPageComponent } from '../../features/billing/billing-page/billing-page.component';

@Component({
  selector: 'hms-app-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardPageComponent,
    SystemHealthPageComponent,
    AccessControlPageComponent,
    OperationsWorkbenchPageComponent,
    StaffDirectoryPageComponent,
    PatientsPageComponent,
    InsurancePageComponent,
    AppointmentsPageComponent,
    ClinicalPageComponent,
    BillingPageComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  @Input({ required: true }) vm!: any;
  @Input({ required: true }) user!: any;
}

