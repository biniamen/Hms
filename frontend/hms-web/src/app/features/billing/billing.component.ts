import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ApiService } from '../../api.service';
import { BillingTab } from '../../core/models';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="grid gap-4">
      <!-- Revenue Stats -->
      <div class="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
        <article class="enterprise-panel p-4"><span class="badge badge-blue">Billed</span><strong class="mt-3 block text-2xl text-slate-900">{{ store.totalBilled() | currency:'ETB' }}</strong></article>
        <article class="enterprise-panel p-4"><span class="badge badge-green">Collected</span><strong class="mt-3 block text-2xl text-slate-900">{{ store.totalCollected() | currency:'ETB' }}</strong></article>
        <article class="enterprise-panel p-4"><span class="badge">Open</span><strong class="mt-3 block text-2xl text-slate-900">{{ store.totalOpenBalance() | currency:'ETB' }}</strong></article>
        <article class="enterprise-panel p-4"><span class="badge">Receipts</span><strong class="mt-3 block text-2xl text-slate-900">{{ store.receipts().length }}</strong></article>
      </div>

      <!-- Tab Bar -->
      <div class="enterprise-panel p-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary" [class.bg-brand-50]="billingTab() === 'invoices'" (click)="billingTab.set('invoices')">Invoices</button>
            <button class="btn-secondary" [class.bg-brand-50]="billingTab() === 'payments'" (click)="billingTab.set('payments')">Payments</button>
            <button class="btn-secondary" [class.bg-brand-50]="billingTab() === 'receipts'" (click)="billingTab.set('receipts')">Receipts</button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-primary" type="button" (click)="modal.set('invoice')">Create Invoice</button>
            <button class="btn-secondary" type="button" (click)="modal.set('payment')">Collect Payment</button>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <div class="enterprise-panel overflow-auto p-4" [ngSwitch]="billingTab()">
        <div class="mb-3 flex justify-end gap-2">
          <button class="btn-secondary" (click)="store.exportExcel('billing-' + billingTab(), currentData())">Excel</button>
          <button class="btn-secondary" (click)="store.printTable('billing-' + billingTab(), currentData())">Print</button>
        </div>

        <!-- Invoices -->
        <table *ngSwitchCase="'invoices'" class="data-table">
          <thead><tr><th>Invoice</th><th>Patient</th><th>Description</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Due</th><th>Print</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.invoices())">
              <td class="font-black">{{ row.invoiceNumber }}</td>
              <td>{{ store.patientName(row.patientId) }}<br><span class="text-xs text-slate-500">{{ store.patientById(row.patientId)?.insuranceCompanyName || store.patientById(row.patientId)?.insuranceProvider || 'Self Pay' }}</span></td>
              <td>{{ row.description }}<br><span class="text-xs text-slate-500">{{ row.items.length }} line item(s)</span></td>
              <td>{{ row.total | currency:'ETB' }}</td>
              <td>{{ row.paid | currency:'ETB' }}</td>
              <td>{{ row.balance | currency:'ETB' }}</td>
              <td><span class="badge" [class.badge-green]="row.status === 'Paid'">{{ row.status }}</span></td>
              <td>{{ row.dueAtUtc | date:'shortDate' }}</td>
              <td><button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" (click)="store.printInvoice(row)">Invoice</button></td>
            </tr>
            <tr *ngIf="!store.invoices().length"><td colspan="9" class="text-center text-slate-500 py-8">No invoices created</td></tr>
          </tbody>
        </table>

        <!-- Payments -->
        <table *ngSwitchCase="'payments'" class="data-table">
          <thead><tr><th>Receipt</th><th>Invoice</th><th>Amount</th><th>Method</th><th>Reference</th><th>Received By</th><th>Paid At</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.payments())">
              <td class="font-black">{{ row.receiptNumber }}</td>
              <td>{{ store.invoiceFor(row.invoiceId)?.invoiceNumber }}</td>
              <td>{{ row.amount | currency:'ETB' }}</td>
              <td>{{ row.method }}</td>
              <td>{{ row.reference || '-' }}</td>
              <td>{{ row.receivedBy }}</td>
              <td>{{ row.paidAtUtc | date:'short' }}</td>
            </tr>
            <tr *ngIf="!store.payments().length"><td colspan="7" class="text-center text-slate-500 py-8">No payments recorded</td></tr>
          </tbody>
        </table>

        <!-- Receipts -->
        <table *ngSwitchCase="'receipts'" class="data-table">
          <thead><tr><th>Receipt</th><th>Invoice</th><th>Patient</th><th>Amount</th><th>Method</th><th>Balance After</th><th>Print</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.receipts())">
              <td class="font-black">{{ row.receiptNumber }}</td>
              <td>{{ row.invoiceNumber }}</td>
              <td>{{ store.patientName(row.patientId) }}</td>
              <td>{{ row.amount | currency:'ETB' }}</td>
              <td>{{ row.method }}</td>
              <td>{{ row.balanceAfterPayment | currency:'ETB' }}</td>
              <td><button class="btn-secondary !min-h-8 !px-2 !py-1" type="button" (click)="store.printReceipt(row)">Receipt</button></td>
            </tr>
            <tr *ngIf="!store.receipts().length"><td colspan="7" class="text-center text-slate-500 py-8">No receipts issued</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Invoice Modal -->
      <div *ngIf="modal() === 'invoice'" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">Create Invoice</h2>
            <button class="btn-secondary" type="button" (click)="modal.set(null)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createInvoice()">
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Patient<select class="field-control" name="invp" [(ngModel)]="invoiceForm.patientId"><option *ngFor="let p of store.patients()" [value]="p.id">{{ p.mrn }} - {{ p.firstName }} {{ p.lastName }}</option></select></label>
              <label class="field-label">Payment Type<select class="field-control" name="invpt" [(ngModel)]="invoiceForm.paymentType"><option>Cash</option><option>Insurance</option><option>Bank Transfer</option><option>Mobile Money</option></select></label>
              <label class="field-label">Service Code<input class="field-control" name="invsc" [(ngModel)]="invoiceForm.serviceCode" placeholder="CONS"></label>
              <label class="field-label">Service Desc<input class="field-control" name="invsd" [(ngModel)]="invoiceForm.serviceDescription" placeholder="General consultation"></label>
              <label class="field-label">Quantity<input class="field-control" name="invq" type="number" min="1" [(ngModel)]="invoiceForm.quantity"></label>
              <label class="field-label">Unit Price<input class="field-control" name="invup" type="number" min="0" [(ngModel)]="invoiceForm.unitPrice"></label>
              <label class="field-label">Line Discount<input class="field-control" name="invld" type="number" min="0" [(ngModel)]="invoiceForm.lineDiscount"></label>
              <label class="field-label">Invoice Discount<input class="field-control" name="invd" type="number" min="0" [(ngModel)]="invoiceForm.discount"></label>
              <label class="field-label">Tax<input class="field-control" name="invtax" type="number" min="0" [(ngModel)]="invoiceForm.tax"></label>
              <label class="field-label">Insurance Provider<select class="field-control" name="invins" [(ngModel)]="invoiceForm.insuranceProvider"><option value="">None</option><option *ngFor="let c of store.insuranceCompanies()" [value]="c.name">{{ c.name }}</option></select></label>
              <label class="field-label col-span-2">Description<input class="field-control" name="invdesc" [(ngModel)]="invoiceForm.description"></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Create Invoice</button>
          </form>
        </div>
      </div>

      <!-- Payment Modal -->
      <div *ngIf="modal() === 'payment'" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(600px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">Record Payment</h2>
            <button class="btn-secondary" type="button" (click)="modal.set(null)">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="recordPayment()">
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">Invoice<select class="field-control" name="payinv" [(ngModel)]="paymentForm.invoiceId" (ngModelChange)="onInvoiceChange()"><option *ngFor="let inv of unpaidInvoices()" [value]="inv.id">{{ inv.invoiceNumber }} - {{ store.patientName(inv.patientId) }} - Balance: {{ inv.balance | currency:'ETB' }}</option></select></label>
              <label class="field-label">Amount<input class="field-control" name="payamt" type="number" min="0" step="0.01" [(ngModel)]="paymentForm.amount"></label>
              <label class="field-label">Method<select class="field-control" name="paym" [(ngModel)]="paymentForm.method"><option>Cash</option><option>Bank Transfer</option><option>Mobile Money</option><option>Insurance</option></select></label>
              <label class="field-label">Reference<input class="field-control" name="payref" [(ngModel)]="paymentForm.reference"></label>
              <label class="field-label">Received By<input class="field-control" name="payrb" [(ngModel)]="paymentForm.receivedBy"></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Record Payment</button>
          </form>
        </div>
      </div>
    </section>
  `,
})
export class BillingComponent {
  billingTab = signal<BillingTab>('invoices');
  modal = signal<'invoice' | 'payment' | null>(null);

  invoiceForm = {
    patientId: '', description: 'Outpatient service invoice', serviceCode: 'CONS',
    serviceDescription: 'General consultation', quantity: 1, unitPrice: 350,
    lineDiscount: 0, discount: 0, tax: 0, paymentType: 'Cash', insuranceProvider: '',
  };

  paymentForm = { invoiceId: '', amount: 0, method: 'Cash', reference: '', receivedBy: 'Cashier' };

  constructor(
    public store: StoreService,
    private api: ApiService
  ) {}

  currentData() {
    switch (this.billingTab()) {
      case 'invoices': return this.store.invoices();
      case 'payments': return this.store.payments();
      case 'receipts': return this.store.receipts();
    }
  }

  unpaidInvoices() {
    return this.store.invoices().filter((i) => i.balance > 0);
  }

  onInvoiceChange() {
    const inv = this.store.invoiceFor(this.paymentForm.invoiceId);
    if (inv) this.paymentForm.amount = inv.balance;
  }

  createInvoice() {
    const item = {
      serviceCode: this.invoiceForm.serviceCode,
      description: this.invoiceForm.serviceDescription,
      quantity: Number(this.invoiceForm.quantity),
      unitPrice: Number(this.invoiceForm.unitPrice),
      discount: Number(this.invoiceForm.lineDiscount),
    };
    const amount = Math.max(0, item.quantity * item.unitPrice - item.discount);

    this.store.saving.set(true);
    this.store.createInvoice({
      patientId: this.invoiceForm.patientId,
      description: this.invoiceForm.description,
      amount,
      discount: Number(this.invoiceForm.discount),
      tax: Number(this.invoiceForm.tax),
      paymentType: this.invoiceForm.paymentType,
      insuranceProvider: this.invoiceForm.insuranceProvider,
      items: [item],
    }).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.modal.set(null);
        this.store.toast('success', 'Invoice created.');
        this.store.loadAll();
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'Invoice creation failed.');
      },
    });
  }

  recordPayment() {
    this.store.saving.set(true);
    this.store.recordPayment(this.paymentForm).subscribe({
      next: (res) => {
        this.store.saving.set(false);
        this.modal.set(null);
        this.store.toast('success', 'Payment recorded and receipt prepared.');
        this.store.loadAll();
        setTimeout(() => this.store.printReceipt(res.data), 250);
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'Payment failed.');
      },
    });
  }
}
