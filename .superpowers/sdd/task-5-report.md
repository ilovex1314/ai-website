# Task 5 Report: Shared Remotion Composition and Single Frame Clock

## Scope Completed

- Added the shared `CourseComposition`, `ActionOverlayLayer`, `ForegroundLayer`, and CLI `Root`.
- Replaced the two independently playing HTML videos in `CoursePreviewStage` with one `@remotion/player` instance.
- Made Player `frameupdate` events authoritative for the workbench playhead and routed play, pause, and seek controls through the Player ref.
- Kept element boxes, action selection geometry, foreground selection geometry, and resize/move handles in a sibling editor layer outside `CourseComposition`.
- Reused the same action and foreground geometry resolvers in the composition and editor shell.
- Muted the background track and assigned volume 1 to the foreground track.
- Hid short foreground media after its final frame and bounded long foreground media to the background duration.
- Filtered composition overlays to active `platform-overlay` instances. Baked animations and editor controls are absent from the composition tree.
- Added `@remotion/cli` at the existing Remotion version so the required CLI still can run.

## TDD Evidence

### RED

- Command: `npm test -- CourseComposition.test.tsx`
- Result: failed before any production implementation because `./CourseComposition` did not exist.
- Failure: Vite import analysis reported `Failed to resolve import "./CourseComposition"`.

After the composition layers were implemented, the same suite retained one intentional RED for the preview integration:

- Result: 6 tests passed and the Player integration test failed because `CoursePreviewStage` still rendered the old dual-video path and no mocked Remotion Player was present.

### GREEN

- Command: `npm test -- CourseComposition.test.tsx`
- Result: 1 test file passed, 7 tests passed, 0 failed.
- Covered: audio ownership, short foreground hiding, long foreground truncation, active platform-overlay filtering and precedence, dynamic Root metadata, one Player frame clock, and editor controls outside the composition.

## Real Still Evidence

Command:

`npx remotion still src/features/remotion-course-workbench/remotion/Root.tsx CourseWorkbench /tmp/course-workbench-frame.png --frame=30`

Result:

- Render completed successfully and wrote `/tmp/course-workbench-frame.png`.
- PNG dimensions: 1080 x 1920, RGB, non-interlaced.
- Pixel signal: YMIN 16, YAVG 44.2587, YMAX 235, SATAVG 12.3853, proving the frame is nonblank.
- Visual inspection shows the full background video frame, the foreground video window, and the active red platform overlay.
- No element boxes, move buttons, resize handles, or selection controls are visible in the still.
- The CLI emitted a non-blocking advisory that Remotion 4.0.487 expects Zod 4.3.6 while the existing project uses Zod 4.4.3; the still completed successfully.

The first CLI attempt also proved two environment requirements:

- The repository initially lacked `@remotion/cli`, so `npx remotion` had no executable.
- Remotion Renderer rejects `file://` video sources. The Root smoke fixture now uses the renderer-supported HTTPS media path; imported local project media continues to enter Player through runtime props.

## Build Evidence

- Command: `npm run build`
- Result: TypeScript and Vite production build passed.
- Vite emitted only the existing advisory for a JavaScript chunk larger than 500 kB.

## Focused Scope Note

The Task 5 completion gate is the new focused composition/Player suite. The older broad workbench test file still contains assertions for the removed dual free-running HTML-video contract; it was not rewritten as part of this scoped task.
