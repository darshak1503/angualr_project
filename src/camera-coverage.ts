/**
 * Camera Coverage Problem
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
 */

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Represents a range with minimum and maximum values (inclusive)
 */
interface Range {
    min: number;
    max: number;
}

/**
 * Represents the desired characteristics of the software camera
 */
interface SoftwareCameraSpec {
    /** Range of subject distances the software camera should support */
    distanceRange: Range;
    /** Range of light levels the software camera should support */
    lightRange: Range;
}

/**
 * Represents a hardware camera with its supported ranges
 */
interface HardwareCamera {
    /** Unique identifier for the camera */
    id: string;
    /** Range of subject distances this camera supports */
    distanceRange: Range;
    /** Range of light levels this camera supports */
    lightRange: Range;
}

/**
 * Result of the coverage check
 */
interface CoverageResult {
    /** Whether the hardware cameras fully cover the required range */
    isSufficient: boolean;
    /** Description of the result */
    message: string;
    /** Uncovered regions if any (for debugging) */
    uncoveredRegions?: Array<{
        distanceRange: Range;
        lightRange: Range;
    }>;
}

// =============================================================================
// Core Algorithm
// =============================================================================

/**
 * Checks if a hardware camera covers a specific point
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
 * Checks if a hardware camera fully covers a rectangular region
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
 * Checks if any camera from the list covers a rectangular region
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
 * Collects all unique boundary values and sorts them
 */
function collectBoundaries(
    target: Range,
    cameraRanges: Range[]
): number[] {
    const boundaries = new Set<number>();

    // Add target boundaries
    boundaries.add(target.min);
    boundaries.add(target.max);

    // Add camera boundaries that fall within or at the target range
    for (const range of cameraRanges) {
        if (range.min >= target.min && range.min <= target.max) {
            boundaries.add(range.min);
        }
        if (range.max >= target.min && range.max <= target.max) {
            boundaries.add(range.max);
        }
    }

    return Array.from(boundaries).sort((a, b) => a - b);
}

/**
 * Main function: Tests whether a set of hardware cameras can fully cover
 * the desired characteristics of a software camera.
 * 
 * @param softwareSpec - The desired range of distances and light levels
 * @param hardwareCameras - List of available hardware cameras
 * @returns CoverageResult indicating whether coverage is sufficient
 */
function checkCameraCoverage(
    softwareSpec: SoftwareCameraSpec,
    hardwareCameras: HardwareCamera[]
): CoverageResult {
    // Edge case: no hardware cameras provided
    if (hardwareCameras.length === 0) {
        return {
            isSufficient: false,
            message: 'No hardware cameras provided',
            uncoveredRegions: [{
                distanceRange: softwareSpec.distanceRange,
                lightRange: softwareSpec.lightRange
            }]
        };
    }

    // Validate ranges
    if (softwareSpec.distanceRange.min > softwareSpec.distanceRange.max ||
        softwareSpec.lightRange.min > softwareSpec.lightRange.max) {
        return {
            isSufficient: false,
            message: 'Invalid software camera specification: min > max'
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
    const uncoveredRegions: Array<{ distanceRange: Range; lightRange: Range }> = [];

    // Check each cell in the grid
    for (let i = 0; i < distanceBoundaries.length - 1; i++) {
        for (let j = 0; j < lightBoundaries.length - 1; j++) {
            const distMin = distanceBoundaries[i];
            const distMax = distanceBoundaries[i + 1];
            const lightMin = lightBoundaries[j];
            const lightMax = lightBoundaries[j + 1];

            // Check if this cell is within the target range
            if (distMin >= softwareSpec.distanceRange.min &&
                distMax <= softwareSpec.distanceRange.max &&
                lightMin >= softwareSpec.lightRange.min &&
                lightMax <= softwareSpec.lightRange.max) {

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

    if (uncoveredRegions.length === 0) {
        return {
            isSufficient: true,
            message: `Coverage is complete. ${hardwareCameras.length} hardware camera(s) fully cover the required range.`
        };
    } else {
        return {
            isSufficient: false,
            message: `Coverage is incomplete. ${uncoveredRegions.length} region(s) remain uncovered.`,
            uncoveredRegions
        };
    }
}

// =============================================================================
// Test Cases
// =============================================================================

function runTests(): void {
    console.log('='.repeat(70));
    console.log('Camera Coverage Algorithm - Test Suite');
    console.log('='.repeat(70));

    // Test 1: Single camera that fully covers the requirement
    console.log('\n📷 Test 1: Single camera covers entire range');
    const test1 = checkCameraCoverage(
        {
            distanceRange: { min: 1, max: 10 },
            lightRange: { min: 100, max: 1000 }
        },
        [
            {
                id: 'camera-1',
                distanceRange: { min: 0, max: 15 },
                lightRange: { min: 50, max: 1500 }
            }
        ]
    );
    console.log(`Result: ${test1.isSufficient ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Message: ${test1.message}`);

    // Test 2: Two cameras that together cover the requirement
    console.log('\n📷 Test 2: Two cameras together cover the range');
    const test2 = checkCameraCoverage(
        {
            distanceRange: { min: 1, max: 20 },
            lightRange: { min: 100, max: 1000 }
        },
        [
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
        ]
    );
    console.log(`Result: ${test2.isSufficient ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Message: ${test2.message}`);

    // Test 3: Gap in distance coverage
    console.log('\n📷 Test 3: Gap in distance coverage (should fail)');
    const test3 = checkCameraCoverage(
        {
            distanceRange: { min: 1, max: 20 },
            lightRange: { min: 100, max: 1000 }
        },
        [
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
        ]
    );
    console.log(`Result: ${test3.isSufficient ? '❌ FAIL' : '✅ PASS (correctly identified gap)'}`);
    console.log(`Message: ${test3.message}`);
    if (test3.uncoveredRegions) {
        console.log('Uncovered regions:');
        test3.uncoveredRegions.forEach((region, idx) => {
            console.log(`  ${idx + 1}. Distance: [${region.distanceRange.min}, ${region.distanceRange.max}], ` +
                `Light: [${region.lightRange.min}, ${region.lightRange.max}]`);
        });
    }

    // Test 4: Gap in light level coverage
    console.log('\n📷 Test 4: Gap in light level coverage (should fail)');
    const test4 = checkCameraCoverage(
        {
            distanceRange: { min: 1, max: 10 },
            lightRange: { min: 100, max: 1000 }
        },
        [
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
        ]
    );
    console.log(`Result: ${test4.isSufficient ? '❌ FAIL' : '✅ PASS (correctly identified gap)'}`);
    console.log(`Message: ${test4.message}`);
    if (test4.uncoveredRegions) {
        console.log('Uncovered regions:');
        test4.uncoveredRegions.forEach((region, idx) => {
            console.log(`  ${idx + 1}. Distance: [${region.distanceRange.min}, ${region.distanceRange.max}], ` +
                `Light: [${region.lightRange.min}, ${region.lightRange.max}]`);
        });
    }

    // Test 5: Four cameras covering quadrants
    console.log('\n📷 Test 5: Four cameras covering all quadrants');
    const test5 = checkCameraCoverage(
        {
            distanceRange: { min: 0, max: 100 },
            lightRange: { min: 0, max: 100 }
        },
        [
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
        ]
    );
    console.log(`Result: ${test5.isSufficient ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Message: ${test5.message}`);

    // Test 6: No cameras provided
    console.log('\n📷 Test 6: No cameras provided (should fail)');
    const test6 = checkCameraCoverage(
        {
            distanceRange: { min: 1, max: 10 },
            lightRange: { min: 100, max: 1000 }
        },
        []
    );
    console.log(`Result: ${test6.isSufficient ? '❌ FAIL' : '✅ PASS (correctly identified no cameras)'}`);
    console.log(`Message: ${test6.message}`);

    // Test 7: Overlapping cameras with full coverage
    console.log('\n📷 Test 7: Three overlapping cameras with full coverage');
    const test7 = checkCameraCoverage(
        {
            distanceRange: { min: 5, max: 15 },
            lightRange: { min: 200, max: 800 }
        },
        [
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
        ]
    );
    console.log(`Result: ${test7.isSufficient ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Message: ${test7.message}`);

    console.log('\n' + '='.repeat(70));
    console.log('Test Suite Complete');
    console.log('='.repeat(70));
}

// Run tests
runTests();

// Export for use in other modules
export {
    checkCameraCoverage,
    SoftwareCameraSpec,
    HardwareCamera,
    CoverageResult,
    Range
};
