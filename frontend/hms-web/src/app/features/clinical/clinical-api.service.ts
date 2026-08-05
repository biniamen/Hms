import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiResponse } from '../../core/api/api-response.model';
import {
  ClinicalEncounter,
  Diagnosis,
  EnterpriseRecord,
  LabRequest,
  Prescription,
  VitalSign,
} from './clinical.models';
import { API_BASE_URL } from '../../core/api/api.config';

@Injectable({ providedIn: 'root' })
export class ClinicalApiService {
  constructor(private http: HttpClient) {}

  getPrescriptions() {
    return this.http.get<ApiResponse<Prescription[]>>(`${API_BASE_URL}/api/clinical/prescriptions`);
  }

  getEncounters() {
    return this.http.get<ApiResponse<ClinicalEncounter[]>>(`${API_BASE_URL}/api/clinical/encounters`);
  }

  createEncounter(payload: {
    patientId: string;
    doctorId: string;
    visitType: string;
    chiefComplaint: string;
    assessment: string;
    plan: string;
  }) {
    return this.http.post<ApiResponse<ClinicalEncounter>>(`${API_BASE_URL}/api/clinical/encounters`, payload);
  }

  getVitals() {
    return this.http.get<ApiResponse<VitalSign[]>>(`${API_BASE_URL}/api/clinical/vitals`);
  }

  createVitals(payload: {
    patientId: string;
    temperatureC: number;
    pulse: number;
    respiratoryRate: number;
    bloodPressure: string;
    weightKg: number;
    heightCm: number;
  }) {
    return this.http.post<ApiResponse<VitalSign>>(`${API_BASE_URL}/api/clinical/vitals`, payload);
  }

  getDiagnoses() {
    return this.http.get<ApiResponse<Diagnosis[]>>(`${API_BASE_URL}/api/clinical/diagnoses`);
  }

  createDiagnosis(payload: { patientId: string; doctorId: string; code: string; description: string; severity: string }) {
    return this.http.post<ApiResponse<Diagnosis>>(`${API_BASE_URL}/api/clinical/diagnoses`, payload);
  }

  createPrescription(payload: { patientId: string; doctorId: string; medication: string; instructions: string }) {
    return this.http.post<ApiResponse<Prescription>>(`${API_BASE_URL}/api/clinical/prescriptions`, payload);
  }

  getLabRequests() {
    return this.http.get<ApiResponse<LabRequest[]>>(`${API_BASE_URL}/api/clinical/lab-requests`);
  }

  createLabRequest(payload: {
    patientId: string;
    doctorId: string;
    testName: string;
    category?: string;
    priority?: string;
    specimenType?: string;
    clinicalNote?: string;
  }) {
    return this.http.post<ApiResponse<LabRequest>>(`${API_BASE_URL}/api/clinical/lab-requests`, payload);
  }

  updateLabResult(id: string, payload: {
    status: string;
    specimenType?: string;
    resultSummary?: string;
    resultValue?: string;
    referenceRange?: string;
    resultFlag?: string;
    resultNotes?: string;
    performedBy?: string;
    verifiedBy?: string;
    collectedAtUtc?: string | null;
    resultedAtUtc?: string | null;
  }) {
    return this.http.put<ApiResponse<LabRequest>>(`${API_BASE_URL}/api/clinical/lab-requests/${id}/result`, payload);
  }

  getEnterpriseRecords() {
    return this.http.get<ApiResponse<EnterpriseRecord[]>>(`${API_BASE_URL}/api/clinical/enterprise-records`);
  }

  createEnterpriseRecord(payload: Partial<EnterpriseRecord>) {
    return this.http.post<ApiResponse<EnterpriseRecord>>(`${API_BASE_URL}/api/clinical/enterprise-records`, payload);
  }

  updateEnterpriseRecord(id: string, payload: Partial<EnterpriseRecord>) {
    return this.http.put<ApiResponse<EnterpriseRecord>>(`${API_BASE_URL}/api/clinical/enterprise-records/${id}`, payload);
  }

  updateEnterpriseRecordStatus(id: string, status: string) {
    return this.http.put<ApiResponse<EnterpriseRecord>>(`${API_BASE_URL}/api/clinical/enterprise-records/${id}/status`, { status });
  }
}
