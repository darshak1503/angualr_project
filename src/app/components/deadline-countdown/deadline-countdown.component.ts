import {
    Component,
    inject,
    ChangeDetectionStrategy,
    DestroyRef,
    signal,
    computed,
    OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { timer, switchMap, map, catchError, of, tap } from 'rxjs';
import { DeadlineService } from '../../services/deadline.service';

/**
 * DeadlineCountdownComponent
 * 
 * A performance-optimized countdown timer component that displays
 * the seconds remaining until a deadline.
 * 
 * Performance Optimizations:
 * 1. OnPush Change Detection - Only updates when signals change
 * 2. Signals - Fine-grained reactivity with minimal overhead
 * 3. RxJS timer() - More efficient than setInterval, handles cleanup
 * 4. takeUntilDestroyed() - Automatic subscription cleanup
 * 5. Single API call - Fetches initial value, then decrements client-side
 * 
 * Usage:
 * <app-deadline-countdown></app-deadline-countdown>
 */
@Component({
    selector: 'app-deadline-countdown',
    standalone: true,
    imports: [CommonModule],
    template: `
    @if (loading()) {
      <div class="countdown-container loading">
        <span class="loading-text">Loading deadline...</span>
      </div>
    } @else if (error()) {
      <div class="countdown-container error">
        <span class="error-text">{{ error() }}</span>
        <button class="retry-btn" (click)="retry()">Retry</button>
      </div>
    } @else {
      <div class="countdown-container" [class.expired]="isExpired()">
        <span class="countdown-label">Seconds left to deadline:</span>
        <span class="countdown-value">{{ displaySeconds() }}</span>
      </div>
    }
  `,
    styles: [`
    .countdown-container {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .countdown-container.loading {
      background: linear-gradient(135deg, #a8a8a8 0%, #6b6b6b 100%);
    }

    .countdown-container.error {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
      flex-direction: column;
    }

    .countdown-container.expired {
      background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
    }

    .countdown-label {
      color: white;
      font-size: 18px;
      font-weight: 500;
    }

    .countdown-value {
      color: white;
      font-size: 32px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      min-width: 100px;
      text-align: center;
    }

    .loading-text,
    .error-text {
      color: white;
      font-size: 16px;
    }

    .retry-btn {
      margin-top: 8px;
      padding: 8px 16px;
      background: white;
      color: #ee5a5a;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: transform 0.2s;
    }

    .retry-btn:hover {
      transform: scale(1.05);
    }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeadlineCountdownComponent implements OnInit {
    private readonly deadlineService = inject(DeadlineService);
    private readonly destroyRef = inject(DestroyRef);

    // Signals for reactive state management
    readonly secondsLeft = signal<number>(0);
    readonly loading = signal<boolean>(true);
    readonly error = signal<string | null>(null);

    // Computed signals for derived state
    readonly isExpired = computed(() => this.secondsLeft() <= 0 && !this.loading());
    readonly displaySeconds = computed(() => Math.max(0, this.secondsLeft()));

    ngOnInit(): void {
        this.startCountdown();
    }

    /**
     * Initiates the countdown by fetching the initial value from the API
     * and then decrementing every second.
     */
    private startCountdown(): void {
        this.loading.set(true);
        this.error.set(null);

        this.deadlineService.getDeadline()
            .pipe(
                tap((response) => {
                    // Set initial value and clear loading state
                    this.secondsLeft.set(response.secondsLeft);
                    this.loading.set(false);
                }),
                // Switch to a timer that emits every second
                switchMap((response) => {
                    // Start timer that emits 0, 1, 2, 3... every second
                    return timer(0, 1000).pipe(
                        map((tick) => response.secondsLeft - tick),
                        // Stop when we reach 0 (or below)
                        takeUntilDestroyed(this.destroyRef)
                    );
                }),
                catchError((err) => {
                    console.error('Failed to fetch deadline:', err);
                    this.loading.set(false);
                    this.error.set('Failed to load deadline. Please try again.');
                    return of(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((value) => {
                if (value !== null) {
                    this.secondsLeft.set(value);
                }
            });
    }

    /**
     * Retry fetching the deadline after an error.
     */
    retry(): void {
        this.startCountdown();
    }
}
