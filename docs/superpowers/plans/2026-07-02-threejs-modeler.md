# Three.js 轻量 3D 建模实验室 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/topics/threejs` learning and modeling experience with a Chinese beginner guide, a readable native Three.js modeler, procedural large-scene generation, and TDD coverage.

**Architecture:** React owns page state, forms, panels, and routing. Native Three.js owns canvas lifecycle through focused hooks that translate serializable model documents into `THREE.Group` objects. Model state remains in memory but is shaped as persistence-ready JSON.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Vitest, Testing Library, Three.js, native Three.js addons `OrbitControls` and `TransformControls`.

---

## File Structure

- Create `docs/threejs-beginner-guide.md`: Chinese learning guide with native Three.js basics and React Three Fiber / Drei as the advanced optimization route.
- Modify `package.json`: add `three`.
- Modify `src/App.tsx`: route `/topics/threejs` to the new modeler page.
- Modify `src/data/topics.ts`: update the Three.js topic metadata.
- Create `src/features/threejs-modeler/modelerTypes.ts`: serializable model, material, transform, generation types.
- Create `src/features/threejs-modeler/modelerDefaults.ts`: default document, default part factory, default generation settings.
- Create `src/features/threejs-modeler/modelerReducer.ts`: state transitions for modeling actions.
- Create `src/features/threejs-modeler/generatedSceneFactory.ts`: grid, radial, and stack layout generation.
- Create `src/features/threejs-modeler/threeModelFactory.ts`: Three.js mesh/group construction.
- Create `src/features/threejs-modeler/useThreeModelerScene.ts`: main canvas lifecycle, selection, controls, transform synchronization.
- Create `src/features/threejs-modeler/useThreePreviewScene.ts`: preview canvas lifecycle for generated scenes.
- Create `src/features/threejs-modeler/ThreeModelerPage.tsx`: page shell and state wiring.
- Create `src/features/threejs-modeler/ModelerToolbar.tsx`: primitive and transform mode controls.
- Create `src/features/threejs-modeler/SceneTree.tsx`: parts list.
- Create `src/features/threejs-modeler/ObjectInspector.tsx`: selected part editing.
- Create `src/features/threejs-modeler/GenerationPanel.tsx`: generation controls.
- Create `src/features/threejs-modeler/ThreeModelerPage.css`: responsive tool UI.
- Create `src/features/threejs-modeler/modelerReducer.test.ts`: TDD data-state coverage.
- Create `src/features/threejs-modeler/generatedSceneFactory.test.ts`: TDD generation coverage.
- Create `src/features/threejs-modeler/ThreeModelerPage.test.tsx`: page integration coverage.
- Modify `src/App.test.tsx`: assert threejs slug renders the modeler page.

## Tasks

### Task 1: Documentation and Dependency

- [ ] Write `docs/threejs-beginner-guide.md` with beginner concepts and the方案 B advanced section.
- [ ] Add `three` to dependencies with `npm install three`.
- [ ] Verify dependency install with `npm ls three`.

### Task 2: TDD Data Model

- [ ] Write failing tests in `modelerReducer.test.ts` for add/select/update/delete/reset behavior.
- [ ] Run `npm run test -- src/features/threejs-modeler/modelerReducer.test.ts` and confirm RED.
- [ ] Implement `modelerTypes.ts`, `modelerDefaults.ts`, and `modelerReducer.ts`.
- [ ] Re-run the reducer test and confirm GREEN.

### Task 3: TDD Generated Scenes

- [ ] Write failing tests in `generatedSceneFactory.test.ts` for grid, radial, and stack.
- [ ] Run `npm run test -- src/features/threejs-modeler/generatedSceneFactory.test.ts` and confirm RED.
- [ ] Implement `generatedSceneFactory.ts`.
- [ ] Re-run the generation test and confirm GREEN.

### Task 4: Three.js Rendering Layer

- [ ] Implement `threeModelFactory.ts` with readable primitive-to-mesh functions and Chinese comments around disposal.
- [ ] Implement `useThreeModelerScene.ts` for renderer/camera/lights/controls/raycaster/TransformControls.
- [ ] Implement `useThreePreviewScene.ts` for generated scene preview.

### Task 5: React UI

- [ ] Implement toolbar, scene tree, inspector, generation panel, and page shell.
- [ ] Add CSS with a tool-oriented responsive layout.
- [ ] Write page integration tests.
- [ ] Connect `/topics/threejs` in `App.tsx` and update topic metadata.

### Task 6: Verification

- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] If a dev server is already running, reuse it; otherwise start `npm run dev`.
- [ ] Browser-check `/topics/threejs` for nonblank canvas, usable controls, and mobile/desktop layout.
