import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DeadlineService, DeadlineResponse } from './deadline.service';

describe('DeadlineService', () => {
    let service: DeadlineService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [DeadlineService]
        });

        service = TestBed.inject(DeadlineService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        // Verify that no unmatched requests are outstanding
        httpMock.verify();
    });

    describe('Basic Functionality', () => {
        it('should be created', () => {
            expect(service).toBeTruthy();
        });

        it('should fetch deadline successfully', (done) => {
            const mockResponse: DeadlineResponse = { secondsLeft: 60 };

            service.getDeadline().subscribe({
                next: (response) => {
                    expect(response).toEqual(mockResponse);
                    expect(response.secondsLeft).toBe(60);
                    done();
                },
                error: () => fail('Should not have failed')
            });

            const req = httpMock.expectOne('/api/deadline');
            expect(req.request.method).toBe('GET');
            req.flush(mockResponse);
        });

        it('should return correct data type', (done) => {
            const mockResponse: DeadlineResponse = { secondsLeft: 120 };

            service.getDeadline().subscribe({
                next: (response) => {
                    expect(typeof response.secondsLeft).toBe('number');
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush(mockResponse);
        });
    });

    describe('Response Validation', () => {
        it('should reject null response', (done) => {
            service.getDeadline().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toContain('null or undefined');
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush(null);
        });

        it('should reject response without secondsLeft property', (done) => {
            service.getDeadline().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toContain('missing "secondsLeft"');
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush({});
        });

        it('should reject response with invalid data type', (done) => {
            service.getDeadline().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toContain('Invalid data type');
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush({ secondsLeft: 'not a number' });
        });

        it('should reject NaN values', (done) => {
            service.getDeadline().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toContain('finite number');
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush({ secondsLeft: NaN });
        });

        it('should reject Infinity values', (done) => {
            service.getDeadline().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toContain('finite number');
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush({ secondsLeft: Infinity });
        });

        it('should accept negative values with warning', (done) => {
            spyOn(console, 'warn');
            const mockResponse: DeadlineResponse = { secondsLeft: -10 };

            service.getDeadline().subscribe({
                next: (response) => {
                    expect(response.secondsLeft).toBe(-10);
                    expect(console.warn).toHaveBeenCalled();
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush(mockResponse);
        });

        it('should accept zero value', (done) => {
            const mockResponse: DeadlineResponse = { secondsLeft: 0 };

            service.getDeadline().subscribe({
                next: (response) => {
                    expect(response.secondsLeft).toBe(0);
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush(mockResponse);
        });
    });

    describe('Error Handling', () => {
        it('should handle network error (status 0)', (done) => {
            service.getDeadline().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toContain('Unable to connect');
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.error(new ProgressEvent('error'), { status: 0 });
        });

        it('should handle 404 error', (done) => {
            service.getDeadline().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toContain('404');
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush('Not found', { status: 404, statusText: 'Not Found' });
        });

        it('should handle 500 error', (done) => {
            service.getDeadline().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toContain('500');
                    expect(error.message).toContain('Server error');
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
        });

        it('should handle 503 Service Unavailable', (done) => {
            service.getDeadline().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toContain('503');
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush('Service unavailable', { status: 503, statusText: 'Service Unavailable' });
        });

        it('should log errors to console', (done) => {
            spyOn(console, 'error');

            service.getDeadline().subscribe({
                next: () => fail('Should have failed'),
                error: () => {
                    expect(console.error).toHaveBeenCalled();
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.error(new ProgressEvent('error'));
        });
    });

    describe('Configuration', () => {
        it('should have default configuration', () => {
            const config = service.getConfig();
            expect(config.apiUrl).toBe('/api/deadline');
            expect(config.timeoutMs).toBe(10000);
            expect(config.retryAttempts).toBe(2);
        });

        it('should allow updating configuration', () => {
            service.updateConfig({ timeoutMs: 5000 });
            const config = service.getConfig();
            expect(config.timeoutMs).toBe(5000);
        });

        it('should allow partial configuration updates', () => {
            service.updateConfig({ retryAttempts: 3 });
            const config = service.getConfig();
            expect(config.retryAttempts).toBe(3);
            expect(config.apiUrl).toBe('/api/deadline'); // Should remain unchanged
        });

        it('should return a copy of configuration (immutability)', () => {
            const config1 = service.getConfig();
            const config2 = service.getConfig();
            expect(config1).not.toBe(config2); // Different objects
            expect(config1).toEqual(config2); // Same values
        });
    });

    describe('Edge Cases', () => {
        it('should handle very large secondsLeft values', (done) => {
            const mockResponse: DeadlineResponse = { secondsLeft: 999999999 };

            service.getDeadline().subscribe({
                next: (response) => {
                    expect(response.secondsLeft).toBe(999999999);
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush(mockResponse);
        });

        it('should handle decimal values', (done) => {
            const mockResponse: DeadlineResponse = { secondsLeft: 60.5 };

            service.getDeadline().subscribe({
                next: (response) => {
                    expect(response.secondsLeft).toBe(60.5);
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush(mockResponse);
        });

        it('should handle response with extra properties', (done) => {
            const mockResponse = {
                secondsLeft: 60,
                extraProperty: 'should be ignored'
            };

            service.getDeadline().subscribe({
                next: (response) => {
                    expect(response.secondsLeft).toBe(60);
                    done();
                }
            });

            const req = httpMock.expectOne('/api/deadline');
            req.flush(mockResponse);
        });
    });

    describe('Retry Logic', () => {
        it('should retry failed requests', (done) => {
            let attemptCount = 0;

            service.getDeadline().subscribe({
                next: (response) => {
                    expect(attemptCount).toBeGreaterThan(1);
                    expect(response.secondsLeft).toBe(60);
                    done();
                },
                error: () => fail('Should have succeeded after retry')
            });

            // Intercept multiple requests (initial + retries)
            const requests = httpMock.match('/api/deadline');

            // Fail first attempts
            requests.slice(0, -1).forEach(req => {
                attemptCount++;
                req.error(new ProgressEvent('error'));
            });

            // Succeed on last attempt
            if (requests.length > 0) {
                attemptCount++;
                requests[requests.length - 1].flush({ secondsLeft: 60 });
            }
        });
    });
});
