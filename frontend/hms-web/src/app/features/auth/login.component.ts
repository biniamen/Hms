import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../api.service';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <main class="min-h-screen bg-gradient-to-br from-brand-500/10 via-slate-100 to-mint-500/10 grid place-items-center p-6">
      <form class="w-full max-w-md grid gap-5 rounded-xl border border-slate-200 bg-white p-8 shadow-float" (ngSubmit)="login()">
        <div class="text-center">
          <span class="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-brand-600 text-2xl font-black text-white">H</span>
          <h1 class="mt-4 text-2xl font-black text-slate-900">HMS Platform</h1>
          <p class="mt-1 text-sm text-slate-500">Sign in to your workspace</p>
        </div>

        <ng-container *ngIf="!forgotMode(); else forgotView">
          <label class="field-label">Email Address
            <input class="field-control" type="email" name="email" [(ngModel)]="email" placeholder="admin@hms.local" required>
          </label>
          <label class="field-label">Password
            <input class="field-control" type="password" name="pass" [(ngModel)]="password" placeholder="Enter your password" required>
          </label>
          <button class="btn-primary" type="submit" [disabled]="loading()">
            {{ loading() ? 'Signing in...' : 'Sign In' }}
          </button>
          <div class="flex justify-between text-xs">
            <button type="button" class="font-bold text-brand-600 hover:text-brand-700" (click)="showForgotPassword()">Forgot password?</button>
            <span class="text-slate-400">v0.1.0</span>
          </div>
        </ng-container>

        <ng-template #forgotView>
          <p class="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
            Enter your email to receive a password reset link. If an account exists, a setup link will be sent.
          </p>
          <label class="field-label">Email Address
            <input class="field-control" type="email" name="femail" [(ngModel)]="forgotEmail" placeholder="admin@hms.local" required>
          </label>
          <button class="btn-primary" type="button" [disabled]="loading()" (click)="requestPasswordReset()">
            {{ loading() ? 'Processing...' : 'Reset Password' }}
          </button>
          <button class="btn-secondary" type="button" (click)="forgotMode.set(false)">Back to Sign In</button>
        </ng-template>
      </form>
    </main>
  `,
})
export class LoginComponent {
  email = 'admin@hms.local';
  password = '';
  forgotEmail = '';
  loading = signal(false);
  forgotMode = signal(false);

  constructor(
    private api: ApiService,
    private store: StoreService,
    private router: Router
  ) {
    if (this.api.session()) this.router.navigate(['/dashboard']);
  }

  login() {
    this.loading.set(true);
    this.api.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.api.storeSession(res.data);
        this.store.loadAll();
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading.set(false);
        this.store.toast('error', 'Login failed. Check your credentials or complete password setup first.');
      },
    });
  }

  showForgotPassword() {
    this.forgotEmail = this.email;
    this.forgotMode.set(true);
  }

  requestPasswordReset() {
    this.loading.set(true);
    this.api.forgotPassword(this.forgotEmail).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.data?.setupUrl) this.store.copySetupUrl(res.data.setupUrl);
        this.store.toast('success', 'Password reset request processed.');
      },
      error: () => {
        this.loading.set(false);
        this.store.toast('error', 'Password reset request failed.');
      },
    });
  }
}
