/**
 * Camera Coverage Problem - Enhanced Version
 * 
 * This module solves the problem of determining whether a set of hardware cameras
 * can collectively cover all combinations of subject distances and light levels
 * required by a software camera.
 * 
 * Problem: Given a target 2D range (distance × light level) and a set of hardware
 * cameras each covering their own 2D range, determine if the union of all hardware
 * camera ranges completely covers the target range.
 * 
 * Algorithm: Sweep line with coordinate compression
 * 1. Collect all unique distance and light level boundaries
 * 2. Create a grid of small rectangles from these boundaries
 * 3. For each small rectangle within the target area, verify at least one camera covers it
 * 
 * Time Complexity: O(n² × m) where n = number of unique coordinates, m = number of cameras
 * Space Complexity: O(n²) for the grid
 * 
 * @module camera-coverage
 * @version 2.0.0
 * @author Darshak
 */

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Represents a range with minimum and maximum values (inclusive).
 * Both min and max must be finite numbers with min <= max.
 */
export interface Range {
    /** Minimum value of the range (inclusive) */
    min: number;
    /** Maximum value of the range (inclusive) */
    max: number;
}

/**
 * Represents the desired characteristics of the software camera.
 * Defines the 2D space that must be covered by hardware cameras.
 */
export interface SoftwareCameraSpec {
    /** Range of subject distances the software camera should support */
    distanceRange: Range;
    /** Range of light levels the software camera should support */
    lightRange: Range;
}

/**
 * Represents a hardware camera with its supported ranges.
 * Each camera covers a rectangular region in the distance-light space.
 */
export interface HardwareCamera {
    /** Unique identifier for the camera */
    id: string;
    /** Range of subject distances this camera supports */
    distanceRange: Range;
    /** Range of light levels this camera supports */
    lightRange: Range;
}

/**
 * Represents an uncovered region in the target space.
 */
export interface UncoveredRegion {
    /** Distance range of the uncovered region */
    distanceRange: Range;
    /** Light level range of the uncovered region */
    lightRange: Range;
}

/**
 * Result of the coverage check with detailed information.
 */
export interface CoverageResult {
    /** Whether the hardware cameras fully cover the required range */
    isSufficient: boolean;
    /** Description of the result */
    message: string;
    /** Uncovered regions if any (for debugging and visualization) */
    uncoveredRegions?: UncoveredRegion[];
    /** Statistics about the coverage check */
    statistics?: CoverageStatistics;
}

/**
 * Statistics about the coverage analysis.
 */
export interface CoverageStatistics {
    /** Number of hardware cameras analyzed */
    totalCameras: number;
    /** Number of unique distance boundaries */
    distanceBoundaries: number;
    /** Number of unique light boundaries */
    lightBoundaries: number;
    /** Total number of grid cells checked */
    gridCellsChecked: number;
    /** Number of uncovered cells found */
    uncoveredCells: number;
    /** Coverage percentage (0-100) */
    coveragePercentage: number;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates a range object to ensure it meets all requirements.
 * 
 * @param range - The range to validate
 * @param name - Name of the range for error messages
 * @throws Error if the range is invalid
 */
function validateRange(range: Range, name: string): void {
    if (!range) {
        throw new Error(`${name} is null or undefined`);
    }

    if (typeof range.min !== 'number' || typeof range.max !== 'number') {
        throw new Error(`${name} must have numeric min and max values`);
    }

    if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) {
        throw new Error(`${name} must have finite min and max values`);
    }

    if (range.min > range.max) {
        throw new Error(`${name} has min (${range.min}) greater than max (${range.max})`);
    }
}

/**
 * Validates a software camera specification.
 * 
 * @param spec - The specification to validate
 * @throws Error if the specification is invalid
 */
function validateSoftwareCameraSpec(spec: SoftwareCameraSpec): void {
    if (!spec) {
        throw new Error('Software camera specification is null or undefined');
    }

    validateRange(spec.distanceRange, 'Distance range');
    validateRange(spec.lightRange, 'Light range');
}

/**
 * Validates a hardware camera.
 * 
 * @param camera - The camera to validate
 * @param index - Index of the camera in the array (for error messages)
 * @throws Error if the camera is invalid
 */
function validateHardwareCamera(camera: HardwareCamera, index: number): void {
    if (!camera) {
        throw new Error(`Hardware camera at index ${index} is null or undefined`);
    }

    if (!camera.id || typeof camera.id !== 'string') {
        throw new Error(`Hardware camera at index ${index} has invalid or missing id`);
    }

    validateRange(camera.distanceRange, `Camera "${camera.id}" distance range`);
    validateRange(camera.lightRange, `Camera "${camera.id}" light range`);
}

/**
 * Validates an array of hardware cameras.
 * 
 * @param cameras - The cameras to validate
 * @throws Error if any camera is invalid or if there are duplicate IDs
 */
function validateHardwareCameras(cameras: HardwareCamera[]): void {
    if (!Array.isArray(cameras)) {
        throw new Error('Hardware cameras must be an array');
    }

    cameras.forEach((camera, index) => validateHardwareCamera(camera, index));

    // Check for duplicate IDs
    const ids = cameras.map(c => c.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        throw new Error(`Duplicate camera IDs found: ${duplicates.join(', ')}`);
    }
}

// =============================================================================
// Core Algorithm Functions
// =============================================================================

/**
 * Checks if a hardware camera covers a specific point in 2D space.
 * 
 * @param camera - The hardware camera to check
 * @param distance - The distance value to check
 * @param lightLevel - The light level value to check
 * @returns True if the camera covers the point, false otherwise
 */
function cameraCoversPoint(
    camera: HardwareCamera,
    distance: number,
    lightLevel: number
): boolean {
    return (
        distance >= camera.distanceRange.min &&
        distance <= camera.distanceRange.max &&
        lightLevel >= camera.lightRange.min &&
        lightLevel <= camera.lightRange.max
    );
}

/**
 * Checks if a hardware camera fully covers a rectangular region.
 * 
 * A camera covers a region if the region is completely contained within
 * the camera's coverage area.
 * 
 * @param camera - The hardware camera to check
 * @param distMin - Minimum distance of the region
 * @param distMax - Maximum distance of the region
 * @param lightMin - Minimum light level of the region
 * @param lightMax - Maximum light level of the region
 * @returns True if the camera fully covers the region, false otherwise
 */
function cameraCoversRegion(
    camera: HardwareCamera,
    distMin: number,
    distMax: number,
    lightMin: number,
    lightMax: number
): boolean {
    return (
        camera.distanceRange.min <= distMin &&
        camera.distanceRange.max >= distMax &&
        camera.lightRange.min <= lightMin &&
        camera.lightRange.max >= lightMax
    );
}

/**
 * Checks if any camera from the list covers a rectangular region.
 * 
 * @param cameras - Array of hardware cameras to check
 * @param distMin - Minimum distance of the region
 * @param distMax - Maximum distance of the region
 * @param lightMin - Minimum light level of the region
 * @param lightMax - Maximum light level of the region
 * @returns True if at least one camera covers the region, false otherwise
 */
function anyCoversRegion(
    cameras: HardwareCamera[],
    distMin: number,
    distMax: number,
    lightMin: number,
    lightMax: number
): boolean {
    return cameras.some(camera =>
        cameraCoversRegion(camera, distMin, distMax, lightMin, lightMax)
    );
}

/**
 * Collects all unique boundary values from the target range and camera ranges,
 * then sorts them in ascending order.
 * 
 * This implements coordinate compression, reducing the continuous 2D space
 * into a discrete grid of cells.
 * 
 * @param target - The target range to cover
 * @param cameraRanges - Array of camera ranges
 * @returns Sorted array of unique boundary values
 */
function collectBoundaries(
    target: Range,
    cameraRanges: Range[]
): number[] {
    const boundaries = new Set<number>();

    // Add target boundaries (always included)
    boundaries.add(target.min);
    boundaries.add(target.max);

    // Add camera boundaries that fall within or at the target range
    for (const range of cameraRanges) {
        // Include boundaries that are within the target range
        if (range.min >= target.min && range.min <= target.max) {
            boundaries.add(range.min);
        }
        if (range.max >= target.min && range.max <= target.max) {
            boundaries.add(range.max);
        }
    }

    // Convert to array and sort numerically
    return Array.from(boundaries).sort((a, b) => a - b);
}

/**
 * Calculates coverage statistics for the analysis.
 * 
 * @param totalCameras - Number of cameras analyzed
 * @param distBoundaries - Number of distance boundaries
 * @param lightBoundaries - Number of light boundaries
 * @param uncoveredCells - Number of uncovered cells
 * @returns Coverage statistics object
 */
function calculateStatistics(
    totalCameras: number,
    distBoundaries: number,
    lightBoundaries: number,
    uncoveredCells: number
): CoverageStatistics {
    const totalCells = Math.max(0, (distBoundaries - 1) * (lightBoundaries - 1));
    const coveredCells = totalCells - uncoveredCells;
    const coveragePercentage = totalCells > 0
        ? Math.round((coveredCells / totalCells) * 100)
        : 0;

    return {
        totalCameras,
        distanceBoundaries: distBoundaries,
        lightBoundaries: lightBoundaries,
        gridCellsChecked: totalCells,
        uncoveredCells,
        coveragePercentage
    };
}

// =============================================================================
// Main Coverage Check Function
// =============================================================================

/**
 * Tests whether a set of hardware cameras can fully cover the desired
 * characteristics of a software camera.
 * 
 * This function implements a sweep-line algorithm with coordinate compression
 * to efficiently check coverage across a 2D space.
 * 
 * @param softwareSpec - The desired range of distances and light levels
 * @param hardwareCameras - List of available hardware cameras
 * @returns CoverageResult indicating whether coverage is sufficient
 * @throws Error if inputs are invalid
 * 
 * @example
 * ```typescript
 * const result = checkCameraCoverage(
 *   {
 *     distanceRange: { min: 1, max: 20 },
 *     lightRange: { min: 100, max: 1000 }
 *   },
 *   [
 *     {
 *       id: 'cam1',
 *       distanceRange: { min: 0, max: 10 },
 *       lightRange: { min: 0, max: 2000 }
 *     },
 *     {
 *       id: 'cam2',
 *       distanceRange: { min: 10, max: 30 },
 *       lightRange: { min: 0, max: 2000 }
 *     }
 *   ]
 * );
 * 
 * console.log(result.isSufficient); // true
 * console.log(result.statistics.coveragePercentage); // 100
 * ```
 */
export function checkCameraCoverage(
    softwareSpec: SoftwareCameraSpec,
    hardwareCameras: HardwareCamera[]
): CoverageResult {
    // Validate inputs
    try {
        validateSoftwareCameraSpec(softwareSpec);
        validateHardwareCameras(hardwareCameras);
    } catch (error) {
        return {
            isSufficient: false,
            message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            uncoveredRegions: [{
                distanceRange: softwareSpec.distanceRange,
                lightRange: softwareSpec.lightRange
            }]
        };
    }

    // Edge case: no hardware cameras provided
    if (hardwareCameras.length === 0) {
        return {
            isSufficient: false,
            message: 'No hardware cameras provided',
            uncoveredRegions: [{
                distanceRange: softwareSpec.distanceRange,
                lightRange: softwareSpec.lightRange
            }],
            statistics: calculateStatistics(0, 2, 2, 1)
        };
    }

    // Collect all unique distance and light level boundaries
    const distanceBoundaries = collectBoundaries(
        softwareSpec.distanceRange,
        hardwareCameras.map(c => c.distanceRange)
    );

    const lightBoundaries = collectBoundaries(
        softwareSpec.lightRange,
        hardwareCameras.map(c => c.lightRange)
    );

    // Track uncovered regions
    const uncoveredRegions: UncoveredRegion[] = [];

    // Check each cell in the grid
    for (let i = 0; i < distanceBoundaries.length - 1; i++) {
        for (let j = 0; j < lightBoundaries.length - 1; j++) {
            const distMin = distanceBoundaries[i];
            const distMax = distanceBoundaries[i + 1];
            const lightMin = lightBoundaries[j];
            const lightMax = lightBoundaries[j + 1];

            // Check if this cell is within the target range
            const isWithinTarget = (
                distMin >= softwareSpec.distanceRange.min &&
                distMax <= softwareSpec.distanceRange.max &&
                lightMin >= softwareSpec.lightRange.min &&
                lightMax <= softwareSpec.lightRange.max
            );

            if (isWithinTarget) {
                // Check if any camera covers this cell
                if (!anyCoversRegion(hardwareCameras, distMin, distMax, lightMin, lightMax)) {
                    uncoveredRegions.push({
                        distanceRange: { min: distMin, max: distMax },
                        lightRange: { min: lightMin, max: lightMax }
                    });
                }
            }
        }
    }

    // Calculate statistics
    const statistics = calculateStatistics(
        hardwareCameras.length,
        distanceBoundaries.length,
        lightBoundaries.length,
        uncoveredRegions.length
    );

    // Return result
    if (uncoveredRegions.length === 0) {
        return {
            isSufficient: true,
            message: `Coverage is complete. ${hardwareCameras.length} hardware camera(s) fully cover the required range.`,
            statistics
        };
    } else {
        return {
            isSufficient: false,
            message: `Coverage is incomplete. ${uncoveredRegions.length} region(s) remain uncovered (${statistics.coveragePercentage}% covered).`,
            uncoveredRegions,
            statistics
        };
    }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Formats a range as a string for display.
 * 
 * @param range - The range to format
 * @returns Formatted string representation
 */
export function formatRange(range: Range): string {
    return `[${range.min}, ${range.max}]`;
}

/**
 * Calculates the area of a range (max - min).
 * 
 * @param range - The range to calculate area for
 * @returns The area of the range
 */
export function rangeArea(range: Range): number {
    return range.max - range.min;
}

/**
 * Calculates the 2D area of a region.
 * 
 * @param distanceRange - Distance range of the region
 * @param lightRange - Light range of the region
 * @returns The 2D area
 */
export function regionArea(distanceRange: Range, lightRange: Range): number {
    return rangeArea(distanceRange) * rangeArea(lightRange);
}

/**
 * Checks if two ranges overlap.
 * 
 * @param range1 - First range
 * @param range2 - Second range
 * @returns True if ranges overlap, false otherwise
 */
export function rangesOverlap(range1: Range, range2: Range): boolean {
    return range1.min <= range2.max && range2.min <= range1.max;
}

// =============================================================================
// Test Runner
// =============================================================================

/**
 * Runs comprehensive test cases for the camera coverage algorithm.
 * Outputs results to console with detailed formatting.
 */
export function runTests(): void {
    console.log('='.repeat(70));
    console.log('Camera Coverage Algorithm - Test Suite');
    console.log('='.repeat(70));

    const tests = [
        {
            name: 'Single camera covers entire range',
            spec: {
                distanceRange: { min: 1, max: 10 },
                lightRange: { min: 100, max: 1000 }
            },
            cameras: [
                {
                    id: 'camera-1',
                    distanceRange: { min: 0, max: 15 },
                    lightRange: { min: 50, max: 1500 }
                }
            ],
            expectedSuccess: true
        },
        {
            name: 'Two cameras together cover the range',
            spec: {
                distanceRange: { min: 1, max: 20 },
                lightRange: { min: 100, max: 1000 }
            },
            cameras: [
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
            ],
            expectedSuccess: true
        },
        {
            name: 'Gap in distance coverage (should fail)',
            spec: {
                distanceRange: { min: 1, max: 20 },
                lightRange: { min: 100, max: 1000 }
            },
            cameras: [
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
            ],
            expectedSuccess: false
        },
        {
            name: 'Gap in light level coverage (should fail)',
            spec: {
                distanceRange: { min: 1, max: 10 },
                lightRange: { min: 100, max: 1000 }
            },
            cameras: [
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
            ],
            expectedSuccess: false
        },
        {
            name: 'Four cameras covering quadrants',
            spec: {
                distanceRange: { min: 0, max: 100 },
                lightRange: { min: 0, max: 100 }
            },
            cameras: [
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
            ],
            expectedSuccess: true
        },
        {
            name: 'No cameras provided (should fail)',
            spec: {
                distanceRange: { min: 1, max: 10 },
                lightRange: { min: 100, max: 1000 }
            },
            cameras: [],
            expectedSuccess: false
        },
        {
            name: 'Three overlapping cameras with full coverage',
            spec: {
                distanceRange: { min: 5, max: 15 },
                lightRange: { min: 200, max: 800 }
            },
            cameras: [
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
            ],
            expectedSuccess: true
        }
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach((test, index) => {
        console.log(`\n📷 Test ${index + 1}: ${test.name}`);
        const result = checkCameraCoverage(test.spec, test.cameras);

        const success = result.isSufficient === test.expectedSuccess;
        if (success) {
            passed++;
            console.log(`Result: ✅ PASS`);
        } else {
            failed++;
            console.log(`Result: ❌ FAIL`);
        }

        console.log(`Message: ${result.message}`);

        if (result.statistics) {
            console.log(`Statistics: ${result.statistics.coveragePercentage}% coverage, ` +
                `${result.statistics.gridCellsChecked} cells checked`);
        }

        if (result.uncoveredRegions && result.uncoveredRegions.length > 0) {
            console.log(`Uncovered regions: ${result.uncoveredRegions.length}`);
            result.uncoveredRegions.slice(0, 3).forEach((region, idx) => {
                console.log(`  ${idx + 1}. Distance: ${formatRange(region.distanceRange)}, ` +
                    `Light: ${formatRange(region.lightRange)}`);
            });
            if (result.uncoveredRegions.length > 3) {
                console.log(`  ... and ${result.uncoveredRegions.length - 3} more`);
            }
        }
    });

    console.log('\n' + '='.repeat(70));
    console.log(`Test Suite Complete: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(70));
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    runTests();
}
