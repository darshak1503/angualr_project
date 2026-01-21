import {
  Component,
  inject,
  ChangeDetectionStrategy,
  DestroyRef,
  signal,
  computed,
  OnInit,
  Input
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { timer, switchMap, map, catchError, of, tap, finalize } from 'rxjs';
import { DeadlineService } from '../../services/deadline.service';

/**
 * Display format for the countdown timer.
 */
export type CountdownFormat = 'seconds' | 'minutes' | 'hours' | 'auto';

/**
 * DeadlineCountdownComponent
 * 
 * A production-ready, performance-optimized countdown timer component that displays
 * the time remaining until a deadline. Features comprehensive error handling,
 * multiple display formats, and accessibility support.
 * 
 * Features:
 * - Real-time countdown with second-by-second updates
 * - Multiple display formats (seconds, minutes, hours, auto)
 * - Comprehensive error handling with retry functionality
 * - Loading states with user feedback
 * - Expired state detection and display
 * - Accessibility features (ARIA labels, semantic HTML)
 * - Responsive design with modern styling
 * 
 * Performance Optimizations:
 * 1. OnPush Change Detection - Only updates when signals change
 * 2. Angular Signals - Fine-grained reactivity with minimal overhead
 * 3. RxJS timer() - More efficient than setInterval, handles cleanup automatically
 * 4. takeUntilDestroyed() - Automatic subscription cleanup prevents memory leaks
 * 5. Single API call - Fetches initial value once, then decrements client-side
 * 6. Computed signals - Derived state is calculated efficiently
 * 
 * Usage:
 * ```html
 * <!-- Basic usage -->
 * <app-deadline-countdown></app-deadline-countdown>
 * 
 * <!-- With custom format -->
 * <app-deadline-countdown format="auto"></app-deadline-countdown>
 * 
 * <!-- With auto-start disabled -->
 * <app-deadline-countdown [autoStart]="false"></app-deadline-countdown>
 * ```
 * 
 * @example
 * ```typescript
 * import { DeadlineCountdownComponent } from './components/deadline-countdown/deadline-countdown.component';
 * 
 * @Component({
 *   imports: [DeadlineCountdownComponent],
 *   template: `<app-deadline-countdown format="auto"></app-deadline-countdown>`
 * })
 * export class YourComponent {}
 * ```
 */
@Component({
  selector: 'app-deadline-countdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading()) {
      <div class="countdown-container loading" role="status" aria-live="polite">
        <div class="spinner"></div>
        <span class="loading-text">Loading deadline...</span>
      </div>
    } @else if (error()) {
      <div class="countdown-container error" role="alert" aria-live="assertive">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ error() }}</span>
        <button 
          class="retry-btn" 
          (click)="retry()"
          [disabled]="retrying()"
          aria-label="Retry loading deadline">
          {{ retrying() ? 'Retrying...' : 'Retry' }}
        </button>
      </div>
    } @else {
      <div 
        class="countdown-container" 
        [class.expired]="isExpired()"
        [class.warning]="isWarning()"
        role="timer"
        aria-live="polite"
        [attr.aria-label]="ariaLabel()">
        <span class="countdown-label">{{ countdownLabel() }}</span>
        <span class="countdown-value">{{ formattedTime() }}</span>
        @if (isExpired()) {
          <span class="expired-badge">Expired</span>
        } @else if (isWarning()) {
          <span class="warning-badge">Hurry!</span>
        }
      </div>
    }
  `,
  styles: [`
    .countdown-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .countdown-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      transition: left 0.5s;
    }

    .countdown-container:hover::before {
      left: 100%;
    }

    .countdown-container.loading {
      background: linear-gradient(135deg, #a8a8a8 0%, #6b6b6b 100%);
      justify-content: center;
    }

    .countdown-container.error {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
      flex-direction: column;
      gap: 8px;
    }

    .countdown-container.expired {
      background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
    }

    .countdown-container.warning {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }

    .countdown-label {
      color: white;
      font-size: 18px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    .countdown-value {
      color: white;
      font-size: 36px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      min-width: 120px;
      text-align: center;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .loading-text,
    .error-text {
      color: white;
      font-size: 16px;
      text-align: center;
    }

    .error-icon {
      font-size: 32px;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .retry-btn {
      margin-top: 8px;
      padding: 10px 20px;
      background: white;
      color: #ee5a5a;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .retry-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .retry-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .retry-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .expired-badge,
    .warning-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 12px;
      background: rgba(255,255,255,0.3);
      color: white;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .warning-badge {
      animation: blink 1s infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Responsive design */
    @media (max-width: 480px) {
      .countdown-container {
        flex-direction: column;
        gap: 8px;
        padding: 16px 20px;
      }

      .countdown-value {
        font-size: 28px;
        min-width: auto;
      }

      .countdown-label {
        font-size: 16px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeadlineCountdownComponent implements OnInit {
  private readonly deadlineService = inject(DeadlineService);
  private readonly destroyRef = inject(DestroyRef);

  /** Display format for the countdown */
  @Input() format: CountdownFormat = 'seconds';

  /** Whether to automatically start the countdown on init */
  @Input() autoStart = true;

  /** Warning threshold in seconds (shows warning when below this value) */
  @Input() warningThreshold = 10;

  // Signals for reactive state management
  readonly secondsLeft = signal<number>(0);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly retrying = signal<boolean>(false);

  // Computed signals for derived state
  readonly isExpired = computed(() => this.secondsLeft() <= 0 && !this.loading());
  readonly isWarning = computed(() =>
    this.secondsLeft() > 0 &&
    this.secondsLeft() <= this.warningThreshold &&
    !this.loading()
  );
  readonly displaySeconds = computed(() => Math.max(0, this.secondsLeft()));

  /**
   * Formats the time based on the selected format.
   */
  readonly formattedTime = computed(() => {
    const seconds = this.displaySeconds();
    const format = this.format;

    if (format === 'seconds' || (format === 'auto' && seconds < 60)) {
      return `${seconds}s`;
    }

    if (format === 'minutes' || (format === 'auto' && seconds < 3600)) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }

    // hours format or auto with >= 3600 seconds
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  });

  /**
   * Dynamic label based on state.
   */
  readonly countdownLabel = computed(() => {
    if (this.isExpired()) {
      return 'Deadline passed:';
    }
    return 'Time remaining:';
  });

  /**
   * Accessibility label for screen readers.
   */
  readonly ariaLabel = computed(() => {
    const seconds = this.displaySeconds();
    if (this.isExpired()) {
      return 'Deadline has expired';
    }
    return `${seconds} seconds remaining until deadline`;
  });

  ngOnInit(): void {
    if (this.autoStart) {
      this.startCountdown();
    }
  }

  /**
   * Initiates the countdown by fetching the initial value from the API
   * and then decrementing every second.
   * 
   * Error handling:
   * - Catches network errors
   * - Catches timeout errors
   * - Catches validation errors
   * - Provides user-friendly error messages
   * - Allows retry functionality
   */
  private startCountdown(): void {
    this.loading.set(true);
    this.error.set(null);

    this.deadlineService.getDeadline()
      .pipe(
        tap((response) => {
          // Validate response before using
          if (response.secondsLeft === undefined || response.secondsLeft === null) {
            throw new Error('Invalid response: missing secondsLeft');
          }

          // Set initial value and clear loading state
          this.secondsLeft.set(response.secondsLeft);
          this.loading.set(false);

          console.log('[Countdown] Started with', response.secondsLeft, 'seconds');
        }),
        // Switch to a timer that emits every second
        switchMap((response) => {
          // Start timer that emits 0, 1, 2, 3... every second
          return timer(0, 1000).pipe(
            map((tick) => {
              const remaining = response.secondsLeft - tick;
              // Stop emitting when we reach 0 (optional: continue for negative display)
              return remaining;
            }),
            takeUntilDestroyed(this.destroyRef)
          );
        }),
        catchError((err) => {
          console.error('[Countdown] Error:', err);
          this.loading.set(false);

          // Extract user-friendly error message
          const errorMessage = err?.message || 'Failed to load deadline. Please try again.';
          this.error.set(errorMessage);

          return of(null);
        }),
        finalize(() => {
          // Always clear retrying state when done
          this.retrying.set(false);
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
   * Provides visual feedback during retry attempt.
   */
  retry(): void {
    console.log('[Countdown] Retrying...');
    this.retrying.set(true);
    this.startCountdown();
  }

  /**
   * Manually start the countdown.
   * Useful when autoStart is false.
   */
  start(): void {
    if (!this.loading() && !this.error()) {
      console.warn('[Countdown] Already running');
      return;
    }
    this.startCountdown();
  }

  /**
   * Get the current countdown value.
   * Useful for programmatic access.
   */
  getCurrentValue(): number {
    return this.secondsLeft();
  }

  /**
   * Check if the countdown is currently running.
   */
  isRunning(): boolean {
    return !this.loading() && !this.error() && this.secondsLeft() > 0;
  }
}
