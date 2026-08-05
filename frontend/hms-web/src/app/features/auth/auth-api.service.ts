import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { API_BASE_URL } from '../../core/api/api.config';
import { ApiResponse } from '../../core/api/api-response.model';
import { EmailOutboxMessage, LoginResponse, PasswordResetResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  readonly session = signal<LoginResponse | null>(null);

  constructor(private http: HttpClient) {
    const savedSession = localStorage.getItem('hms_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession) as LoginResponse;
        this.session.set(session);
        localStorage.setItem('hms_access_token', session.accessToken);
      } catch {
        this.clearSession();
      }
    }
  }

  storeSession(session: LoginResponse) {
    this.session.set(session);
    localStorage.setItem('hms_session', JSON.stringify(session));
    localStorage.setItem('hms_access_token', session.accessToken);
  }

  clearSession() {
    this.session.set(null);
    localStorage.removeItem('hms_session');
    localStorage.removeItem('hms_access_token');
  }

  login(emailAddress: string, password: string) {
    return this.http.post<ApiResponse<LoginResponse>>(`${API_BASE_URL}/api/auth/login`, {
      emailAddress,
      password,
    });
  }

  setupPassword(payload: { token: string; password: string }) {
    return this.http.post<ApiResponse<unknown>>(`${API_BASE_URL}/api/auth/setup-password`, payload);
  }

  forgotPassword(emailAddress: string) {
    return this.http.post<ApiResponse<PasswordResetResponse>>(`${API_BASE_URL}/api/auth/forgot-password`, { emailAddress });
  }

  getEmailOutbox(recipient?: string) {
    const query = recipient ? `?recipient=${encodeURIComponent(recipient)}` : '';
    return this.http.get<ApiResponse<EmailOutboxMessage[]>>(`${API_BASE_URL}/api/auth/email-outbox${query}`);
  }

  getLatestEmailLink(recipient: string) {
    return this.http.get<ApiResponse<{ setupUrl: string }>>(`${API_BASE_URL}/api/auth/email-outbox/latest-link?recipient=${encodeURIComponent(recipient)}`);
  }
}
