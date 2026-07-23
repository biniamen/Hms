export interface InsuranceCompany {
  id: string;
  name: string;
  payerCode: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  coverageType: string;
  coveragePercent: number;
  isActive: boolean;
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  nationalId?: string;
  maritalStatus?: string;
  occupation?: string;
  address?: string;
  bloodType?: string;
  insuranceCompanyId?: string;
  insuranceCompanyName?: string;
  employerName?: string;
  insurancePlan?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  photoDataUrl?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  startsAtUtc: string;
  status: string;
  reason: string;
  department: string;
  appointmentType: string;
  priority: string;
  notes?: string;
  queueNumber: number;
  waitingAhead: number;
  queueStatus: string;
}

export interface QueueSummary {
  doctorId: string;
  doctorName: string;
  department: string;
  scheduled: number;
  waiting: number;
  inService: number;
  completed: number;
}

export interface Bed {
  id: string;
  ward: string;
  room: string;
  bedNumber: string;
  isAvailable: boolean;
}
