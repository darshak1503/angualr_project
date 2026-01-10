import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, delay } from 'rxjs';

/**
 * Mock HTTP Interceptor for testing the deadline countdown component.
 * 
 * This interceptor simulates the /api/deadline endpoint by returning
 * a mock response with a configurable number of seconds left.
 * 
 * In a production environment, this interceptor should be removed
 * and replaced with actual API calls.
 * 
 * Usage:
 * Add to app.config.ts providers:
 * provideHttpClient(withInterceptors([mockDeadlineInterceptor]))
 */
export const mockDeadlineInterceptor: HttpInterceptorFn = (req, next) => {
    // Only intercept requests to /api/deadline
    if (req.url === '/api/deadline' && req.method === 'GET') {
        // Simulate a 60-second countdown (adjust as needed for testing)
        const mockResponse = {
            secondsLeft: 60
        };

        // Simulate network delay (500ms) and return proper HttpResponse
        return of(new HttpResponse({
            status: 200,
            statusText: 'OK',
            body: mockResponse
        })).pipe(delay(500));
    }

    // Pass through all other requests
    return next(req);
};
