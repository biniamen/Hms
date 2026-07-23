export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  description: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  status: string;
  dueAtUtc: string;
  createdAtUtc: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  serviceCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  receiptNumber: string;
  amount: number;
  method: string;
  reference?: string;
  receivedBy: string;
  paidAtUtc: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  invoiceNumber: string;
  invoiceId: string;
  patientId: string;
  amount: number;
  method: string;
  reference?: string;
  receivedBy: string;
  paidAtUtc: string;
  balanceAfterPayment: number;
}
