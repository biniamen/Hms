import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../api.service';

/**
 * Factory that returns a route guard function checking whether the
 * current user's role is among `allowedRoles`. Redirects to /dashboard
 * on mismatch.
 */
export const roleGuard = (allowedRoles: string[]) => () => {
  const api = inject(ApiService);
  const router = inject(Router);
  const session = api.session();

  if (session && (allowedRoles.includes('ALL') || allowedRoles.includes(session.role))) {
    return true;
  }

  // Redirect unauthorized users to dashboard
  return router.parseUrl('/dashboard');
};
