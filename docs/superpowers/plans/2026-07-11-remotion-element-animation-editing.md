# Remotion Element Animation Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix frame/fade correctness, expose editable HyperFrames element animations, support multiple platform animations with conflict validation, and implement the approved 9:16 A layout.

**Architecture:** Keep legacy action refs segment-relative at rest, but centralize all absolute-frame conversion and fade calculations in pure domain helpers. Add runtime GSAP animation discovery and non-destructive HyperFrames overrides as separate source metadata, while platform overlays remain Remotion action instances. Adapt only the Review interior for 9:16.

**Tech Stack:** React 19, TypeScript, Vitest, Playwright, Remotion, GSAP runtime metadata, HyperFrames CLI, Node HTTP service.

## Global Constraints

- UI frame values are absolute global frames.
- Timeline action refs remain segment-relative for backward compatibility.
- Page transitions are out of scope.
- HyperFrames source files are never modified in place.
- Disabled HyperFrames animations remain visible in the element panel and can be restored.
- 16:9 and 4:3 layouts must not regress.
- No sub-agent is required for this execution.

---

### Task 1: Absolute frame and fade domain helpers

**Files:**
- Create: `src/features/remotion-course-workbench/domain/animationTiming.ts`
- Create: `src/features/remotion-course-workbench/domain/animationTiming.test.ts`
- Modify: `src/features/remotion-course-workbench/CoursePreviewStage.tsx`
- Modify: `src/features/remotion-course-workbench/remotion/ActionOverlayLayer.tsx`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx`

**Interfaces:**
- Produces: `absoluteActionRange(segment, ref)`, `relativeFrameForSegment(segment, absoluteFrame)`, `animationOpacity(frame, fromFrame, durationFrames, fadeInFrames, fadeOutFrames)`.

- [ ] Write tests proving `[228, 508)` activity and fade opacity at frames 228, 278, 328, 458, 507, and 508.
- [ ] Run `npm test -- --run src/features/remotion-course-workbench/domain/animationTiming.test.ts` and confirm RED.
- [ ] Implement the pure helpers and route Preview, Inspector labels, editor selection and Remotion overlay opacity through them.
- [ ] Run the focused tests and existing composition/workbench tests until GREEN.

### Task 2: Real GSAP animation ownership

**Files:**
- Modify: `server/course-workbench/hyperframes/runtimeInspector.ts`
- Modify: `server/course-workbench/hyperframes/importer.ts`
- Modify: `server/course-workbench/hyperframes/importer.test.ts`
- Modify: `src/features/remotion-course-workbench/workbenchTypes.ts`
- Modify: `src/features/remotion-course-workbench/courseWorkbenchReducer.ts`

**Interfaces:**
- Produces: runtime animations with `id`, `elementId`, `sceneId`, `fromFrame`, `durationFrames`, `kind`, `properties`, `ease`, and `exportRole: 'baked-internal'`.

- [ ] Add an importer fixture whose `window.__timelines.main.getChildren()` exposes an entrance tween and movement tween targeting elements with `data-hf-element-id`.
- [ ] Run importer tests and confirm they fail because runtime tweens are not returned.
- [ ] Extract GSAP tween timing/targets at runtime, ignore page transitions and unowned background tweens, and remove the full-lifecycle fallback.
- [ ] Hydrate `DetectedHyperframesAnimation.elementId` and verify selected elements receive only their own animations.

### Task 3: HyperFrames override lifecycle

**Files:**
- Create: `server/course-workbench/hyperframes/animationOverrides.ts`
- Create: `server/course-workbench/hyperframes/animationOverrides.test.ts`
- Modify: `server/course-workbench/app.ts`
- Modify: `server/course-workbench/app.test.ts`
- Modify: `src/features/remotion-course-workbench/api/workbenchClient.ts`
- Modify: `src/features/remotion-course-workbench/api/workbenchClient.test.ts`
- Modify: `src/features/remotion-course-workbench/workbenchTypes.ts`
- Modify: `src/features/remotion-course-workbench/courseWorkbenchReducer.ts`

**Interfaces:**
- Produces: `HyperframesAnimationOverride`, `applyAnimationOverrides()`, `WorkbenchClient.saveHyperframesOverrides()`.

- [ ] Write tests for modify, disable, restore, source immutability, and the `show-final-state-at-start` entrance fallback.
- [ ] Add `POST /api/projects/:id/hyperframes-overrides` to persist overrides under `.course-workbench` and materialize a patched project copy.
- [ ] Inject deterministic GSAP override runtime into the copied HTML; never alter the upstream project.
- [ ] Add draft background re-render command and return its media URL; report unsupported/unresolved runtime mappings explicitly.

### Task 4: Element animation panel and multiple bindings

**Files:**
- Create: `src/features/remotion-course-workbench/ElementAnimationPanel.tsx`
- Create: `src/features/remotion-course-workbench/domain/animationConflicts.ts`
- Create: `src/features/remotion-course-workbench/domain/animationConflicts.test.ts`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx`
- Modify: `src/features/remotion-course-workbench/courseWorkbenchReducer.ts`
- Modify: `src/features/remotion-course-workbench/courseWorkbenchReducer.test.ts`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.test.tsx`

**Interfaces:**
- Produces: grouped HyperFrames/platform cards, `findAnimationConflicts()`, reducer actions for new binding, modify/disable/restore HyperFrames animation.

- [ ] Write failing tests showing two sequential bindings on one element, independent selection/editing, and a retained disabled HyperFrames card.
- [ ] Add “新增动画” to clear only the selected binding; binding appends a new ref and never overwrites another ref implicitly.
- [ ] Show original/modified/disabled HyperFrames cards with restore controls.
- [ ] Block overlapping exclusive `translate`, `scale`, or `rotate` channels and render an actionable conflict message.

### Task 5: Approved 9:16 A layout

**Files:**
- Modify: `src/features/remotion-course-workbench/CoursePreviewStage.tsx`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.css`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.test.tsx`

**Interfaces:**
- Consumes: `stage.canvasAspectRatio`.
- Produces: `data-layout-mode="portrait-review"` and stable Review control/stage/timeline regions.

- [ ] Write a failing UI test asserting 9:16 uses a two-column Review interior while 16:9 does not.
- [ ] Move controls/status into the left portrait context rail, the canvas into the right stage zone, and keep the ruler across the bottom.
- [ ] Set portrait canvas height to `min(76vh, 860px)` with stable 9:16 aspect ratio and no text overlap.
- [ ] Verify at desktop widths 1440 and 2048; preserve the existing responsive stack below 1180px.

### Task 6: End-to-end verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/topics/remotion-course/index.md`

- [ ] Import `/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial` in Chrome.
- [ ] Verify a real title shows its HyperFrames entrance animation card.
- [ ] Bind two sequential platform animations to the title and verify both remain independently editable.
- [ ] Verify an overlapping transform conflict is rejected.
- [ ] Verify fade behavior at boundary and midpoint frames in Review and a rendered still.
- [ ] Verify disable/restore regenerates background preview without modifying upstream fingerprints.
- [ ] Run `npm test -- --run`, `npm run build`, and `npm run lint`.
- [ ] Update README with animation ownership, override behavior, multi-binding, and portrait layout rules.
