# Angular Coding Assessment

This project contains solutions to two coding problems as part of an Angular assessment.

## 📋 Table of Contents

- [Problem 1: Deadline Countdown Timer](#problem-1-deadline-countdown-timer)
- [Problem 2: Camera Coverage Algorithm](#problem-2-camera-coverage-algorithm)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)

---

## Problem 1: Deadline Countdown Timer

### Description

An Angular component that retrieves data from a backend API endpoint `/api/deadline` (which returns `{ secondsLeft: number }`) and displays a real-time countdown timer showing "Seconds left to deadline: X", updating every second.

### Performance Optimizations

| Optimization | Description |
|--------------|-------------|
| **OnPush Change Detection** | Minimizes change detection cycles - view only updates when signals change |
| **Angular Signals** | Fine-grained reactivity with minimal overhead compared to traditional observables |
| **RxJS timer()** | More efficient than `setInterval()`, integrates with Angular's zone and handles cleanup |
| **takeUntilDestroyed()** | Automatic subscription cleanup to prevent memory leaks |
| **Single API Call** | Fetches initial value once, then decrements client-side to reduce server load |

### Key Files

| File | Description |
|------|-------------|
| `src/app/services/deadline.service.ts` | Injectable service for fetching deadline data from the API |
| `src/app/components/deadline-countdown/deadline-countdown.component.ts` | Standalone component with countdown logic and UI |
| `src/app/interceptors/mock-deadline.interceptor.ts` | Mock HTTP interceptor for testing (simulates the API) |

### Usage

```typescript
import { DeadlineCountdownComponent } from './components/deadline-countdown/deadline-countdown.component';

@Component({
  imports: [DeadlineCountdownComponent],
  template: `<app-deadline-countdown></app-deadline-countdown>`
})
export class YourComponent {}
```

### API Contract

The component expects the backend to return:

```json
GET /api/deadline
Response: { "secondsLeft": 3600 }
```

---

## Problem 2: Camera Coverage Algorithm

### Description

A software camera system that combines multiple hardware cameras, each with specific subject distance and light level ranges. The algorithm determines whether a given set of hardware cameras can fully cover the desired characteristics of the software camera.

### Algorithm

**Approach: Sweep Line with Coordinate Compression**

1. Collect all unique distance and light level boundary values from the target range and all cameras
2. Create a grid of small rectangles from these boundaries
3. For each rectangle within the target area, verify at least one camera covers it completely

**Time Complexity:** O(n² × m) where n = number of unique coordinates, m = number of cameras  
**Space Complexity:** O(n²) for the grid

### Key Files

| File | Description |
|------|-------------|
| `src/camera-coverage.ts` | Complete solution with type definitions, algorithm, and test cases |

### Usage

```typescript
import { checkCameraCoverage } from './camera-coverage';

const result = checkCameraCoverage(
  {
    distanceRange: { min: 1, max: 20 },
    lightRange: { min: 100, max: 1000 }
  },
  [
    {
      id: 'close-range-cam',
      distanceRange: { min: 0, max: 10 },
      lightRange: { min: 0, max: 2000 }
    },
    {
      id: 'far-range-cam',
      distanceRange: { min: 10, max: 30 },
      lightRange: { min: 0, max: 2000 }
    }
  ]
);

console.log(result.isSufficient); // true
console.log(result.message);      // "Coverage is complete..."
```

### Test Cases

The solution includes 7 comprehensive test cases:

1. ✅ Single camera covering entire range
2. ✅ Two cameras together covering the range
3. ✅ Gap detection in distance coverage
4. ✅ Gap detection in light level coverage
5. ✅ Four cameras covering all quadrants
6. ✅ No cameras provided (edge case)
7. ✅ Overlapping cameras with full coverage

### Running Tests

```bash
# Compile TypeScript
npx tsc src/camera-coverage.ts --outDir dist --esModuleInterop --module commonjs

# Run tests
node dist/camera-coverage.js
```

---

## Getting Started

### Prerequisites

- Node.js v18+ 
- npm v9+

### Installation

```bash
# Clone the repository
git clone https://github.com/darshak1503/angualr_project.git

# Navigate to project directory
cd angualr_project/deadline-countdown-app

# Install dependencies
npm install
```

### Running the Application

```bash
# Start development server
npm start

# Build for production
npm run build
```

The application will be available at `http://localhost:4200`

---

## Project Structure

```
deadline-countdown-app/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── deadline-countdown/
│   │   │       └── deadline-countdown.component.ts  # Problem 1: Countdown component
│   │   ├── services/
│   │   │   └── deadline.service.ts                  # Problem 1: API service
│   │   ├── interceptors/
│   │   │   └── mock-deadline.interceptor.ts         # Problem 1: Mock API
│   │   ├── app.component.ts                         # Root component
│   │   └── app.config.ts                            # App configuration
│   ├── camera-coverage.ts                           # Problem 2: Camera algorithm
│   └── ...
├── package.json
└── README.md
```

---

## Technologies Used

- **Angular 17** - Frontend framework with standalone components
- **TypeScript** - Type-safe JavaScript
- **RxJS** - Reactive programming with observables
- **Angular Signals** - Fine-grained reactivity

---

## Author

Darshak

---

## License

This project is created for assessment purposes.
