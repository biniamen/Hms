export interface LoginResponse {
  accessToken: string;
  employeeId: string;
  emailAddress: string;
  role: string;
  permission: string;
}

export interface PasswordResetResponse {
  accepted: boolean;
  setupUrl?: string;
}

export interface EmailOutboxMessage {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  createdAtUtc: string;
  sentAtUtc?: string;
  error?: string;
  setupUrl?: string;
}
