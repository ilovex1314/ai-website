# Spline Product Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Spline topic as a beginner-friendly DJI Osmo Action 6-inspired product showcase with local original model data and three integration mode demos.

**Architecture:** Add a focused `src/features/spline-showcase` feature that owns local product/model data, a CSS-3D local model renderer, and the `/topics/spline` page. Keep Spline mode demos data-driven so real `.splinecode` or iframe URLs can be swapped in later without changing page structure.

**Tech Stack:** React, TypeScript, CSS 3D transforms, Vitest, Testing Library, Vite static assets.

---

### Task 1: Route and Page Test

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Create: `src/features/spline-showcase/SplineProductShowcase.tsx`

- [x] **Step 1: Write a failing route test**

Add a test that visits `/topics/spline` and expects the Spline page heading, the three mode demos, and the local original model watermark.

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/App.test.tsx --run`
Expected: fail because `/topics/spline` still renders the generic topic detail page.

- [x] **Step 3: Implement the route and page**

Route `slug === 'spline'` to `SplineProductShowcase`.

- [x] **Step 4: Run the route test to verify it passes**

Run: `npm test -- src/App.test.tsx --run`
Expected: pass.

### Task 2: Local Model Data and Renderer

**Files:**
- Create: `src/features/spline-showcase/splineShowcaseData.ts`
- Create: `src/features/spline-showcase/SplineProductShowcase.css`
- Create: `src/features/spline-showcase/SplineProductShowcase.test.tsx`

- [x] **Step 1: Write failing feature tests**

Test that the page exposes product facts, generated model parts, watermark text, and mode descriptions for `viewer`, `react-spline`, and `iframe`.

- [x] **Step 2: Run the feature test to verify it fails**

Run: `npm test -- src/features/spline-showcase/SplineProductShowcase.test.tsx --run`
Expected: fail because feature files are not implemented yet.

- [x] **Step 3: Implement local data and CSS 3D renderer**

Create original Action 6-inspired model data with non-DJI labels and a visible watermark.

- [x] **Step 4: Run the feature test to verify it passes**

Run: `npm test -- src/features/spline-showcase/SplineProductShowcase.test.tsx --run`
Expected: pass.

### Task 3: Beginner Documentation and Verification

**Files:**
- Create: `docs/spline-3d-beginner-guide.md`

- [x] **Step 1: Write the beginner guide**

Explain Spline concepts, source data, local vs remote `.splinecode`, and the three integration modes with links to official and community references.

- [x] **Step 2: Run verification**

Run: `npm test -- --run`, `npm run build`, `npm run lint`, and browser-check `/topics/spline`.

