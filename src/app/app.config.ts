import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { mockDeadlineInterceptor } from './interceptors/mock-deadline.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Provide HttpClient with mock interceptor for testing
    // In production, remove withInterceptors([mockDeadlineInterceptor])
    provideHttpClient(withInterceptors([mockDeadlineInterceptor]))
  ]
};
