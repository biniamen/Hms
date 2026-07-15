import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { jwtInterceptor } from './app/api.service';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([jwtInterceptor]))],
}).catch((err) => console.error(err));
