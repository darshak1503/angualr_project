import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, retry, timeout } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Response interface for the deadline API endpoint.
 * Ensures type safety for API responses.
 */
export interface DeadlineResponse {
    secondsLeft: number;
}

/**
 * Configuration options for the deadline service.
 */
export interface DeadlineServiceConfig {
    /** API endpoint URL */
    apiUrl: string;
    /** Request timeout in milliseconds */
    timeoutMs: number;
    /** Number of retry attempts for failed requests */
    retryAttempts: number;
}

/**
 * Service to fetch deadline information from the backend API.
 * 
 * Features:
 * - Type-safe API responses with validation
 * - Comprehensive error handling with retry logic
 * - Configurable timeout and retry attempts
 * - Input validation for API responses
 * - Detailed error messages for debugging
 * 
 * Performance considerations:
 * - Uses HttpClient which is tree-shakeable
 * - Returns Observable for reactive handling
 * - Can be easily mocked for testing
 * - Implements retry logic for transient failures
 * 
 * @example
 * ```typescript
 * constructor(private deadlineService: DeadlineService) {}
 * 
 * this.deadlineService.getDeadline().subscribe({
 *   next: (response) => console.log(response.secondsLeft),
 *   error: (error) => console.error('Failed to fetch deadline', error)
 * });
 * ```
 */
@Injectable({
    providedIn: 'root'
})
export class DeadlineService {
    private readonly http = inject(HttpClient);

    /** Default configuration for the service */
    private readonly config: DeadlineServiceConfig = {
        apiUrl: '/api/deadline',
        timeoutMs: 10000, // 10 seconds timeout
        retryAttempts: 2  // Retry failed requests twice
    };

    /**
     * Fetches the current seconds left until the deadline.
     * 
     * Implements:
     * - Automatic retry on failure (2 attempts)
     * - 10-second timeout
     * - Response validation
     * - Comprehensive error handling
     * 
     * @returns Observable containing the validated deadline response
     * @throws Error if the API response is invalid or request fails
     */
    getDeadline(): Observable<DeadlineResponse> {
        return this.http.get<DeadlineResponse>(this.config.apiUrl).pipe(
            // Set timeout for the request
            timeout(this.config.timeoutMs),

            // Retry failed requests
            retry(this.config.retryAttempts),

            // Validate the response
            map(response => this.validateResponse(response)),

            // Handle errors with detailed messages
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Validates the API response to ensure data integrity.
     * 
     * Checks:
     * - Response is not null/undefined
     * - secondsLeft property exists
     * - secondsLeft is a valid number
     * - secondsLeft is not NaN or Infinity
     * 
     * @param response - The API response to validate
     * @returns The validated response
     * @throws Error if validation fails
     */
    private validateResponse(response: DeadlineResponse): DeadlineResponse {
        // Check if response exists
        if (!response) {
            throw new Error('API returned null or undefined response');
        }

        // Check if secondsLeft property exists
        if (response.secondsLeft === undefined || response.secondsLeft === null) {
            throw new Error('API response missing "secondsLeft" property');
        }

        // Check if secondsLeft is a valid number
        if (typeof response.secondsLeft !== 'number') {
            throw new Error(
                `Invalid data type for "secondsLeft": expected number, got ${typeof response.secondsLeft}`
            );
        }

        // Check for NaN or Infinity
        if (!Number.isFinite(response.secondsLeft)) {
            throw new Error(
                `Invalid value for "secondsLeft": ${response.secondsLeft} (must be a finite number)`
            );
        }

        // Optionally warn about negative values (but don't throw)
        if (response.secondsLeft < 0) {
            console.warn(
                `Warning: secondsLeft is negative (${response.secondsLeft}). Deadline may have already passed.`
            );
        }

        return response;
    }

    /**
     * Handles HTTP errors and provides user-friendly error messages.
     * 
     * Error types handled:
     * - Network errors (no connection)
     * - Timeout errors
     * - HTTP status errors (4xx, 5xx)
     * - Client-side errors
     * - Unknown errors
     * 
     * @param error - The error object from the HTTP request
     * @returns Observable that emits an error with a descriptive message
     */
    private handleError(error: unknown): Observable<never> {
        let errorMessage = 'An unknown error occurred';

        if (error instanceof HttpErrorResponse) {
            // Server-side or network error
            if (error.status === 0) {
                // Network error or CORS issue
                errorMessage = 'Unable to connect to the server. Please check your internet connection.';
            } else if (error.status >= 400 && error.status < 500) {
                // Client error (4xx)
                errorMessage = `Client error: ${error.status} - ${error.statusText || 'Bad Request'}`;
            } else if (error.status >= 500) {
                // Server error (5xx)
                errorMessage = `Server error: ${error.status} - ${error.statusText || 'Internal Server Error'}`;
            } else {
                errorMessage = `HTTP error: ${error.status} - ${error.message}`;
            }
        } else if (error instanceof Error) {
            // Client-side error (timeout, validation, etc.)
            if (error.name === 'TimeoutError') {
                errorMessage = 'Request timed out. Please try again.';
            } else {
                errorMessage = error.message;
            }
        }

        // Log error for debugging
        console.error('DeadlineService Error:', {
            message: errorMessage,
            originalError: error,
            timestamp: new Date().toISOString()
        });

        return throwError(() => new Error(errorMessage));
    }

    /**
     * Updates the service configuration.
     * Useful for testing or environment-specific settings.
     * 
     * @param config - Partial configuration to override defaults
     * 
     * @example
     * ```typescript
     * deadlineService.updateConfig({ timeoutMs: 5000, retryAttempts: 3 });
     * ```
     */
    updateConfig(config: Partial<DeadlineServiceConfig>): void {
        Object.assign(this.config, config);
    }

    /**
     * Gets the current service configuration.
     * Useful for debugging or testing.
     * 
     * @returns A copy of the current configuration
     */
    getConfig(): Readonly<DeadlineServiceConfig> {
        return { ...this.config };
    }
}
