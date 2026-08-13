import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { UserRole } from '../../core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <!-- Decorative Gradient Background Effects -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Main Login Container -->
      <div class="w-full max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-8 shadow-2xl relative z-10 animate-scale-up">

        <!-- Header & Logo -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 shadow-lg shadow-teal-500/20 mb-4 text-white">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"></path></svg>
          </div>
          <h1 class="text-2xl font-bold text-white tracking-tight font-display">Creavers Software Engineering</h1>
          <p class="text-sm text-slate-400 mt-1">Hospital Management & Clinical Care Suite</p>
        </div>

        <!-- Error Message -->
        @if (errorMessage()) {
          <div class="mb-4 p-3 bg-rose-900/50 border border-rose-700 rounded-xl text-rose-200 text-xs font-medium flex items-center gap-2">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">

          <!-- Email Input -->
          <div>
            <label for="login-email" class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Email Address</label>
            <div class="relative">
              <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              <input
                id="login-email"
                type="email"
                formControlName="email"
                placeholder="admin@hms.local"
                class="w-full pl-10 pr-4 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
              />
            </div>
            @if (loginForm.get('email')?.touched && loginForm.get('email')?.invalid) {
              <p class="text-xs text-rose-400 mt-1">Please enter a valid email address.</p>
            }
          </div>

          <!-- Password Input -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="login-password" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">Password</label>
            </div>
            <div class="relative">
              <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              <input
                id="login-password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                placeholder="Enter your password"
                class="w-full pl-10 pr-10 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
              />
              <button
                type="button"
                (click)="togglePasswordVisibility()"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              </button>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            [disabled]="isLoading()"
            class="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-teal-500/25 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
            @if (isLoading()) {
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Authenticating...</span>
            } @else {
              <span>Sign In to Dashboard</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            }
          </button>
        </form>

        <!-- Footer -->
        <div class="mt-8 pt-6 border-t border-slate-700/60 text-center">
          <p class="text-xs text-slate-500">
            Powered by <span class="text-slate-400 font-medium">HMS Platform v1.0</span>
          </p>
          <p class="text-[10px] text-slate-600 mt-1">Secured with JWT Authentication</p>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent {
  private store = inject(StoreService);
  private router = inject(Router);

  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  loginForm = new FormGroup({
    email: new FormControl('admin@hms.local', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(1)]),
  });

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const email = this.loginForm.value.email!;
    const password = this.loginForm.value.password!;

    this.store.login(email, password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.store.loadAll();
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set(res.message || 'Login failed. Please check your credentials.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Unable to connect to the server. Please ensure the backend is running.');
      },
    });
  }
}
