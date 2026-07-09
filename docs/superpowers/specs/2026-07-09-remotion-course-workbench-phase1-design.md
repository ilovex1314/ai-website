# Remotion Course Workbench Phase 1 Design

## Goal

Build the ninth topic in `ai-website` as a real course-animation workbench for managing reusable teaching animation actions. The first phase is a frontend production console: it must run as a public static page for visual review, and it must provide local-first Codex handoff data so the same UI can become a personal production tool on the local machine.

## Scope

Phase 1 lives inside the existing Vite React website at `/topics/remotion-course`. It does not build the Remotion renderer yet, and it does not call a local Codex process directly from the browser. It does build the management surface, action-library CRUD, interactive preview, timeline/action binding, review notes, and a structured handoff request that can later be sent to a local bridge service.

## Product Shape

The page is a dense workbench, not a landing page. It should feel like a Bilibili course or training-camp production console: calm, clear, information-rich, and practical.

The first viewport contains:

- Course project overview and material status.
- Timeline segment list with current slide, caption, speaker layout, and attached actions.
- Animation library panel with category filtering and action cards.
- Action editor for the selected action.
- Review preview stage that visually renders the selected segment and selected action.
- Codex handoff panel that packages review feedback into a local-edit request.

## Data Model

The core data types are:

- `CourseProject`: course name, platform, aspect ratio, fps, style, and bridge mode.
- `CourseAsset`: speaker video, slide images, captions, script, and export package status.
- `TimelineSegment`: frame range, slide number, speaker layout, caption, zoom, and action refs.
- `AnimationAction`: reusable teaching animation template with category, params, presets, version, and status.
- `AnimationActionRef`: timeline-level reference to an action with local param overrides.
- `CodexHandoffRequest`: structured payload containing selected action, selected segment, current params, review note, and target local path.

## Required Interactions

Animation library CRUD:

- Create a new action from the current category with default params.
- Edit action name, description, status, default duration, visual params, and preset label.
- Duplicate the selected action as a draft.
- Delete a selected action and remove references from timeline segments.
- Filter actions by category.

Review and editing:

- Selecting an action updates the editor and preview.
- Selecting a timeline segment updates the preview context.
- Changing action params updates the preview immediately.
- Dragging the preview highlighter updates `x` and `y` for supported actions.
- At least these action categories render visibly: highlight box, arrow callout, circle mark, text card, lower third, slide zoom.

Codex handoff:

- User can write a review note for the selected animation.
- User can generate a structured local Codex request.
- The request is displayed as readable JSON/prompt text for copy or future bridge submission.
- The UI states that public deployment only shows the platform and data; local bridge execution is a future local-only integration.

## Local/Public Boundary

The public Cloudflare deployment must be safe as a static frontend. It should not attempt to call local services by default. The local production flow is represented by generated handoff payloads in Phase 1. A later bridge can consume these payloads via a local endpoint such as `http://127.0.0.1:<port>/codex/handoff`, but that endpoint is not required for Phase 1.

## Architecture

Files should live under `src/features/remotion-course-workbench/`.

- `workbenchTypes.ts`: shared TypeScript types.
- `animationLibraryModel.ts`: demo actions and action helpers.
- `courseWorkbenchData.ts`: demo project, assets, and timeline.
- `courseWorkbenchReducer.ts`: deterministic state transitions for CRUD, selection, parameter edits, preview drag, and handoff generation.
- `RemotionCourseWorkbench.tsx`: page shell and state wiring.
- `CourseTimelinePanel.tsx`: segment list and active action refs.
- `CourseAnimationLibraryPanel.tsx`: filters and action list.
- `CourseActionEditor.tsx`: action metadata and param form.
- `CoursePreviewStage.tsx`: visual review canvas using HTML/CSS.
- `CodexHandoffPanel.tsx`: review note and generated handoff.
- `RemotionCourseWorkbench.css`: local styles.

## Testing

Tests should cover:

- Topic registry includes `remotion-course`.
- App route `/topics/remotion-course` renders the workbench.
- Reducer supports create, update, duplicate, delete, selection, preview drag, and handoff generation.
- Component flow supports editing an action and seeing preview text/params update.
- Codex handoff displays selected action, segment, review note, and local bridge status.

## Acceptance Criteria

- Home page shows 9 topics.
- `/topics/remotion-course` renders a real management page.
- The animation library supports create, edit, duplicate, delete, and filter interactions.
- The preview area changes when action params are edited.
- Dragging a supported preview annotation updates its position in the editor.
- Codex handoff generates a structured request for local use.
- `npm test`, `npm run build`, and `npm run lint` are run before completion.
