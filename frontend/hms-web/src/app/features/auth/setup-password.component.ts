import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../api.service';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-setup-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <main class="min-h-screen bg-gradient-to-br from-brand-500/10 via-slate-100 to-mint-500/10 grid place-items-center p-6">
      <form class="w-full max-w-md grid gap-5 rounded-xl border border-slate-200 bg-white p-8 shadow-float" (ngSubmit)="setupPassword()">
        <div class="text-center">
          <span class="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-brand-600 text-2xl font-black text-white">H</span>
          <h1 class="mt-4 text-2xl font-black text-slate-900">Set Up Password</h1>
          <p class="mt-1 text-sm text-slate-500">Complete your account setup</p>
        </div>

        <p class="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          Create a strong password to activate your account. You'll use this to sign in going forward.
        </p>

        <label class="field-label">Password
          <input class="field-control" type="password" name="pass" [(ngModel)]="form.password" placeholder="Min 8 characters" required>
        </label>
        <label class="field-label">Confirm Password
          <input class="field-control" type="password" name="cpass" [(ngModel)]="form.confirmPassword" placeholder="Repeat your password" required>
        </label>
        <button class="btn-primary" type="submit" [disabled]="loading()">
          {{ loading() ? 'Saving...' : 'Set Password & Continue' }}
        </button>
        <button class="btn-secondary" type="button" routerLink="/login">Back to Sign In</button>
      </form>
    </main>
  `,
})
export class SetupPasswordComponent implements OnInit {
  form = { password: '', confirmPassword: '' };
  loading = signal(false);
  token = '';

  constructor(
    private api: ApiService,
    private store: StoreService,
    private router: Router
  ) {}

  ngOnInit() {
    const params = new URLSearchParams(window.location.search);
    this.token = params.get('token') ?? '';
    if (!this.token) this.router.navigate(['/login']);
  }

  setupPassword() {
    if (this.form.password !== this.form.confirmPassword) {
      this.store.toast('error', 'Passwords do not match.');
      return;
    }

    this.loading.set(true);
    this.api.setupPassword({ token: this.token, password: this.form.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.store.toast('success', 'Password created. Please sign in.');
        this.router.navigate(['/login']);
      },
      error: () => {
        this.loading.set(false);
        this.store.toast('error', 'Password setup failed. The link may be expired or the password may be too weak.');
      },
    });
  }
}
