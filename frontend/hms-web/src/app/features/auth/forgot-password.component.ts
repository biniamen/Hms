import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../api.service';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main class="min-h-screen bg-gradient-to-br from-brand-500/10 via-slate-100 to-mint-500/10 grid place-items-center p-6">
      <div class="w-full max-w-md grid gap-5 rounded-xl border border-slate-200 bg-white p-8 shadow-float">
        <div class="text-center">
          <span class="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-brand-600 text-2xl font-black text-white">H</span>
          <h1 class="mt-4 text-2xl font-black text-slate-900">Forgot Password</h1>
          <p class="mt-1 text-sm text-slate-500">Check the Identity API email outbox</p>
        </div>
        <p class="text-sm text-slate-600 leading-6">
          Visit the <strong>Administration &rarr; Email Outbox</strong> section after logging in as admin
          to find the password reset link. Alternatively, use the login page to request a reset.
        </p>
        <a class="btn-primary text-center" routerLink="/login">Back to Sign In</a>
      </div>
    </main>
  `,
})
export class ForgotPasswordComponent {
  constructor() {}
}
