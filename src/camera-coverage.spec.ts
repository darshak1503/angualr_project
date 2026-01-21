/**
 * Unit tests for the Camera Coverage Algorithm
 */

import {
    checkCameraCoverage,
    formatRange,
    rangeArea,
    regionArea,
    rangesOverlap,
    Range,
    SoftwareCameraSpec,
    HardwareCamera
} from './camera-coverage';

describe('Camera Coverage Algorithm', () => {

    describe('Basic Coverage Tests', () => {
        it('should return true when single camera covers entire range', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 1, max: 10 },
                lightRange: { min: 100, max: 1000 }
            };

            const cameras: HardwareCamera[] = [{
                id: 'camera-1',
                distanceRange: { min: 0, max: 15 },
                lightRange: { min: 50, max: 1500 }
            }];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(true);
            expect(result.message).toContain('complete');
            expect(result.statistics?.coveragePercentage).toBe(100);
        });

        it('should return true when two cameras together cover the range', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 1, max: 20 },
                lightRange: { min: 100, max: 1000 }
            };

            const cameras: HardwareCamera[] = [
                {
                    id: 'close-range',
                    distanceRange: { min: 0, max: 10 },
                    lightRange: { min: 0, max: 2000 }
                },
                {
                    id: 'far-range',
                    distanceRange: { min: 10, max: 30 },
                    lightRange: { min: 0, max: 2000 }
                }
            ];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(true);
            expect(result.statistics?.totalCameras).toBe(2);
        });

        it('should return false when there is a gap in distance coverage', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 1, max: 20 },
                lightRange: { min: 100, max: 1000 }
            };

            const cameras: HardwareCamera[] = [
                {
                    id: 'close-range',
                    distanceRange: { min: 0, max: 8 },
                    lightRange: { min: 0, max: 2000 }
                },
                {
                    id: 'far-range',
                    distanceRange: { min: 12, max: 30 },
                    lightRange: { min: 0, max: 2000 }
                }
            ];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(false);
            expect(result.uncoveredRegions).toBeDefined();
            expect(result.uncoveredRegions!.length).toBeGreaterThan(0);
        });

        it('should return false when there is a gap in light level coverage', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 1, max: 10 },
                lightRange: { min: 100, max: 1000 }
            };

            const cameras: HardwareCamera[] = [
                {
                    id: 'bright-light',
                    distanceRange: { min: 0, max: 15 },
                    lightRange: { min: 500, max: 2000 }
                },
                {
                    id: 'dim-light',
                    distanceRange: { min: 0, max: 15 },
                    lightRange: { min: 0, max: 300 }
                }
            ];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(false);
            expect(result.message).toContain('incomplete');
        });
    });

    describe('Edge Cases', () => {
        it('should handle no cameras provided', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 1, max: 10 },
                lightRange: { min: 100, max: 1000 }
            };

            const result = checkCameraCoverage(spec, []);

            expect(result.isSufficient).toBe(false);
            expect(result.message).toContain('No hardware cameras');
        });

        it('should handle exact boundary matching', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 0, max: 10 },
                lightRange: { min: 0, max: 100 }
            };

            const cameras: HardwareCamera[] = [{
                id: 'exact-match',
                distanceRange: { min: 0, max: 10 },
                lightRange: { min: 0, max: 100 }
            }];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(true);
        });

        it('should handle zero-width ranges', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 5, max: 5 },
                lightRange: { min: 100, max: 100 }
            };

            const cameras: HardwareCamera[] = [{
                id: 'point-camera',
                distanceRange: { min: 0, max: 10 },
                lightRange: { min: 0, max: 200 }
            }];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(true);
        });

        it('should handle very large ranges', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 0, max: 1000000 },
                lightRange: { min: 0, max: 1000000 }
            };

            const cameras: HardwareCamera[] = [{
                id: 'wide-range',
                distanceRange: { min: 0, max: 1000000 },
                lightRange: { min: 0, max: 1000000 }
            }];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(true);
        });

        it('should handle overlapping cameras', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 5, max: 15 },
                lightRange: { min: 200, max: 800 }
            };

            const cameras: HardwareCamera[] = [
                {
                    id: 'cam-a',
                    distanceRange: { min: 0, max: 12 },
                    lightRange: { min: 100, max: 600 }
                },
                {
                    id: 'cam-b',
                    distanceRange: { min: 8, max: 20 },
                    lightRange: { min: 100, max: 600 }
                },
                {
                    id: 'cam-c',
                    distanceRange: { min: 3, max: 18 },
                    lightRange: { min: 500, max: 1000 }
                }
            ];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(true);
        });
    });

    describe('Validation Tests', () => {
        it('should reject invalid software spec (min > max for distance)', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 10, max: 1 },
                lightRange: { min: 100, max: 1000 }
            };

            const cameras: HardwareCamera[] = [{
                id: 'camera-1',
                distanceRange: { min: 0, max: 15 },
                lightRange: { min: 0, max: 2000 }
            }];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(false);
            expect(result.message).toContain('Validation error');
        });

        it('should reject invalid software spec (min > max for light)', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 1, max: 10 },
                lightRange: { min: 1000, max: 100 }
            };

            const cameras: HardwareCamera[] = [{
                id: 'camera-1',
                distanceRange: { min: 0, max: 15 },
                lightRange: { min: 0, max: 2000 }
            }];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(false);
            expect(result.message).toContain('Validation error');
        });

        it('should reject cameras with duplicate IDs', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 1, max: 10 },
                lightRange: { min: 100, max: 1000 }
            };

            const cameras: HardwareCamera[] = [
                {
                    id: 'camera-1',
                    distanceRange: { min: 0, max: 15 },
                    lightRange: { min: 0, max: 2000 }
                },
                {
                    id: 'camera-1', // Duplicate ID
                    distanceRange: { min: 0, max: 15 },
                    lightRange: { min: 0, max: 2000 }
                }
            ];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(false);
            expect(result.message).toContain('Duplicate camera IDs');
        });

        it('should reject camera with invalid range (min > max)', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 1, max: 10 },
                lightRange: { min: 100, max: 1000 }
            };

            const cameras: HardwareCamera[] = [{
                id: 'invalid-camera',
                distanceRange: { min: 15, max: 0 }, // Invalid
                lightRange: { min: 0, max: 2000 }
            }];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(false);
            expect(result.message).toContain('Validation error');
        });

        it('should reject camera with missing ID', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 1, max: 10 },
                lightRange: { min: 100, max: 1000 }
            };

            const cameras: HardwareCamera[] = [{
                id: '', // Empty ID
                distanceRange: { min: 0, max: 15 },
                lightRange: { min: 0, max: 2000 }
            }];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(false);
            expect(result.message).toContain('invalid or missing id');
        });
    });

    describe('Statistics Tests', () => {
        it('should provide accurate statistics for full coverage', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 0, max: 100 },
                lightRange: { min: 0, max: 100 }
            };

            const cameras: HardwareCamera[] = [{
                id: 'full-coverage',
                distanceRange: { min: 0, max: 100 },
                lightRange: { min: 0, max: 100 }
            }];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.statistics).toBeDefined();
            expect(result.statistics!.totalCameras).toBe(1);
            expect(result.statistics!.coveragePercentage).toBe(100);
            expect(result.statistics!.uncoveredCells).toBe(0);
        });

        it('should provide accurate statistics for partial coverage', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 0, max: 100 },
                lightRange: { min: 0, max: 100 }
            };

            const cameras: HardwareCamera[] = [{
                id: 'partial-coverage',
                distanceRange: { min: 0, max: 50 },
                lightRange: { min: 0, max: 100 }
            }];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.statistics).toBeDefined();
            expect(result.statistics!.coveragePercentage).toBeLessThan(100);
            expect(result.statistics!.uncoveredCells).toBeGreaterThan(0);
        });
    });

    describe('Utility Functions', () => {
        describe('formatRange', () => {
            it('should format range correctly', () => {
                const range: Range = { min: 1, max: 10 };
                expect(formatRange(range)).toBe('[1, 10]');
            });

            it('should handle negative values', () => {
                const range: Range = { min: -5, max: 5 };
                expect(formatRange(range)).toBe('[-5, 5]');
            });
        });

        describe('rangeArea', () => {
            it('should calculate range area correctly', () => {
                const range: Range = { min: 0, max: 10 };
                expect(rangeArea(range)).toBe(10);
            });

            it('should handle zero-width range', () => {
                const range: Range = { min: 5, max: 5 };
                expect(rangeArea(range)).toBe(0);
            });
        });

        describe('regionArea', () => {
            it('should calculate 2D region area correctly', () => {
                const distRange: Range = { min: 0, max: 10 };
                const lightRange: Range = { min: 0, max: 20 };
                expect(regionArea(distRange, lightRange)).toBe(200);
            });
        });

        describe('rangesOverlap', () => {
            it('should detect overlapping ranges', () => {
                const range1: Range = { min: 0, max: 10 };
                const range2: Range = { min: 5, max: 15 };
                expect(rangesOverlap(range1, range2)).toBe(true);
            });

            it('should detect non-overlapping ranges', () => {
                const range1: Range = { min: 0, max: 10 };
                const range2: Range = { min: 15, max: 20 };
                expect(rangesOverlap(range1, range2)).toBe(false);
            });

            it('should detect touching ranges as overlapping', () => {
                const range1: Range = { min: 0, max: 10 };
                const range2: Range = { min: 10, max: 20 };
                expect(rangesOverlap(range1, range2)).toBe(true);
            });
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle four cameras covering quadrants', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 0, max: 100 },
                lightRange: { min: 0, max: 100 }
            };

            const cameras: HardwareCamera[] = [
                {
                    id: 'q1',
                    distanceRange: { min: 0, max: 50 },
                    lightRange: { min: 50, max: 100 }
                },
                {
                    id: 'q2',
                    distanceRange: { min: 50, max: 100 },
                    lightRange: { min: 50, max: 100 }
                },
                {
                    id: 'q3',
                    distanceRange: { min: 0, max: 50 },
                    lightRange: { min: 0, max: 50 }
                },
                {
                    id: 'q4',
                    distanceRange: { min: 50, max: 100 },
                    lightRange: { min: 0, max: 50 }
                }
            ];

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(true);
            expect(result.statistics!.totalCameras).toBe(4);
        });

        it('should handle many small cameras', () => {
            const spec: SoftwareCameraSpec = {
                distanceRange: { min: 0, max: 10 },
                lightRange: { min: 0, max: 10 }
            };

            const cameras: HardwareCamera[] = [];
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    cameras.push({
                        id: `cam-${i}-${j}`,
                        distanceRange: { min: i, max: i + 1 },
                        lightRange: { min: j, max: j + 1 }
                    });
                }
            }

            const result = checkCameraCoverage(spec, cameras);

            expect(result.isSufficient).toBe(true);
            expect(result.statistics!.totalCameras).toBe(100);
        });
    });
});
