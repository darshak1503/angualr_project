import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { of, delay, throwError } from 'rxjs';

/**
 * Configuration for the mock deadline interceptor.
 * Allows easy customization of mock behavior for testing different scenarios.
 */
export interface MockDeadlineConfig {
    /** Number of seconds to return in the mock response */
    secondsLeft: number;
    /** Network delay in milliseconds to simulate real API latency */
    delayMs: number;
    /** Whether to simulate an error response */
    simulateError: boolean;
    /** HTTP status code to return when simulating errors */
    errorStatus: number;
    /** Error message to return when simulating errors */
    errorMessage: string;
}

/**
 * Default configuration for the mock interceptor.
 * Can be modified for different testing scenarios.
 */
let mockConfig: MockDeadlineConfig = {
    secondsLeft: 60,
    delayMs: 500,
    simulateError: false,
    errorStatus: 500,
    errorMessage: 'Internal Server Error'
};

/**
 * Updates the mock interceptor configuration.
 * Useful for testing different scenarios without modifying code.
 * 
 * @param config - Partial configuration to override defaults
 * 
 * @example
 * ```typescript
 * // Simulate a timeout scenario
 * updateMockDeadlineConfig({ secondsLeft: 120, delayMs: 2000 });
 * 
 * // Simulate an error
 * updateMockDeadlineConfig({ simulateError: true, errorStatus: 404 });
 * 
 * // Simulate deadline already passed
 * updateMockDeadlineConfig({ secondsLeft: -10 });
 * ```
 */
export function updateMockDeadlineConfig(config: Partial<MockDeadlineConfig>): void {
    mockConfig = { ...mockConfig, ...config };
}

/**
 * Gets the current mock configuration.
 * Useful for debugging or verifying test setup.
 * 
 * @returns A copy of the current mock configuration
 */
export function getMockDeadlineConfig(): Readonly<MockDeadlineConfig> {
    return { ...mockConfig };
}

/**
 * Resets the mock configuration to default values.
 * Useful for cleaning up between tests.
 */
export function resetMockDeadlineConfig(): void {
    mockConfig = {
        secondsLeft: 60,
        delayMs: 500,
        simulateError: false,
        errorStatus: 500,
        errorMessage: 'Internal Server Error'
    };
}

/**
 * Mock HTTP Interceptor for testing the deadline countdown component.
 * 
 * Features:
 * - Simulates the /api/deadline endpoint
 * - Configurable response values and delays
 * - Error simulation for testing error handling
 * - Realistic network latency simulation
 * - Easy configuration for different test scenarios
 * 
 * This interceptor provides a realistic mock of the backend API,
 * allowing for comprehensive testing without requiring a real server.
 * 
 * In a production environment, this interceptor should be removed
 * from the providers array in app.config.ts.
 * 
 * Usage in app.config.ts:
 * ```typescript
 * import { mockDeadlineInterceptor } from './interceptors/mock-deadline.interceptor';
 * 
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(withInterceptors([mockDeadlineInterceptor]))
 *   ]
 * };
 * ```
 * 
 * Testing different scenarios:
 * ```typescript
 * import { updateMockDeadlineConfig } from './interceptors/mock-deadline.interceptor';
 * 
 * // Test with different countdown values
 * updateMockDeadlineConfig({ secondsLeft: 120 });
 * 
 * // Test error handling
 * updateMockDeadlineConfig({ simulateError: true, errorStatus: 503 });
 * 
 * // Test with slow network
 * updateMockDeadlineConfig({ delayMs: 3000 });
 * ```
 */
export const mockDeadlineInterceptor: HttpInterceptorFn = (req, next) => {
    // Only intercept requests to /api/deadline
    if (req.url === '/api/deadline' && req.method === 'GET') {

        // Log the intercepted request for debugging
        console.log('[Mock Interceptor] Intercepted request to /api/deadline', {
            config: mockConfig,
            timestamp: new Date().toISOString()
        });

        // Simulate error response if configured
        if (mockConfig.simulateError) {
            const errorResponse = new HttpErrorResponse({
                error: { message: mockConfig.errorMessage },
                status: mockConfig.errorStatus,
                statusText: getStatusText(mockConfig.errorStatus),
                url: req.url
            });

            console.warn('[Mock Interceptor] Simulating error response:', {
                status: mockConfig.errorStatus,
                message: mockConfig.errorMessage
            });

            return throwError(() => errorResponse).pipe(
                delay(mockConfig.delayMs)
            );
        }

        // Create successful mock response
        const mockResponse = {
            secondsLeft: mockConfig.secondsLeft
        };

        console.log('[Mock Interceptor] Returning mock response:', mockResponse);

        // Simulate network delay and return proper HttpResponse
        return of(new HttpResponse({
            status: 200,
            statusText: 'OK',
            body: mockResponse,
            url: req.url
        })).pipe(
            delay(mockConfig.delayMs)
        );
    }

    // Pass through all other requests to the next handler
    return next(req);
};

/**
 * Helper function to get HTTP status text for common status codes.
 * 
 * @param status - HTTP status code
 * @returns Human-readable status text
 */
function getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
        200: 'OK',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        408: 'Request Timeout',
        500: 'Internal Server Error',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Timeout'
    };

    return statusTexts[status] || 'Unknown Status';
}

/**
 * Predefined test scenarios for common testing situations.
 * Use these with updateMockDeadlineConfig() for quick test setup.
 */
export const MockScenarios = {
    /** Normal countdown with 60 seconds */
    NORMAL: { secondsLeft: 60, delayMs: 500, simulateError: false },

    /** Long countdown with 300 seconds (5 minutes) */
    LONG_COUNTDOWN: { secondsLeft: 300, delayMs: 500, simulateError: false },

    /** Short countdown with 10 seconds */
    SHORT_COUNTDOWN: { secondsLeft: 10, delayMs: 500, simulateError: false },

    /** Deadline already passed (negative value) */
    EXPIRED: { secondsLeft: -5, delayMs: 500, simulateError: false },

    /** Exactly at deadline (zero) */
    AT_DEADLINE: { secondsLeft: 0, delayMs: 500, simulateError: false },

    /** Slow network (3 second delay) */
    SLOW_NETWORK: { secondsLeft: 60, delayMs: 3000, simulateError: false },

    /** Server error (500) */
    SERVER_ERROR: { secondsLeft: 0, delayMs: 500, simulateError: true, errorStatus: 500, errorMessage: 'Internal Server Error' },

    /** Not found error (404) */
    NOT_FOUND: { secondsLeft: 0, delayMs: 500, simulateError: true, errorStatus: 404, errorMessage: 'Endpoint not found' },

    /** Service unavailable (503) */
    SERVICE_UNAVAILABLE: { secondsLeft: 0, delayMs: 500, simulateError: true, errorStatus: 503, errorMessage: 'Service temporarily unavailable' },

    /** Timeout simulation (very long delay) */
    TIMEOUT: { secondsLeft: 60, delayMs: 15000, simulateError: false }
} as const;
