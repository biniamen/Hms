export interface Employee {
  id: string;
  employeeNo: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phone?: string;
  role: string;
  permission: string;
  department?: string;
  specialization?: string;
  isActive: boolean;
  passwordSetupCompleted: boolean;
  invitationSentAtUtc?: string;
  passwordSetupExpiresAtUtc?: string;
}

export interface EmployeeInviteResponse {
  employee: Employee;
  setupUrl: string;
}

export interface RolePermission {
  role: string;
  description: string;
  permissions: string[];
  userCount: number;
}

export interface Permission {
  key: string;
  description: string;
  module: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
}

export interface DoctorProfile {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  department?: string;
  specialization?: string;
  queueToday: number;
  isActive: boolean;
}
