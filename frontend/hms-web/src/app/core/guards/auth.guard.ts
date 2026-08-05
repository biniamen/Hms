import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../api.service';

export const authGuard = () => {
  const api = inject(ApiService);
  const router = inject(Router);
  if (api.session()) return true;
  return router.parseUrl('/login');
};
