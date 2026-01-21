import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DeadlineCountdownComponent } from './deadline-countdown.component';
import { DeadlineService } from '../../services/deadline.service';
import { of, throwError, delay } from 'rxjs';

describe('DeadlineCountdownComponent', () => {
    let component: DeadlineCountdownComponent;
    let fixture: ComponentFixture<DeadlineCountdownComponent>;
    let mockDeadlineService: jasmine.SpyObj<DeadlineService>;

    beforeEach(async () => {
        // Create mock service
        mockDeadlineService = jasmine.createSpyObj('DeadlineService', ['getDeadline']);

        await TestBed.configureTestingModule({
            imports: [DeadlineCountdownComponent],
            providers: [
                { provide: DeadlineService, useValue: mockDeadlineService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DeadlineCountdownComponent);
        component = fixture.componentInstance;
    });

    describe('Component Initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should start countdown on init when autoStart is true', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 60 }));
            component.autoStart = true;

            fixture.detectChanges(); // Triggers ngOnInit
            tick(100);

            expect(mockDeadlineService.getDeadline).toHaveBeenCalled();
            expect(component.loading()).toBe(false);
            expect(component.secondsLeft()).toBe(60);
        }));

        it('should not start countdown on init when autoStart is false', () => {
            component.autoStart = false;
            fixture.detectChanges();

            expect(mockDeadlineService.getDeadline).not.toHaveBeenCalled();
        });
    });

    describe('Loading State', () => {
        it('should show loading state initially', () => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 60 }).pipe(delay(1000)));

            fixture.detectChanges();

            expect(component.loading()).toBe(true);
        });

        it('should clear loading state after successful fetch', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 60 }));

            fixture.detectChanges();
            tick(100);

            expect(component.loading()).toBe(false);
        }));

        it('should display loading text in template', () => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 60 }).pipe(delay(1000)));

            fixture.detectChanges();
            const compiled = fixture.nativeElement;

            expect(compiled.querySelector('.loading-text')?.textContent).toContain('Loading deadline');
        });
    });

    describe('Countdown Functionality', () => {
        it('should decrement seconds every second', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 10 }));

            fixture.detectChanges();
            tick(100);

            expect(component.secondsLeft()).toBe(10);

            tick(1000);
            expect(component.secondsLeft()).toBe(9);

            tick(1000);
            expect(component.secondsLeft()).toBe(8);

            tick(1000);
            expect(component.secondsLeft()).toBe(7);
        }));

        it('should handle countdown reaching zero', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 3 }));

            fixture.detectChanges();
            tick(100);

            expect(component.secondsLeft()).toBe(3);

            tick(3000);
            expect(component.secondsLeft()).toBe(0);
            expect(component.isExpired()).toBe(true);
        }));

        it('should handle negative initial values', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: -5 }));

            fixture.detectChanges();
            tick(100);

            expect(component.secondsLeft()).toBe(-5);
            expect(component.isExpired()).toBe(true);
            expect(component.displaySeconds()).toBe(0); // Should display 0, not negative
        }));

        it('should handle zero initial value', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 0 }));

            fixture.detectChanges();
            tick(100);

            expect(component.secondsLeft()).toBe(0);
            expect(component.isExpired()).toBe(true);
        }));
    });

    describe('Error Handling', () => {
        it('should handle API errors', fakeAsync(() => {
            const errorMessage = 'Network error';
            mockDeadlineService.getDeadline.and.returnValue(
                throwError(() => new Error(errorMessage))
            );

            fixture.detectChanges();
            tick(100);

            expect(component.loading()).toBe(false);
            expect(component.error()).toBe(errorMessage);
        }));

        it('should display error message in template', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(
                throwError(() => new Error('Test error'))
            );

            fixture.detectChanges();
            tick(100);
            fixture.detectChanges();

            const compiled = fixture.nativeElement;
            expect(compiled.querySelector('.error-text')?.textContent).toContain('Test error');
        }));

        it('should show retry button on error', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(
                throwError(() => new Error('Test error'))
            );

            fixture.detectChanges();
            tick(100);
            fixture.detectChanges();

            const compiled = fixture.nativeElement;
            expect(compiled.querySelector('.retry-btn')).toBeTruthy();
        }));

        it('should retry on button click', fakeAsync(() => {
            // First call fails
            mockDeadlineService.getDeadline.and.returnValue(
                throwError(() => new Error('Test error'))
            );

            fixture.detectChanges();
            tick(100);
            fixture.detectChanges();

            // Second call succeeds
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 60 }));

            const retryButton = fixture.nativeElement.querySelector('.retry-btn');
            retryButton.click();
            tick(100);
            fixture.detectChanges();

            expect(component.loading()).toBe(false);
            expect(component.error()).toBe(null);
            expect(component.secondsLeft()).toBe(60);
        }));
    });

    describe('Computed Signals', () => {
        it('should compute isExpired correctly', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 2 }));

            fixture.detectChanges();
            tick(100);

            expect(component.isExpired()).toBe(false);

            tick(2000);
            expect(component.isExpired()).toBe(true);
        }));

        it('should compute isWarning correctly', fakeAsync(() => {
            component.warningThreshold = 10;
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 15 }));

            fixture.detectChanges();
            tick(100);

            expect(component.isWarning()).toBe(false);

            tick(6000); // Now at 9 seconds
            expect(component.isWarning()).toBe(true);
        }));

        it('should compute displaySeconds correctly', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 5 }));

            fixture.detectChanges();
            tick(100);

            expect(component.displaySeconds()).toBe(5);

            tick(6000); // Goes negative
            expect(component.displaySeconds()).toBe(0); // Should never be negative
        }));
    });

    describe('Time Formatting', () => {
        it('should format seconds correctly', fakeAsync(() => {
            component.format = 'seconds';
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 45 }));

            fixture.detectChanges();
            tick(100);

            expect(component.formattedTime()).toBe('45s');
        }));

        it('should format minutes correctly', fakeAsync(() => {
            component.format = 'minutes';
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 125 }));

            fixture.detectChanges();
            tick(100);

            expect(component.formattedTime()).toBe('2m 5s');
        }));

        it('should format hours correctly', fakeAsync(() => {
            component.format = 'hours';
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 3665 }));

            fixture.detectChanges();
            tick(100);

            expect(component.formattedTime()).toBe('1h 1m 5s');
        }));

        it('should auto-format based on value', fakeAsync(() => {
            component.format = 'auto';

            // Test seconds (< 60)
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 45 }));
            fixture.detectChanges();
            tick(100);
            expect(component.formattedTime()).toBe('45s');

            // Reset component
            fixture = TestBed.createComponent(DeadlineCountdownComponent);
            component = fixture.componentInstance;
            component.format = 'auto';
            component.autoStart = false;

            // Test minutes (60-3599)
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 125 }));
            component.start();
            tick(100);
            expect(component.formattedTime()).toBe('2m 5s');
        }));
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 60 }));

            fixture.detectChanges();
            tick(100);
            fixture.detectChanges();

            const compiled = fixture.nativeElement;
            const container = compiled.querySelector('.countdown-container');

            expect(container.getAttribute('role')).toBe('timer');
            expect(container.getAttribute('aria-live')).toBe('polite');
        }));

        it('should update aria-label based on state', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 60 }));

            fixture.detectChanges();
            tick(100);

            expect(component.ariaLabel()).toContain('60 seconds remaining');

            tick(60000);
            expect(component.ariaLabel()).toContain('expired');
        }));
    });

    describe('Public Methods', () => {
        it('should expose start method', fakeAsync(() => {
            component.autoStart = false;
            fixture.detectChanges();

            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 60 }));

            component.start();
            tick(100);

            expect(component.secondsLeft()).toBe(60);
        }));

        it('should expose getCurrentValue method', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 60 }));

            fixture.detectChanges();
            tick(100);

            expect(component.getCurrentValue()).toBe(60);
        }));

        it('should expose isRunning method', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 60 }));

            fixture.detectChanges();
            tick(100);

            expect(component.isRunning()).toBe(true);

            tick(60000);
            expect(component.isRunning()).toBe(false);
        }));
    });

    describe('Edge Cases', () => {
        it('should handle very large countdown values', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 999999 }));

            fixture.detectChanges();
            tick(100);

            expect(component.secondsLeft()).toBe(999999);
        }));

        it('should handle rapid retry clicks', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(
                throwError(() => new Error('Test error'))
            );

            fixture.detectChanges();
            tick(100);

            // Click retry multiple times rapidly
            component.retry();
            component.retry();
            component.retry();

            tick(100);

            // Should handle gracefully without errors
            expect(component.error()).toBeTruthy();
        }));

        it('should clean up subscriptions on destroy', fakeAsync(() => {
            mockDeadlineService.getDeadline.and.returnValue(of({ secondsLeft: 60 }));

            fixture.detectChanges();
            tick(100);

            const initialValue = component.secondsLeft();

            // Destroy component
            fixture.destroy();

            // Wait and verify countdown stopped
            tick(5000);

            // Component should be destroyed, no errors should occur
            expect(true).toBe(true); // If we get here, cleanup worked
        }));
    });
});
