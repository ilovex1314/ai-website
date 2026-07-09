# Remotion Course Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ninth website topic, `remotion-course`, as a course animation management console first, then connect Remotion rendering, CapCut/Jianying handoff, and Codex automation in later phases.

**Architecture:** The website workbench owns project data, asset status, timeline editing, and preview. The Remotion engine consumes the same timeline model. CapCut/Jianying receives a universal handoff package. Codex automation lives in project-owned `tools/course-video-timeline/` as schema, prompts, examples, scripts, and later an optional `SKILL.md`.

**Tech Stack:** React, TypeScript, Vite, CSS, Remotion, JSON Schema, Node scripts, FFmpeg, CapCut/Jianying handoff through universal assets.

## Global Constraints

- Implement Phase 1 first: website management console.
- Do not make a landing page; `/topics/remotion-course` must be an operational UI.
- Keep Remotion rendering isolated under `videos/talking-ppt-course/`.
- Do not depend on private CapCut/Jianying project formats in MVP.
- Keep the Codex automation protocol inside this repo before promoting it into a formal skill.

---

### Task 1: Add Topic Metadata And Route

**Files:**
- Modify: `src/data/topics.ts`
- Modify: `src/App.tsx`
- Create: `src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx`
- Create: `src/features/remotion-course-workbench/RemotionCourseWorkbench.css`

**Interfaces:**
- Produces route `/topics/remotion-course`
- Produces component `RemotionCourseWorkbench`

- [ ] Add `remotion-course` topic metadata as the ninth topic.
- [ ] Route `slug === 'remotion-course'` to `RemotionCourseWorkbench`.
- [ ] Render a basic management shell with project, assets, timeline, preview, and export sections.
- [ ] Verify `/topics/remotion-course` does not fall back to the static topic detail page.

### Task 2: Define Workbench Data Model

**Files:**
- Create: `src/features/remotion-course-workbench/courseTimelineModel.ts`
- Create: `src/features/remotion-course-workbench/courseWorkbenchData.ts`

**Interfaces:**
- Produces `CourseProject`
- Produces `TimelineSegment`
- Produces `Annotation`
- Produces `demoCourseProject`

- [ ] Define typed course project, asset, caption, timeline, annotation, and export target models.
- [ ] Add demo project data with at least 2 slides, 2 timeline segments, speaker layout changes, caption keywords, and one highlight annotation.
- [ ] Add derived readiness helpers for missing assets, slide count, caption count, annotation count, and export readiness.

### Task 3: Build Management Panels

**Files:**
- Create: `src/features/remotion-course-workbench/CourseProjectPanel.tsx`
- Create: `src/features/remotion-course-workbench/CourseAssetPanel.tsx`
- Create: `src/features/remotion-course-workbench/CourseTimelinePanel.tsx`
- Create: `src/features/remotion-course-workbench/CourseExportPanel.tsx`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx`

**Interfaces:**
- Consumes `CourseProject`
- Produces operational UI sections

- [ ] Project panel shows project name, style preset, total frames/time, and high-level status.
- [ ] Asset panel shows speaker, slides, captions, script, and warnings.
- [ ] Timeline panel lists segments with frame ranges, slide, speaker layout, caption, and annotations.
- [ ] Export panel shows Remotion and CapCut/Jianying outputs planned for later phases.

### Task 4: Build Preview Stage

**Files:**
- Create: `src/features/remotion-course-workbench/CoursePreviewStage.tsx`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.css`

**Interfaces:**
- Consumes active `TimelineSegment`
- Produces HTML frame approximation

- [ ] Render slide frame, speaker box, caption strip, lower third, progress indicator, and highlight annotation.
- [ ] Add a frame scrubber or segment selector.
- [ ] Keep layout responsive and stable on desktop and mobile widths.

### Task 5: Add Documentation For Workflow

**Files:**
- Create: `docs/remotion-course-workbench-guide.md`
- Create: `docs/remotion-course-capcut-handoff.md`
- Create: `docs/remotion-course-codex-skill-plan.md`

**Interfaces:**
- Produces user manual for management console
- Produces CapCut/Jianying handoff guide
- Produces Codex automation protocol plan

- [ ] Write workbench usage guide: project, assets, timeline, preview, export.
- [ ] Write CapCut/Jianying handoff guide: master MP4, overlays, SRT/TXT, PNG thumbnails, manifest, editing guide.
- [ ] Write Codex automation plan: input contract, output contract, schema, prompts, validation script, future `SKILL.md`.

### Task 6: Verify Phase 1

**Files:**
- Modify or add focused tests if existing test patterns make it cheap.

**Interfaces:**
- Produces verified Phase 1 workbench

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
- [ ] Start or reuse local dev server and inspect `/topics/remotion-course`.

### Later Phase: Remotion Engine

**Files:**
- Create under `videos/talking-ppt-course/`

**Interfaces:**
- Consumes timeline model and assets
- Produces Remotion Studio, still, and MP4 render

- [ ] Add isolated Remotion project.
- [ ] Implement slide, speaker, caption, annotation, lower-third, and progress components.
- [ ] Render still and short demo video.

### Later Phase: Codex Automation Tool

**Files:**
- Create under `tools/course-video-timeline/`

**Interfaces:**
- Produces schema, examples, prompts, validation scripts, handoff builder

- [ ] Add timeline and handoff schemas.
- [ ] Add example input/output.
- [ ] Add validation script.
- [ ] Add README and later optional `SKILL.md`.

