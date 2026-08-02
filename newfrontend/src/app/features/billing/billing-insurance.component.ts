import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ApiService } from '../../api.service';
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

        <div class="flex flex-wrap gap-2 self-start sm:self-auto">
          <button 
            (click)="openInsuranceModal()" 
            class="px-4 py-2.5 bg-white text-blue-700 font-semibold rounded-xl text-xs shadow-sm border border-blue-100 flex items-center gap-2 hover:bg-blue-50">
            <span class="material-icons text-base">verified_user</span>
            <span>Register Insurance</span>
          </button>
          <button 
            (click)="openInvoiceModal()" 
            class="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 flex items-center gap-2">
            <span class="material-icons text-base">post_add</span>
            <span>Generate New Invoice</span>
          </button>
        </div>
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

      <!-- INSURANCE COMPANY MAINTENANCE -->
      <div class="bg-white rounded-2xl border border-slate-200/80 subtle-shadow overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/40">
          <div>
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">Insurance Company Maintenance</h3>
            <p class="text-[11px] text-slate-500 mt-1">Registered payers used during patient intake, claims, and invoice settlement.</p>
          </div>
          <span class="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700 ring-1 ring-blue-100">{{ store.insuranceCompanies().length }} Payers</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr><th class="py-3.5 px-4">Company</th><th class="py-3.5 px-4">Payer Code</th><th class="py-3.5 px-4">Contact</th><th class="py-3.5 px-4">Coverage</th><th class="py-3.5 px-4">Spouse Service</th><th class="py-3.5 px-4">Status</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (company of store.insuranceCompanies(); track company.id) {
                <tr class="hover:bg-slate-50/80">
                  <td class="py-3.5 px-4">
                    <div class="font-black text-slate-900">{{ company.name }}</div>
                    <div class="text-[10px] text-slate-400">{{ company.address || 'Address not recorded' }}</div>
                  </td>
                  <td class="py-3.5 px-4 font-mono font-black text-blue-700">{{ company.payerCode }}</td>
                  <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-700">{{ company.contactPerson || 'Claims desk' }}</div>
                    <div class="text-[10px] text-slate-400">{{ company.phone }} • {{ company.email }}</div>
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">{{ company.coverageType }} / {{ company.coveragePercent }}%</span>
                  </td>
                  <td class="py-3.5 px-4">
                    <span [class]="company.spouseCoverageAllowed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'" class="rounded-full border px-2.5 py-1 text-[9px] font-black uppercase">
                      {{ company.spouseCoverageAllowed ? 'Allowed' : 'Not Covered' }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4">
                    <span [class]="company.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'" class="rounded-full border px-2.5 py-1 text-[9px] font-black uppercase">
                      {{ company.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="py-14 text-center text-xs font-bold text-slate-400">No insurance companies registered yet.</td></tr>
              }
            </tbody>
          </table>
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
                    <div class="font-bold text-slate-900">{{ store.patientDisplayName(inv.patientId) }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ store.patientMrn(inv.patientId) }}</div>
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
                      <button (click)="printInvoice(inv)" class="px-2.5 py-1 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-lg text-[10px] shadow-xs">
                        Print
                      </button>
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
        <div class="fixed inset-0  z-50 flex items-center justify-center p-4 animate-fade-in">
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
                <p class="text-xs text-slate-400">{{ selectedInvForPayment()?.invoiceNumber }} for {{ store.patientDisplayName(selectedInvForPayment()?.patientId || '') }}</p>
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

      <!-- INSURANCE COMPANY MODAL -->
      @if (isInsuranceModalOpen()) {
        <div class="fixed inset-0 bg-slate-900/30 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scale-up space-y-6">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 class="text-base font-bold text-slate-900 font-display">Register Insurance Company</h3>
                <p class="text-xs text-slate-400">Create payer profile, coverage rule, and spouse eligibility.</p>
              </div>
              <button (click)="closeInsuranceModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <span class="material-icons">close</span>
              </button>
            </div>

            <form [formGroup]="insuranceForm" (ngSubmit)="submitInsuranceCompany()" class="space-y-4 text-xs">
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label class="space-y-1">
                  <span class="block text-xs font-semibold uppercase text-slate-600">Company Name *</span>
                  <input formControlName="name" class="w-full px-3 py-2 border rounded-xl text-xs" placeholder="EthioLife Corporate Insurance" />
                </label>
                <label class="space-y-1">
                  <span class="block text-xs font-semibold uppercase text-slate-600">Payer Code *</span>
                  <input formControlName="payerCode" class="w-full px-3 py-2 border rounded-xl text-xs font-mono uppercase" placeholder="ELIFE" />
                </label>
                <label class="space-y-1">
                  <span class="block text-xs font-semibold uppercase text-slate-600">Contact Person</span>
                  <input formControlName="contactPerson" class="w-full px-3 py-2 border rounded-xl text-xs" placeholder="Claims desk" />
                </label>
                <label class="space-y-1">
                  <span class="block text-xs font-semibold uppercase text-slate-600">Phone *</span>
                  <input formControlName="phone" class="w-full px-3 py-2 border rounded-xl text-xs" placeholder="0911000000" />
                </label>
                <label class="space-y-1">
                  <span class="block text-xs font-semibold uppercase text-slate-600">Email</span>
                  <input formControlName="email" type="email" class="w-full px-3 py-2 border rounded-xl text-xs" placeholder="claims@payer.com" />
                </label>
                <label class="space-y-1">
                  <span class="block text-xs font-semibold uppercase text-slate-600">Coverage Type *</span>
                  <select formControlName="coverageType" class="w-full px-3 py-2 border rounded-xl text-xs">
                    <option>Corporate</option>
                    <option>Employer Fund</option>
                    <option>Community</option>
                    <option>Private</option>
                    <option>Government</option>
                  </select>
                </label>
                <label class="space-y-1">
                  <span class="block text-xs font-semibold uppercase text-slate-600">Coverage Percent *</span>
                  <input formControlName="coveragePercent" type="number" min="0" max="100" class="w-full px-3 py-2 border rounded-xl text-xs font-mono" />
                </label>
                <label class="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 font-bold text-blue-800">
                  <input formControlName="spouseCoverageAllowed" type="checkbox" class="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500" />
                  Spouse can receive covered service
                </label>
              </div>
              <label class="block space-y-1">
                <span class="block text-xs font-semibold uppercase text-slate-600">Address</span>
                <textarea formControlName="address" rows="3" class="w-full px-3 py-2 border rounded-xl text-xs" placeholder="Office address"></textarea>
              </label>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" (click)="closeInsuranceModal()" class="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20">Save Insurance Company</button>
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
  private api = inject(ApiService);

  isInvoiceModalOpen = signal(false);
  isInsuranceModalOpen = signal(false);
  selectedInvForPayment = signal<BillingInvoice | null>(null);

  invForm = new FormGroup({
    patientId: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.required]),
    totalAmount: new FormControl(500, [Validators.required]),
    insuranceCovered: new FormControl(400)
  });

  payForm = new FormGroup({
    amount: new FormControl(100, [Validators.required]),
    method: new FormControl<'Credit Card' | 'Cash' | 'Insurance Direct' | 'Wire Transfer'>('Credit Card', [Validators.required])
  });

  insuranceForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    payerCode: new FormControl('', [Validators.required, Validators.minLength(2)]),
    contactPerson: new FormControl(''),
    phone: new FormControl('', [Validators.required, Validators.minLength(9)]),
    email: new FormControl('', [Validators.email]),
    address: new FormControl(''),
    coverageType: new FormControl('Corporate', [Validators.required]),
    coveragePercent: new FormControl(80, [Validators.required, Validators.min(0), Validators.max(100)]),
    spouseCoverageAllowed: new FormControl(false),
  });

  constructor() {
    this.store.loadInsuranceCompanies();
  }

  openInsuranceModal() {
    this.isInsuranceModalOpen.set(true);
  }

  closeInsuranceModal() {
    this.isInsuranceModalOpen.set(false);
    this.insuranceForm.reset({
      name: '',
      payerCode: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      coverageType: 'Corporate',
      coveragePercent: 80,
      spouseCoverageAllowed: false,
    });
  }

  submitInsuranceCompany() {
    if (this.insuranceForm.invalid) {
      this.insuranceForm.markAllAsTouched();
      this.store.addToast('error', 'Insurance Validation', 'Company name, payer code, phone, coverage type, and coverage percent are required.');
      return;
    }

    const val = this.insuranceForm.getRawValue();
    this.api.createInsuranceCompany({
      name: val.name || '',
      payerCode: (val.payerCode || '').toUpperCase(),
      contactPerson: val.contactPerson || '',
      phone: val.phone || '',
      email: val.email || '',
      address: val.address || '',
      coverageType: val.coverageType || 'Corporate',
      coveragePercent: Number(val.coveragePercent || 0),
      spouseCoverageAllowed: !!val.spouseCoverageAllowed,
    }).subscribe({
      next: () => {
        this.store.loadInsuranceCompanies();
        this.closeInsuranceModal();
        this.store.addToast('success', 'Insurance Company Saved', 'The payer profile is now available during patient registration.');
      },
      error: () => this.store.addToast('error', 'Insurance Save Failed', 'Unable to save this insurance company. Check duplicate payer code and try again.'),
    });
  }

  openInvoiceModal() {
    this.invForm.patchValue({ patientId: this.store.patients()[0]?.id || '' });
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
    this.invForm.reset({
      patientId: this.store.patients()[0]?.id || '',
      description: '',
      totalAmount: 500,
      insuranceCovered: 400,
    });
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

  printInvoice(inv: BillingInvoice) {
    const printedAt = new Date().toLocaleString();
    const documentNo = `INV-${Date.now().toString().slice(-8)}`;
    const patientName = this.store.patientDisplayName(inv.patientId);
    const patientMrn = this.store.patientMrn(inv.patientId);
    const rows = inv.items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.escapeHtml(item.id)}</td>
        <td>${this.escapeHtml(item.description)}</td>
        <td>${this.escapeHtml(item.category)}</td>
        <td>${this.escapeHtml(inv.date)}</td>
        <td class="num">${item.amount.toFixed(2)}</td>
        <td class="num">1</td>
        <td class="num">${item.amount.toFixed(2)}</td>
      </tr>
    `).join('');
    const balance = inv.totalAmount - inv.insuranceCoveredAmount - inv.patientPaidAmount;
    const popup = window.open('', '_blank', 'width=980,height=760');
    if (!popup) return;
    popup.document.write(`
      <html>
      <head>
        <title>${this.escapeHtml(inv.invoiceNumber)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #e5e7eb; font-family: Arial, sans-serif; color: #111827; }
          .page { position: relative; width: 210mm; min-height: 297mm; margin: 18px auto; background: white; padding: 16mm; box-shadow: 0 18px 50px rgba(15,23,42,.18); overflow: hidden; }
          .watermark { position: absolute; top: 42%; left: 7%; transform: rotate(-35deg); font-size: 110px; font-weight: 900; color: rgba(15,118,110,.06); letter-spacing: .12em; }
          .doc-header { position: relative; display: grid; grid-template-columns: 1fr 150px; border: 2px solid #111827; }
          .hospital { padding: 12px; text-align: center; border-right: 2px solid #111827; }
          .hospital h2 { margin: 0; font-size: 17px; letter-spacing: .08em; }
          .hospital p { margin: 4px 0 0; font-size: 10px; color: #475569; }
          .doc-box { padding: 10px; text-align: center; font-size: 10px; }
          .barcode { margin: 6px auto 2px; height: 28px; width: 96px; background: repeating-linear-gradient(90deg, #111827 0 2px, transparent 2px 5px, #111827 5px 6px, transparent 6px 9px); }
          .title-row { display: grid; grid-template-columns: 1fr 160px; border: 2px solid #111827; border-top: 0; }
          .title-row div { padding: 8px 12px; font-size: 12px; }
          h1 { text-align: center; font-size: 18px; margin: 18px 0 12px; text-transform: uppercase; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 12px 0; font-size: 12px; }
          .line { display: grid; grid-template-columns: 120px 1fr; border-bottom: 1px solid #94a3b8; padding: 4px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 14px; position: relative; z-index: 1; }
          th, td { border: 1px solid #cbd5e1; padding: 7px; text-align: left; }
          th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; }
          .num { text-align: right; font-family: Consolas, monospace; }
          .totals { margin-left: auto; margin-top: 14px; width: 330px; font-size: 12px; }
          .totals div { display: grid; grid-template-columns: 1fr 120px; border-bottom: 1px solid #cbd5e1; padding: 5px 0; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 72px; font-size: 12px; }
          .sign-line { border-top: 1px solid #111827; padding-top: 8px; }
          @media print { body { background: white; } .page { margin: 0; box-shadow: none; width: auto; min-height: auto; } }
        </style>
      </head>
      <body>
        <section class="page">
          <div class="watermark">${inv.status === 'PAID' ? 'PAID' : 'INVOICE'}</div>
          <div class="doc-header">
            <div class="hospital">
              <h2>BETHZATHA GENERAL HOSPITAL</h2>
              <p>Addis Ababa, Ethiopia | Tel: +251-115-535980 | info@bethzatha.com</p>
            </div>
            <div class="doc-box">Document No<div class="barcode"></div><strong>${documentNo}</strong></div>
          </div>
          <div class="title-row">
            <div><strong>Document Title:</strong> Cash Invoice Attachment</div>
            <div><strong>Revision:</strong> 0<br><strong>Page:</strong> 1 of 1</div>
          </div>
          <h1>${inv.status === 'PAID' ? 'Cash Receipt Attachment' : 'Cash Invoice Attachment'}</h1>
          <div class="meta">
            <div>
              <div class="line"><strong>Bill To</strong><span>${this.escapeHtml(patientName)}</span></div>
              <div class="line"><strong>Patient Name</strong><span>${this.escapeHtml(patientName)}</span></div>
              <div class="line"><strong>MRN</strong><span>${this.escapeHtml(patientMrn)}</span></div>
              <div class="line"><strong>Status</strong><span>${this.escapeHtml(inv.status)}</span></div>
            </div>
            <div>
              <div class="line"><strong>Bill Date</strong><span>${this.escapeHtml(inv.date)}</span></div>
              <div class="line"><strong>Printed</strong><span>${this.escapeHtml(printedAt)}</span></div>
              <div class="line"><strong>Bill No</strong><span>${this.escapeHtml(documentNo)}</span></div>
              <div class="line"><strong>Invoice No</strong><span>${this.escapeHtml(inv.invoiceNumber)}</span></div>
            </div>
          </div>
          <table>
            <thead><tr><th>No</th><th>Code</th><th>Description</th><th>Service Type</th><th>Date</th><th>Price</th><th>Unit</th><th>Total</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="totals">
            <div><strong>Sub Total</strong><span class="num">${inv.totalAmount.toFixed(2)}</span></div>
            <div><strong>Insurance Covered</strong><span class="num">${inv.insuranceCoveredAmount.toFixed(2)}</span></div>
            <div><strong>Patient Paid</strong><span class="num">${inv.patientPaidAmount.toFixed(2)}</span></div>
            <div><strong>Balance</strong><span class="num">${Math.max(balance, 0).toFixed(2)}</span></div>
          </div>
          <div class="signatures">
            <div class="sign-line">Cashier / Billing Officer</div>
            <div class="sign-line">${this.escapeHtml(patientName)}</div>
          </div>
        </section>
      </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
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

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
