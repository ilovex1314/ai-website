# Task 4 Report: Real HyperFrames Import and Media Intake

## Scope Completed

- Added Playwright-backed HyperFrames runtime inspection at declared `16:9`, `4:3`, and `9:16` viewports.
- Reused the Task 3 contract validator and migration planner/applicator.
- Added FFprobe media normalization and structured `MEDIA_UNDECODABLE` recovery errors.
- Added the HyperFrames import API and server-contained foreground binary upload API.
- Persisted `project.json`, source/media manifests, scene map, element map, baked animation map, and migration report.
- Replaced the fake intake controls with idle, scanning, migration-required, applying, ready, and error states.

## TDD Evidence

### RED

1. Importer/probe suite:
   - Command: `npm test -- importer.test.ts`
   - Result: failed because `server/course-workbench/hyperframes/importer.ts` did not exist.
2. API suite:
   - Command: `npm test -- app.test.ts`
   - Result: the two new tests failed with HTTP 404 for `/api/imports/hyperframes` and `/api/projects/:id/foreground`; the existing related tests remained green.
3. Intake UI suite:
   - Command: `npm test -- CourseProjectIntake.test.tsx`
   - Result: failed because `CourseProjectIntake.tsx` did not exist.

### GREEN

- Focused verification command:
  `npm test -- importer.test.ts app.test.ts CourseProjectIntake.test.tsx RemotionCourseWorkbench.test.tsx`
- Result: 5 test files passed, 58 tests passed, 0 failed.
- Production build command: `npm run build`
- Result: TypeScript and Vite build passed. Vite emitted the existing advisory for a JavaScript chunk larger than 500 kB.

## Real Fixture Evidence

Fixture source:

`/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial`

Temporary copy used for all writeback:

`/Volumes/2TB-NVMe/work/.course-workbench-task4.CDZjZ6/fixture`

### Scan Before Writeback

- HTTP status: 200
- Import status: `migration-required`
- Recognized: 0
- Needs metadata: 44
- Unresolved: 0
- Planned patches: 77
- `applied`: false
- Temporary-copy `index.html` SHA-256 remained `c77ba1bb0ac4b60ce41c33d266493f56bdb1da92637656be0a68bb33997ac341` after scanning.

### Confirmed Import

- HTTP status: 201
- Import status: `ready`
- Project id: `codex-keyframes-tutorial`
- Source dimensions: 1080 x 1920
- Scene map entries: 11
- Runtime element map entries: 33
- Every sampled element contains aspect-specific pixel rectangles for `16:9`, `4:3`, and `9:16`.
- Background render: `renders/codex-keyframes-tutorial.mp4`
- Media probe: H.264, 1080 x 1920, 30 fps, 157.533333 seconds, 4726 frames, audio present.
- Persisted action instances: 0
- Real legacy fixture baked animation entries: 0 because the Task 3 migrator creates an empty authoritative manifest when no manifest exists.
- A separate declared-manifest test confirms baked animations persist under `source.bakedAnimations` and never become action instances.

### Integrity and Persistence

- Original fixture `index.html` SHA-256 after import: `c77ba1bb0ac4b60ce41c33d266493f56bdb1da92637656be0a68bb33997ac341`.
- Migrated temporary copy `index.html` SHA-256: `9931bceb1e62f4df464d4d9ca22f811cfc6703de38284a3affb99e51e1ddd577`.
- Original fixture was not mutated; only the temporary copy changed.
- Validator command passed:
  `node tools/hyperframes-course-source/scripts/validate.mjs /Volumes/2TB-NVMe/work/.course-workbench-task4.CDZjZ6/fixture`
- Persisted files verified:
  - `project.json`
  - `hyperframes/scene-map.json`
  - `hyperframes/element-map.json`
  - `hyperframes/baked-animation-map.json`
  - `hyperframes/migration-report.json`
  - `sources/source-manifest.json`
  - `sources/media-manifest.json`

## Foreground Upload Evidence

- API test generated a real 320 x 240, 30 fps H.264 MP4 with AAC audio.
- Upload was streamed to `sources/foreground/speaker.mp4` under the server project root.
- FFprobe completed before the temporary upload was renamed into place.
- Source and media manifests were updated only after successful probing.
- JSON requests containing browser-provided absolute paths are rejected with `FILE_UPLOAD_REQUIRED`.
## Reviewer Findings To Fix

1. Resolve and allowed-root-check every imported child file before read/write/probe; reject symlink escapes for HTML, manifests, metadata, media and migration writes.
2. Make foreground upload filesystem-safe against symlinked `sources/foreground` ancestors, using canonical containment and no-follow checks where available.
3. Measure real element visibility across sampled frames using runtime presence, computed display/visibility/opacity and nonzero geometry; derive first/last visible frames instead of assigning full scene ranges.
4. Return a structured unresolved migration result containing the real report/counts so the UI renders recognized/needsMetadata/unresolved before apply.
5. Require animation target scene ownership, store thumbnails per aspect, and persist every referenced thumbnail file.

Fix all five with RED/GREEN tests, rerun focused importer/API/intake tests, real temporary-copy import, build, commit Task 4 files, append evidence and commit hash.

## Reviewer Fix Evidence

Follow-up implementation commit: `dfdb328` (`修复：加固 HyperFrames 导入验收`)

### 1. Imported Child Symlink Containment

- RED: five focused cases followed escaping symlinks for `index.html`, `animation-manifest.json`, `meta.json`, selected render media, and `.workbench-backup`.
- GREEN: all five now reject with `SOURCE_CHILD_NOT_ALLOWED` before read, probe, or migration write; the outside backup directory remains empty.
- The importer rechecks contained child paths before planning, migration apply, contract validation, metadata read, fingerprinting, and media probing.

### 2. Foreground Upload Symlink Safety

- RED: uploads through symlinked `sources` and `sources/foreground` ancestors returned HTTP 201 and wrote outside the project.
- GREEN: both cases return `FOREGROUND_PATH_NOT_ALLOWED`; canonical containment and no-symlink traversal checks run before and after directory creation, and outside directories remain empty.

### 3. Sampled Runtime Visibility

- RED: a deterministic element visible only at frames 15 through 23 was reported as visible for the full 0 through 29 scene.
- GREEN: its stored range is `{ fromFrame: 15, toFrame: 24 }`; permanently `display:none` and zero-geometry elements store empty ranges.
- Sampling checks runtime presence, ancestor `display`, `visibility`, and `opacity`, plus nonzero pixel geometry for every scene frame.

### 4. Unresolved Report and Intake Counts

- RED: unresolved migration plans threw before returning their counts, and intake attempted to read a missing project id.
- GREEN: the importer returns `status: unresolved` with the real migration report; intake renders recognized, needs-metadata, and unresolved counts in its error state without showing the metadata apply action.

### 5. Scene Ownership and Persisted Thumbnails

- RED: an animation targeting an element in another scene imported successfully, and thumbnail references had only one aspect with no files.
- GREEN: cross-scene targets reject with `ANIMATION_TARGET_SCENE_MISMATCH`; scene and element maps store `thumbnailsByAspect`, and every reference points to a persisted nonempty PNG.

## Reviewer Fix Verification

- Focused command: `npm test -- importer.test.ts app.test.ts CourseProjectIntake.test.tsx RemotionCourseWorkbench.test.tsx`
- Result: 5 test files passed, 70 tests passed, 0 failed.
- Build command: `npm run build`
- Result: TypeScript and Vite build passed; only the existing bundle-size advisory remains.

Fresh real fixture copy:

`/Volumes/2TB-NVMe/work/.course-workbench-task4-review.BLvNyp/fixture`

- Scan: HTTP 200, `migration-required`, recognized 0, needs metadata 44, unresolved 0, no writeback.
- Apply: HTTP 201, `ready`, 11 scenes, 33 runtime elements, 0 action instances.
- Sampled visibility: 6 elements with nonempty ranges and 27 with empty ranges under the migrated authoritative timing.
- Source: 1080 x 1920.
- Media: H.264, 1080 x 1920, 30 fps, 157.533333 seconds, 4726 frames, audio present.
- Thumbnails: 33 unique per-scene/per-aspect references and 33 persisted nonempty PNG files.
- Migrated copy validator result: `VALID`.
- Original `index.html` SHA-256 remained `c77ba1bb0ac4b60ce41c33d266493f56bdb1da92637656be0a68bb33997ac341`.
- Migrated temporary copy SHA-256: `9931bceb1e62f4df464d4d9ca22f811cfc6703de38284a3affb99e51e1ddd577`.
