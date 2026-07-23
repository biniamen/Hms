import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_BASE_URL } from '../../core/api/api.config';
import { ApiResponse } from '../../core/api/api-response.model';
import { Invoice, Payment, Receipt } from './billing.models';

@Injectable({ providedIn: 'root' })
export class BillingApiService {
  constructor(private http: HttpClient) {}

  getInvoices() {
    return this.http.get<ApiResponse<Invoice[]>>(`${API_BASE_URL}/api/billing/invoices`);
  }

  createInvoice(payload: {
    patientId: string;
    description: string;
    amount: number;
    discount: number;
    tax: number;
    paymentType: string;
    insuranceProvider?: string;
    items?: Array<{ serviceCode: string; description: string; quantity: number; unitPrice: number; discount: number }>;
  }) {
    return this.http.post<ApiResponse<Invoice>>(`${API_BASE_URL}/api/billing/invoices`, payload);
  }

  updateInvoiceStatus(id: string, status: string) {
    return this.http.put<ApiResponse<Invoice>>(`${API_BASE_URL}/api/billing/invoices/${id}/status`, { status });
  }

  getPayments() {
    return this.http.get<ApiResponse<Payment[]>>(`${API_BASE_URL}/api/billing/payments`);
  }

  getReceipts() {
    return this.http.get<ApiResponse<Receipt[]>>(`${API_BASE_URL}/api/billing/receipts`);
  }

  recordPayment(payload: { invoiceId: string; amount: number; method: string; reference?: string; receivedBy?: string }) {
    return this.http.post<ApiResponse<Receipt>>(`${API_BASE_URL}/api/billing/payments`, payload);
  }
}
