import { bootstrapApplication } from '@angular/platform-browser';
import { HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';

const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem('hms_access_token');
  const isApiRequest = request.url.startsWith('http://localhost:5200');
  const isPublicAuthRequest =
    request.url.includes('/api/auth/login') ||
    request.url.includes('/api/auth/setup-password') ||
    request.url.includes('/api/auth/forgot-password');

  if (token && isApiRequest && !isPublicAuthRequest) {
    return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }

  return next(request);
};

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([authInterceptor]))],
}).catch((err) => console.error(err));
