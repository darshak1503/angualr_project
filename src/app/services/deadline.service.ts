import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DeadlineResponse {
    secondsLeft: number;
}

/**
 * Service to fetch deadline information from the backend API.
 * 
 * Performance considerations:
 * - Uses HttpClient which is tree-shakeable
 * - Returns Observable for reactive handling
 * - Can be easily mocked for testing
 */
@Injectable({
    providedIn: 'root'
})
export class DeadlineService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = '/api/deadline';

    /**
     * Fetches the current seconds left until the deadline.
     * @returns Observable containing the deadline response
     */
    getDeadline(): Observable<DeadlineResponse> {
        return this.http.get<DeadlineResponse>(this.apiUrl);
    }
}
