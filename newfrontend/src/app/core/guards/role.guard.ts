import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { StoreService } from '../services/store.service';
import type { UserRole } from '../models';

export const roleGuard: CanActivateFn = (route) => {
  const store = inject(StoreService);
  const router = inject(Router);
  const user = store.currentUser();

  const allowedRoles = route.data?.['roles'] as string[] | undefined;

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (!allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(user.role) || user.role === 'ADMIN') {
    return true;
  }

  store.addToast('warning', 'Access Restricted', `Your account role (${user.role}) does not have permission to access this module.`);
  router.navigate(['/dashboard']);
  return false;
};
