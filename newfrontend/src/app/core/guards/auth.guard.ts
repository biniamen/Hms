import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { StoreService } from '../services/store.service';

export const authGuard: CanActivateFn = () => {
  const store = inject(StoreService);
  const router = inject(Router);

  if (store.currentUser()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
