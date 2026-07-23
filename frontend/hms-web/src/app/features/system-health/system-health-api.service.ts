import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_BASE_URL } from '../../core/api/api.config';
import { ServiceStatus } from './system-health.models';

@Injectable({ providedIn: 'root' })
export class SystemHealthApiService {
  constructor(private http: HttpClient) {}

  getServiceStatuses() {
    return this.http.get<ServiceStatus[]>(`${API_BASE_URL}/api/operations/services`);
  }

  startService(id: string) {
    return this.http.post<{ message: string; url: string }>(`${API_BASE_URL}/api/operations/services/${id}/start`, {});
  }
}
