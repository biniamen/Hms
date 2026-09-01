import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';
import { ApiService } from '../../api.service';
import { BackendDoctorProfile, BackendDoctorServicePrice } from '../../core/models';
import { StoreService } from '../../core/services/store.service';

interface DoctorServiceType {
  code: string;
  name: string;
  icon: string;
  defaultValidityDays: number;
}

@Component({
  selector: 'app-doctor-pricing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="font-display text-xl font-bold text-slate-900 sm:text-2xl">Doctor Service Pricing</h1>
          <p class="mt-1 text-xs text-slate-500">Maintain consultation charges for each doctor and visit type.</p>
        </div>
        <div class="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800">
          {{ configuredCount() }} of {{ totalPriceSlots() }} prices configured
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4 subtle-shadow">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
          <label class="relative">
            <span class="material-icons absolute left-3 top-2.5 text-lg text-slate-400">search</span>
            <input
              type="search"
              [value]="searchText()"
              (input)="setSearch($event)"
              placeholder="Search doctor, department, or specialization"
              class="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-xs outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <select
            [value]="serviceFilter()"
            (change)="setServiceFilter($event)"
            class="rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
            <option value="ALL">All service types</option>
            @for (service of serviceTypes; track service.code) {
              <option [value]="service.code">{{ service.name }}</option>
            }
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div class="text-center text-slate-500">
            <span class="material-icons animate-spin text-3xl text-teal-600">progress_activity</span>
            <p class="mt-2 text-xs font-semibold">Loading doctor prices...</p>
          </div>
        </div>
      } @else if (visibleDoctors().length === 0) {
        <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span class="material-icons text-4xl text-slate-300">person_search</span>
          <p class="mt-2 text-sm font-semibold text-slate-700">No doctors match your search.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
          @for (doctor of visibleDoctors(); track doctor.id) {
            <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white subtle-shadow">
              <div class="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 p-5">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <span class="material-icons">medical_services</span>
                </div>
                <div class="min-w-0 flex-1">
                  <h2 class="truncate text-sm font-bold text-slate-900">Dr. {{ doctor.firstName }} {{ doctor.lastName }}</h2>
                  <p class="truncate text-xs font-semibold text-teal-700">{{ doctor.specialization || 'General Medicine' }}</p>
                  <p class="mt-0.5 truncate text-[10px] text-slate-400">{{ doctor.department || 'Clinical Department' }}</p>
                </div>
                <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">ACTIVE</span>
              </div>

              <div class="divide-y divide-slate-100">
                @for (service of filteredServiceTypes(); track service.code) {
                  @let price = findPrice(doctor.id, service.code);
                  <div class="flex items-center gap-3 p-4 transition hover:bg-slate-50/80">
                    <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <span class="material-icons text-lg">{{ service.icon }}</span>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-bold text-slate-800">{{ service.name }}</p>
                      @if (price) {
                        <p class="mt-0.5 text-[10px]" [class]="price.isActive ? 'text-emerald-600' : 'text-amber-600'">
                          {{ price.isActive ? 'Available for billing' : 'Inactive price' }} - valid {{ price.validityDays }} days
                        </p>
                      } @else {
                        <p class="mt-0.5 text-[10px] text-rose-600">Price not configured</p>
                      }
                    </div>
                    <div class="text-right">
                      @if (price) {
                        <p class="font-mono text-sm font-black text-slate-900">{{ price.amount | number:'1.2-2' }} {{ price.currency }}</p>
                      } @else {
                        <p class="text-xs font-semibold text-slate-400">—</p>
                      }
                      <button
                        type="button"
                        (click)="openEditor(doctor, service, price)"
                        class="mt-1 text-[10px] font-bold text-teal-700 hover:text-teal-600">
                        {{ price ? 'Edit price' : 'Set price' }}
                      </button>
                    </div>
                  </div>
                }
              </div>
            </section>
          }
        </div>
      }

      @if (editorOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-scale-up">
            <div class="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 class="font-display text-base font-bold text-slate-900">Set Doctor Price</h3>
                <p class="mt-1 text-xs text-slate-500">{{ selectedDoctorName() }} · {{ selectedServiceName() }}</p>
              </div>
              <button type="button" (click)="closeEditor()" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <span class="material-icons text-lg">close</span>
              </button>
            </div>

            <form [formGroup]="priceForm" (ngSubmit)="savePrice()" class="mt-5 space-y-4">
              <div>
                <label for="doctor-price-amount" class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">Price amount *</label>
                <input
                  id="doctor-price-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  formControlName="amount"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                @if (priceForm.controls.amount.touched && priceForm.controls.amount.invalid) {
                  <p class="mt-1 text-[10px] font-medium text-rose-600">Enter a price greater than zero.</p>
                }
              </div>

              <div>
                <label for="doctor-price-currency" class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">Currency *</label>
                <select id="doctor-price-currency" formControlName="currency" class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
                  <option value="ETB">ETB - Ethiopian Birr</option>
                </select>
              </div>

              <div>
                <label for="doctor-price-validity" class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">Validity days *</label>
                <input
                  id="doctor-price-validity"
                  type="number"
                  min="1"
                  max="365"
                  formControlName="validityDays"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <p class="mt-1 text-[10px] font-medium text-slate-500">Returning patients do not pay again for the same doctor before this window ends.</p>
                @if (priceForm.controls.validityDays.touched && priceForm.controls.validityDays.invalid) {
                  <p class="mt-1 text-[10px] font-medium text-rose-600">Enter a validity window between 1 and 365 days.</p>
                }
              </div>

              <label class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span>
                  <span class="block text-xs font-bold text-slate-800">Active for billing</span>
                  <span class="block text-[10px] text-slate-500">Inactive prices cannot be returned by the quote endpoint.</span>
                </span>
                <input type="checkbox" formControlName="isActive" class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              </label>

              <div class="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" (click)="closeEditor()" class="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" [disabled]="saving()" class="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-500/20 hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60">
                  {{ saving() ? 'Saving...' : 'Save Price' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class DoctorPricingComponent {
  private readonly api = inject(ApiService);
  private readonly store = inject(StoreService);

  readonly serviceTypes: DoctorServiceType[] = [
    { code: 'CONSULTATION', name: 'Consultation', icon: 'stethoscope', defaultValidityDays: 10 },
    { code: 'FOLLOW_UP', name: 'Follow-up Visit', icon: 'event_repeat', defaultValidityDays: 15 },
    { code: 'EMERGENCY', name: 'Emergency Consultation', icon: 'emergency', defaultValidityDays: 1 },
  ];

  readonly doctors = signal<BackendDoctorProfile[]>([]);
  readonly prices = signal<BackendDoctorServicePrice[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly searchText = signal('');
  readonly serviceFilter = signal('ALL');
  readonly editorOpen = signal(false);
  readonly selectedDoctorId = signal('');
  readonly selectedDoctorName = signal('');
  readonly selectedServiceCode = signal('');
  readonly selectedServiceName = signal('');

  readonly priceForm = new FormGroup({
    amount: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0.01)] }),
    currency: new FormControl('ETB', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[A-Z]{3}$/)] }),
    validityDays: new FormControl(10, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(365)] }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  readonly visibleDoctors = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    if (!query) return this.doctors();
    return this.doctors().filter(doctor =>
      `${doctor.firstName} ${doctor.lastName} ${doctor.department || ''} ${doctor.specialization || ''}`
        .toLowerCase()
        .includes(query)
    );
  });

  readonly filteredServiceTypes = computed(() => {
    const selected = this.serviceFilter();
    return selected === 'ALL' ? this.serviceTypes : this.serviceTypes.filter(service => service.code === selected);
  });

  readonly configuredCount = computed(() => this.prices().length);
  readonly totalPriceSlots = computed(() => this.doctors().length * this.serviceTypes.length);

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    forkJoin({
      doctors: this.api.getDoctors(),
      prices: this.api.getDoctorPrices(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.doctors.set(response.doctors.data ?? []);
          this.prices.set(response.prices.data ?? []);
        },
        error: () => this.store.addToast('error', 'Pricing Unavailable', 'Could not load doctor pricing. Please try again.'),
      });
  }

  findPrice(doctorId: string, serviceCode: string): BackendDoctorServicePrice | undefined {
    return this.prices().find(price => price.doctorId === doctorId && price.serviceCode === serviceCode);
  }

  setSearch(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  setServiceFilter(event: Event): void {
    this.serviceFilter.set((event.target as HTMLSelectElement).value);
  }

  openEditor(doctor: BackendDoctorProfile, service: DoctorServiceType, price?: BackendDoctorServicePrice): void {
    this.selectedDoctorId.set(doctor.id);
    this.selectedDoctorName.set(`Dr. ${doctor.firstName} ${doctor.lastName}`);
    this.selectedServiceCode.set(service.code);
    this.selectedServiceName.set(service.name);
    this.priceForm.reset({
      amount: price?.amount ?? 0,
      currency: price?.currency ?? 'ETB',
      validityDays: price?.validityDays ?? service.defaultValidityDays,
      isActive: price?.isActive ?? true,
    });
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    if (!this.saving()) this.editorOpen.set(false);
  }

  savePrice(): void {
    if (this.priceForm.invalid) {
      this.priceForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const form = this.priceForm.getRawValue();
    this.api.saveDoctorPrice(this.selectedDoctorId(), this.selectedServiceCode(), {
      serviceName: this.selectedServiceName(),
      amount: form.amount,
      currency: form.currency,
      validityDays: form.validityDays,
      isActive: form.isActive,
    })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: response => {
          if (!response.data) return;
          this.prices.update(current => {
            const withoutCurrent = current.filter(item => item.id !== response.data.id);
            return [...withoutCurrent, response.data];
          });
          this.editorOpen.set(false);
          this.store.addToast('success', 'Price Saved', `${this.selectedDoctorName()} ${this.selectedServiceName()} price was updated.`);
        },
        error: () => this.store.addToast('error', 'Price Not Saved', 'Review the values and try again.'),
      });
  }
}
