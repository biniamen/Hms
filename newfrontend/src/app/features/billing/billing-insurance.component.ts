import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { BillingInvoice } from '../../core/models';

@Component({
  selector: 'app-billing-insurance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- HEADER BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 font-display">Hospital Billing, Claims & Insurance</h1>
          <p class="text-xs text-slate-500 mt-1">Itemized clinical charges, copay collection, and third-party insurance claims</p>
        </div>

        <button 
          (click)="openInvoiceModal()" 
          class="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 self-start sm:self-auto">
          <span class="material-icons text-base">post_add</span>
          <span>Generate New Invoice</span>
        </button>
      </div>

      <!-- SUMMARY TILES STRIP -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 subtle-shadow">
          <div class="text-xs font-semibold text-slate-500 uppercase">Outstanding Receivables</div>
          <div class="text-2xl font-black font-display text-slate-900 mt-1">
            &#36;{{ store.unpaidInvoicesTotal().toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </div>
          <div class="text-[10px] text-amber-600 font-semibold mt-1">Self-pay & Copays due</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 subtle-shadow">
          <div class="text-xs font-semibold text-slate-500 uppercase">Active Insurance Claims</div>
          <div class="text-2xl font-black font-display text-slate-900 mt-1">
            {{ store.insuranceClaims().length }}
          </div>
          <div class="text-[10px] text-blue-600 font-semibold mt-1">Claims submitted to payers</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 subtle-shadow">
          <div class="text-xs font-semibold text-slate-500 uppercase">Settled This Month</div>
          <div class="text-2xl font-black font-display text-emerald-600 mt-1">
            &#36;3,650.00
          </div>
          <div class="text-[10px] text-emerald-600 font-semibold mt-1">Cleared transactions</div>
        </div>
      </div>

      <!-- INVOICES TABLE -->
      <div class="bg-white rounded-2xl border border-slate-200/80 subtle-shadow overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">Patient Invoices</h3>
          <span class="text-xs text-slate-500">{{ store.billingInvoices().length }} Billing Records</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Invoice # / Date</th>
                <th class="py-3.5 px-4">Patient / MRN</th>
                <th class="py-3.5 px-4">Itemized Breakdown</th>
                <th class="py-3.5 px-4">Total Charge</th>
                <th class="py-3.5 px-4">Insurance Covered</th>
                <th class="py-3.5 px-4">Patient Paid</th>
                <th class="py-3.5 px-4">Status</th>
                <th class="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (inv of store.billingInvoices(); track inv.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4 font-mono">
                    <div class="font-bold text-slate-900">{{ inv.invoiceNumber }}</div>
                    <div class="text-[10px] text-slate-400">Date: {{ inv.date }}</div>
                  </td>

                  <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-900">{{ inv.patientName }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ inv.patientMrn }}</div>
                  </td>

                  <td class="py-3.5 px-4">
                    <div class="text-[11px] text-slate-700">
                      @for (item of inv.items; track item.id) {
                        <div>• {{ item.description }} (&#36;{{ item.amount }})</div>
                      }
                    </div>
                  </td>

                  <td class="py-3.5 px-4 font-bold text-slate-900 font-mono">
                    &#36;{{ inv.totalAmount.toFixed(2) }}
                  </td>

                  <td class="py-3.5 px-4 font-bold text-blue-700 font-mono">
                    &#36;{{ inv.insuranceCoveredAmount.toFixed(2) }}
                  </td>

                  <td class="py-3.5 px-4 font-bold text-emerald-700 font-mono">
                    &#36;{{ inv.patientPaidAmount.toFixed(2) }}
                  </td>

                  <td class="py-3.5 px-4">
                    <span [class]="getInvoiceStatusClass(inv.status)" class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border">
                      {{ inv.status }}
                    </span>
                  </td>

                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      @if (inv.status !== 'PAID') {
                        <button (click)="openPayModal(inv)" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] shadow-xs">
                          Record Payment
                        </button>
                      }
                      @if (inv.status === 'UNPAID' && inv.insuranceCoveredAmount > 0) {
                        <button (click)="store.submitInsuranceClaim(inv.id)" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] shadow-xs">
                          Submit Claim
                        </button>
                      }
                    </div>
                  </td>

                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- INSURANCE CLAIMS MONITOR PANEL -->
      <div class="bg-white rounded-2xl border border-slate-200/80 subtle-shadow p-5 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 class="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
              <span class="material-icons text-blue-600 text-lg">verified_user</span>
              Active Third-Party Insurance Claims
            </h3>
            <p class="text-xs text-slate-500">Real-time claim status tracking with BlueCross, Aetna, Cigna, Medicare</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (claim of store.insuranceClaims(); track claim.id) {
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-900 font-mono">{{ claim.claimNumber }}</span>
                <span [class]="getClaimStatusClass(claim.status)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                  {{ claim.status }}
                </span>
              </div>
              <div class="font-semibold text-slate-800">{{ claim.patientName }} ({{ claim.patientMrn }})</div>
              <div class="text-slate-500 text-[11px]">Provider: {{ claim.provider }} • Policy: {{ claim.policyNumber }}</div>
              <div class="flex items-center justify-between pt-2 border-t border-slate-200/60 font-mono font-bold">
                <span>Claimed: &#36;{{ claim.claimAmount.toFixed(2) }}</span>
                @if (claim.approvedAmount) {
                  <span class="text-emerald-700">Approved: &#36;{{ claim.approvedAmount.toFixed(2) }}</span>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- GENERATE INVOICE MODAL -->
      @if (isInvoiceModalOpen()) {
        <div class="fixed inset-0 bg-slate-900/30 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scale-up space-y-6">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 class="text-base font-bold text-slate-900 font-display">Generate Clinical Invoice</h3>
              <button (click)="closeInvoiceModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="invForm" (ngSubmit)="submitInvoice()" class="space-y-4 text-xs">
              <div>
                <label for="inv-patient-id" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Select Patient *</label>
                <select id="inv-patient-id" formControlName="patientId" class="w-full px-3 py-2 border rounded-xl text-xs">
                  @for (p of store.patients(); track p.id) {
                    <option [value]="p.id">{{ p.name }} ({{ p.mrn }})</option>
                  }
                </select>
              </div>

              <div>
                <label for="inv-desc" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Charge Description *</label>
                <input id="inv-desc" type="text" formControlName="description" placeholder="e.g. Specialty Consultation & Emergency Diagnostic" class="w-full px-3 py-2 border rounded-xl text-xs" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="inv-total" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Total Amount ($) *</label>
                  <input id="inv-total" type="number" formControlName="totalAmount" placeholder="450.00" class="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
                <div>
                  <label for="inv-covered" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Insurance Covered ($)</label>
                  <input id="inv-covered" type="number" formControlName="insuranceCovered" placeholder="360.00" class="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" (click)="closeInvoiceModal()" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20">Create Invoice</button>
              </div>
            </form>

          </div>
        </div>
      }

      <!-- PAYMENT RECORD MODAL -->
      @if (selectedInvForPayment()) {
        <div class="fixed inset-0 bg-slate-900/30 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scale-up space-y-6">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 class="text-base font-bold text-slate-900 font-display">Record Patient Payment</h3>
                <p class="text-xs text-slate-400">{{ selectedInvForPayment()?.invoiceNumber }} for {{ selectedInvForPayment()?.patientName }}</p>
              </div>
              <button (click)="selectedInvForPayment.set(null)" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="payForm" (ngSubmit)="submitPayment()" class="space-y-4 text-xs">
              
              <div>
                <label for="pay-amount" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Payment Amount ($) *</label>
                <input id="pay-amount" type="number" formControlName="amount" class="w-full px-3 py-2 border rounded-xl font-bold font-mono text-sm text-emerald-700" />
              </div>

              <div>
                <label for="pay-method" class="block text-xs font-semibold uppercase text-slate-600 mb-1">Payment Method *</label>
                <select id="pay-method" formControlName="method" class="w-full px-3 py-2 border rounded-xl text-xs">
                  <option value="Credit Card">Credit Card / POS Terminal</option>
                  <option value="Cash">Cash at Register</option>
                  <option value="Insurance Direct">Insurance Payer Wire</option>
                  <option value="Wire Transfer">Bank Electronic Transfer</option>
                </select>
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" (click)="selectedInvForPayment.set(null)" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md shadow-emerald-500/20">Process Payment</button>
              </div>

            </form>

          </div>
        </div>
      }

    </div>
  `
})
export class BillingInsuranceComponent {
  store = inject(StoreService);

  isInvoiceModalOpen = signal(false);
  selectedInvForPayment = signal<BillingInvoice | null>(null);

  invForm = new FormGroup({
    patientId: new FormControl('p-1', [Validators.required]),
    description: new FormControl('', [Validators.required]),
    totalAmount: new FormControl(500, [Validators.required]),
    insuranceCovered: new FormControl(400)
  });

  payForm = new FormGroup({
    amount: new FormControl(100, [Validators.required]),
    method: new FormControl<'Credit Card' | 'Cash' | 'Insurance Direct' | 'Wire Transfer'>('Credit Card', [Validators.required])
  });

  openInvoiceModal() {
    this.isInvoiceModalOpen.set(true);
  }

  closeInvoiceModal() {
    this.isInvoiceModalOpen.set(false);
  }

  submitInvoice() {
    if (this.invForm.invalid) {
      this.invForm.markAllAsTouched();
      return;
    }

    const val = this.invForm.value;
    const patient = this.store.patients().find(p => p.id === val.patientId);

    if (patient) {
      this.store.addBillingInvoice({
        patientId: patient.id,
        patientName: patient.name,
        patientMrn: patient.mrn,
        dueDate: '2026-08-30',
        totalAmount: Number(val.totalAmount),
        insuranceCoveredAmount: Number(val.insuranceCovered || 0),
        items: [{
          id: 'i-' + Date.now(),
          description: val.description!,
          category: 'Consultation',
          amount: Number(val.totalAmount)
        }]
      });
    }

    this.closeInvoiceModal();
    this.invForm.reset();
  }

  openPayModal(inv: BillingInvoice) {
    this.selectedInvForPayment.set(inv);
    const due = inv.totalAmount - inv.insuranceCoveredAmount - inv.patientPaidAmount;
    this.payForm.patchValue({ amount: Math.max(due, 0) });
  }

  submitPayment() {
    const inv = this.selectedInvForPayment();
    if (!inv || this.payForm.invalid) return;

    const val = this.payForm.value;
    const methodVal = (val.method || 'Credit Card') as 'Credit Card' | 'Cash' | 'Insurance Direct' | 'Wire Transfer';
    this.store.payInvoice(inv.id, Number(val.amount), methodVal);
    this.selectedInvForPayment.set(null);
  }

  getInvoiceStatusClass(status: string): string {
    switch (status) {
      case 'UNPAID': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'PARTIALLY_PAID': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PAID': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'INSURANCE_PENDING': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  getClaimStatusClass(status: string): string {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'UNDER_REVIEW': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  }
}
