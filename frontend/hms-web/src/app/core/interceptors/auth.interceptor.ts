import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Public endpoints that don't need auth
  const publicUrls = ['/api/auth/login', '/api/auth/setup-password', '/api/auth/forgot-password'];
  const isPublic = publicUrls.some((url) => req.url.includes(url));

  // Attach auth token if available
  let authReq = req;
  if (!isPublic) {
    const token = localStorage.getItem('hms_access_token');
    if (token) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
  }

  // Single pipeline: send request, handle 401 globally
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublic) {
        localStorage.removeItem('hms_session');
        localStorage.removeItem('hms_access_token');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
