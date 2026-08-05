import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiResponse } from '../../core/api/api-response.model';
import {
  Department,
  DoctorProfile,
  Employee,
  EmployeeInviteResponse,
  Permission,
  RolePermission,
} from './access-control.models';
import { API_BASE_URL } from '../../core/api/api.config';

export interface EmployeePayload {
  firstName: string;
  lastName: string;
  emailAddress: string;
  phone?: string;
  role: string;
  department?: string;
  specialization?: string;
}

@Injectable({ providedIn: 'root' })
export class AccessControlApiService {
  constructor(private http: HttpClient) {}

  getEmployees() {
    return this.http.get<ApiResponse<Employee[]>>(`${API_BASE_URL}/api/employees`);
  }

  createEmployee(payload: EmployeePayload) {
    return this.http.post<ApiResponse<EmployeeInviteResponse>>(`${API_BASE_URL}/api/employees`, payload);
  }

  updateEmployee(id: string, payload: EmployeePayload) {
    return this.http.put<ApiResponse<Employee>>(`${API_BASE_URL}/api/employees/${id}`, payload);
  }

  updateEmployeeStatus(id: string, isActive: boolean) {
    return this.http.put<ApiResponse<Employee>>(`${API_BASE_URL}/api/employees/${id}/status`, { isActive });
  }

  resendEmployeeInvite(id: string) {
    return this.http.post<ApiResponse<EmployeeInviteResponse>>(`${API_BASE_URL}/api/employees/${id}/invite`, {});
  }

  getRoles() {
    return this.http.get<ApiResponse<RolePermission[]>>(`${API_BASE_URL}/api/roles`);
  }

  createRole(payload: { role: string; description: string; permissions: string[] }) {
    return this.http.post<ApiResponse<RolePermission>>(`${API_BASE_URL}/api/roles`, payload);
  }

  updateRole(role: string, payload: { description: string; permissions: string[] }) {
    return this.http.put<ApiResponse<RolePermission>>(`${API_BASE_URL}/api/roles/${role}`, payload);
  }

  getPermissions() {
    return this.http.get<ApiResponse<Permission[]>>(`${API_BASE_URL}/api/permissions`);
  }

  createPermission(payload: { key: string; description: string; module: string }) {
    return this.http.post<ApiResponse<Permission>>(`${API_BASE_URL}/api/permissions`, payload);
  }

  getDepartments() {
    return this.http.get<ApiResponse<Department[]>>(`${API_BASE_URL}/api/departments`);
  }

  createDepartment(payload: { code: string; name: string; type: string; location: string }) {
    return this.http.post<ApiResponse<Department>>(`${API_BASE_URL}/api/departments`, payload);
  }

  getDoctors() {
    return this.http.get<ApiResponse<DoctorProfile[]>>(`${API_BASE_URL}/api/doctors`);
  }
}
