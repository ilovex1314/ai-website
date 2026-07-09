# Remotion Course Workbench Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/topics/remotion-course` as a real frontend workbench for course-animation action-library CRUD, visual review, and local Codex handoff.

**Architecture:** Add a focused `src/features/remotion-course-workbench/` feature with typed demo data, a reducer-driven state model, modular React panels, and local CSS. The public website remains a static frontend; local Codex integration is represented by generated handoff payloads in Phase 1.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS.

## Global Constraints

- Do not implement Remotion rendering in Phase 1.
- Public deployment must not require or call a local Codex service.
- Local production flow must generate a structured Codex handoff payload.
- Follow the existing topic registry and route-switching pattern.
- Use TDD: write failing tests before production code.

---

### Task 1: Topic Entry And Route

**Files:**
- Modify: `src/data/topics.ts`
- Modify: `src/data/topics.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Create: `src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx`
- Create: `src/features/remotion-course-workbench/RemotionCourseWorkbench.css`

**Interfaces:**
- Produces: `RemotionCourseWorkbench` React component.

- [ ] Add failing tests expecting 9 topics and `/topics/remotion-course`.
- [ ] Implement topic metadata and route branch.
- [ ] Add a minimal workbench shell that renders the required heading.
- [ ] Run targeted tests.

### Task 2: State Model And Reducer

**Files:**
- Create: `src/features/remotion-course-workbench/workbenchTypes.ts`
- Create: `src/features/remotion-course-workbench/animationLibraryModel.ts`
- Create: `src/features/remotion-course-workbench/courseWorkbenchData.ts`
- Create: `src/features/remotion-course-workbench/courseWorkbenchReducer.ts`
- Create: `src/features/remotion-course-workbench/courseWorkbenchReducer.test.ts`

**Interfaces:**
- Produces: `createDefaultCourseWorkbenchState()`, `courseWorkbenchReducer()`, `buildCodexHandoffRequest()`.

- [ ] Add failing reducer tests for create, update, duplicate, delete, drag position, and handoff generation.
- [ ] Implement typed demo data and reducer actions.
- [ ] Run reducer tests.

### Task 3: Workbench Panels And CRUD UI

**Files:**
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.css`
- Create: `src/features/remotion-course-workbench/CourseTimelinePanel.tsx`
- Create: `src/features/remotion-course-workbench/CourseAnimationLibraryPanel.tsx`
- Create: `src/features/remotion-course-workbench/CourseActionEditor.tsx`
- Create: `src/features/remotion-course-workbench/RemotionCourseWorkbench.test.tsx`

**Interfaces:**
- Consumes: reducer and state model from Task 2.
- Produces: user-facing CRUD controls.

- [ ] Add failing component tests for rendering, filtering, creating, editing, duplicating, and deleting actions.
- [ ] Implement the panels and wire dispatch actions.
- [ ] Run component tests.

### Task 4: Review Preview And Codex Handoff

**Files:**
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.css`
- Create: `src/features/remotion-course-workbench/CoursePreviewStage.tsx`
- Create: `src/features/remotion-course-workbench/CodexHandoffPanel.tsx`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.test.tsx`

**Interfaces:**
- Consumes: selected action, selected segment, review note, handoff payload.
- Produces: visual preview and generated local Codex request.

- [ ] Add failing tests for live preview param editing, drag update, and handoff JSON generation.
- [ ] Implement preview rendering for highlight, arrow, circle, text card, lower third, and zoom.
- [ ] Implement handoff panel and local/public boundary copy.
- [ ] Run component tests.

### Task 5: Verification And Preview

**Files:**
- No new files.

**Interfaces:**
- Consumes: whole app.
- Produces: verified local preview URL.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
- [ ] Check whether a dev server is already running; reuse it if available.
- [ ] If no dev server is running, start `npm run dev -- --host 127.0.0.1`.
- [ ] Report the preview URL and any residual risks.
