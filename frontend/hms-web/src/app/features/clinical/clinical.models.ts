export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  medication: string;
  instructions: string;
  orderedAtUtc: string;
}

export interface ClinicalEncounter {
  id: string;
  patientId: string;
  doctorId: string;
  visitType: string;
  chiefComplaint: string;
  assessment: string;
  plan: string;
  encounterAtUtc: string;
}

export interface VitalSign {
  id: string;
  patientId: string;
  temperatureC: number;
  pulse: number;
  respiratoryRate: number;
  bloodPressure: string;
  weightKg: number;
  heightCm: number;
  recordedAtUtc: string;
}

export interface Diagnosis {
  id: string;
  patientId: string;
  doctorId: string;
  code: string;
  description: string;
  severity: string;
  diagnosedAtUtc: string;
}

export interface LabRequest {
  id: string;
  patientId: string;
  doctorId: string;
  testName: string;
  status: string;
  orderedAtUtc: string;
  category: string;
  priority: string;
  specimenType: string;
  clinicalNote: string;
  resultSummary: string;
  resultValue: string;
  referenceRange: string;
  resultFlag: string;
  resultNotes: string;
  performedBy: string;
  verifiedBy: string;
  collectedAtUtc?: string | null;
  resultedAtUtc?: string | null;
  updatedAtUtc: string;
}

export interface EnterpriseRecord {
  id: string;
  area: string;
  recordNumber: string;
  patientId?: string;
  title: string;
  department: string;
  owner: string;
  priority: string;
  status: string;
  amount: number;
  dueAtUtc: string;
  details: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}
