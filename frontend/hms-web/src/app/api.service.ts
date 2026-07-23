import { Injectable } from '@angular/core';
import { AccessControlApiService, EmployeePayload } from './features/access-control/access-control-api.service';
import { AuthApiService } from './features/auth/auth-api.service';
import { BillingApiService } from './features/billing/billing-api.service';
import { ClinicalApiService } from './features/clinical/clinical-api.service';
import { EnterpriseRecord } from './features/clinical/clinical.models';
import { AppointmentPayload, PatientManagementApiService } from './features/patients/patient-management-api.service';
import { Patient } from './features/patients/patient-management.models';
import { SystemHealthApiService } from './features/system-health/system-health-api.service';

export * from './core/api/api-response.model';
export * from './features/access-control/access-control.models';
export * from './features/auth/auth.models';
export * from './features/billing/billing.models';
export * from './features/clinical/clinical.models';
export * from './features/patients/patient-management.models';
export * from './features/system-health/system-health.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(
    private auth: AuthApiService,
    private accessControl: AccessControlApiService,
    private patientManagement: PatientManagementApiService,
    private clinical: ClinicalApiService,
    private billing: BillingApiService,
    private systemHealth: SystemHealthApiService,
  ) {}

  get session() {
    return this.auth.session;
  }

  storeSession(...args: Parameters<AuthApiService['storeSession']>) {
    return this.auth.storeSession(...args);
  }

  clearSession() {
    return this.auth.clearSession();
  }

  login(...args: Parameters<AuthApiService['login']>) {
    return this.auth.login(...args);
  }

  setupPassword(...args: Parameters<AuthApiService['setupPassword']>) {
    return this.auth.setupPassword(...args);
  }

  forgotPassword(...args: Parameters<AuthApiService['forgotPassword']>) {
    return this.auth.forgotPassword(...args);
  }

  getEmailOutbox(...args: Parameters<AuthApiService['getEmailOutbox']>) {
    return this.auth.getEmailOutbox(...args);
  }

  getLatestEmailLink(...args: Parameters<AuthApiService['getLatestEmailLink']>) {
    return this.auth.getLatestEmailLink(...args);
  }

  getEmployees() {
    return this.accessControl.getEmployees();
  }

  createEmployee(payload: EmployeePayload) {
    return this.accessControl.createEmployee(payload);
  }

  updateEmployee(id: string, payload: EmployeePayload) {
    return this.accessControl.updateEmployee(id, payload);
  }

  updateEmployeeStatus(...args: Parameters<AccessControlApiService['updateEmployeeStatus']>) {
    return this.accessControl.updateEmployeeStatus(...args);
  }

  resendEmployeeInvite(...args: Parameters<AccessControlApiService['resendEmployeeInvite']>) {
    return this.accessControl.resendEmployeeInvite(...args);
  }

  getRoles() {
    return this.accessControl.getRoles();
  }

  createRole(...args: Parameters<AccessControlApiService['createRole']>) {
    return this.accessControl.createRole(...args);
  }

  updateRole(...args: Parameters<AccessControlApiService['updateRole']>) {
    return this.accessControl.updateRole(...args);
  }

  getPermissions() {
    return this.accessControl.getPermissions();
  }

  createPermission(...args: Parameters<AccessControlApiService['createPermission']>) {
    return this.accessControl.createPermission(...args);
  }

  getDepartments() {
    return this.accessControl.getDepartments();
  }

  createDepartment(...args: Parameters<AccessControlApiService['createDepartment']>) {
    return this.accessControl.createDepartment(...args);
  }

  getDoctors() {
    return this.accessControl.getDoctors();
  }

  getPatients() {
    return this.patientManagement.getPatients();
  }

  createPatient(payload: Omit<Patient, 'id' | 'mrn'>) {
    return this.patientManagement.createPatient(payload);
  }

  updatePatient(id: string, payload: Omit<Patient, 'id' | 'mrn'>) {
    return this.patientManagement.updatePatient(id, payload);
  }

  getInsuranceCompanies() {
    return this.patientManagement.getInsuranceCompanies();
  }

  createInsuranceCompany(...args: Parameters<PatientManagementApiService['createInsuranceCompany']>) {
    return this.patientManagement.createInsuranceCompany(...args);
  }

  getAppointments() {
    return this.patientManagement.getAppointments();
  }

  createAppointment(payload: AppointmentPayload) {
    return this.patientManagement.createAppointment(payload);
  }

  getQueueSummary() {
    return this.patientManagement.getQueueSummary();
  }

  updateAppointmentStatus(...args: Parameters<PatientManagementApiService['updateAppointmentStatus']>) {
    return this.patientManagement.updateAppointmentStatus(...args);
  }

  getBeds() {
    return this.patientManagement.getBeds();
  }

  getPrescriptions() {
    return this.clinical.getPrescriptions();
  }

  getEncounters() {
    return this.clinical.getEncounters();
  }

  createEncounter(...args: Parameters<ClinicalApiService['createEncounter']>) {
    return this.clinical.createEncounter(...args);
  }

  getVitals() {
    return this.clinical.getVitals();
  }

  createVitals(...args: Parameters<ClinicalApiService['createVitals']>) {
    return this.clinical.createVitals(...args);
  }

  getDiagnoses() {
    return this.clinical.getDiagnoses();
  }

  createDiagnosis(...args: Parameters<ClinicalApiService['createDiagnosis']>) {
    return this.clinical.createDiagnosis(...args);
  }

  createPrescription(...args: Parameters<ClinicalApiService['createPrescription']>) {
    return this.clinical.createPrescription(...args);
  }

  getLabRequests() {
    return this.clinical.getLabRequests();
  }

  createLabRequest(...args: Parameters<ClinicalApiService['createLabRequest']>) {
    return this.clinical.createLabRequest(...args);
  }

  updateLabResult(...args: Parameters<ClinicalApiService['updateLabResult']>) {
    return this.clinical.updateLabResult(...args);
  }

  getEnterpriseRecords() {
    return this.clinical.getEnterpriseRecords();
  }

  createEnterpriseRecord(payload: Partial<EnterpriseRecord>) {
    return this.clinical.createEnterpriseRecord(payload);
  }

  updateEnterpriseRecord(id: string, payload: Partial<EnterpriseRecord>) {
    return this.clinical.updateEnterpriseRecord(id, payload);
  }

  updateEnterpriseRecordStatus(...args: Parameters<ClinicalApiService['updateEnterpriseRecordStatus']>) {
    return this.clinical.updateEnterpriseRecordStatus(...args);
  }

  getInvoices() {
    return this.billing.getInvoices();
  }

  createInvoice(...args: Parameters<BillingApiService['createInvoice']>) {
    return this.billing.createInvoice(...args);
  }

  updateInvoiceStatus(...args: Parameters<BillingApiService['updateInvoiceStatus']>) {
    return this.billing.updateInvoiceStatus(...args);
  }

  getPayments() {
    return this.billing.getPayments();
  }

  getReceipts() {
    return this.billing.getReceipts();
  }

  recordPayment(...args: Parameters<BillingApiService['recordPayment']>) {
    return this.billing.recordPayment(...args);
  }

  getServiceStatuses() {
    return this.systemHealth.getServiceStatuses();
  }

  startService(...args: Parameters<SystemHealthApiService['startService']>) {
    return this.systemHealth.startService(...args);
  }
}
