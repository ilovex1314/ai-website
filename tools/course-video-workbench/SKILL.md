# Course Video Workbench Skill Draft

This is a project-local Codex skill draft for `/topics/remotion-course`. It is
not registered as a global skill. Use it as the contract for local productivity
work that cannot run on the public Cloudflare page.

## Purpose

Assemble a course talking-head video from:

- A HyperFrames project folder as the structured background source.
- A user-recorded foreground speaker video as the primary audio source.
- A workbench timeline with scene segments, stage elements, and action refs.

The public app uses mock data only. Local workflows may read folders, parse
manifests, and update a lightweight `course-assembly` manifest. This skill does
not cover upstream topic summarization, HyperFrames project generation,
narration script generation, or full NLE editing.

## Read A HyperFrames Project Folder

Expected folder shape:

```text
videos/topic-share/
  index.html
  DESIGN.md
  assets/
  compositions/
  renders/
  hyperframes.json
  package.json
```

Prefer `hyperframes.json` when available. Otherwise inspect `index.html` and
composition files for:

- `data-composition-id`
- `data-start`
- `data-duration`
- `data-track-index`
- stable `id`, `class`, and `data-role` selectors
- readable timeline or GSAP selector summaries

Treat `renders/preview.mp4` as a preview only. The structured source for this
workbench is the HyperFrames project folder and its manifest or HTML metadata.

## Generate Element Map

For each important DOM node or manifest element, create a `StageElement`:

- Keep the HyperFrames selector stable.
- Preserve `compositionId` and frame range.
- Classify kind as title, paragraph, code, chart, image, flow-node, caption, or
  unknown.
- Store normalized canvas boxes in percent units.

Do not rely on OCR or visual box drawing as the default path. Visual correction
is allowed only as a manual repair layer.

## Map Detected Animations

Convert HyperFrames timeline records into `DetectedHyperframesAnimation` items.
Map known signatures into the action library:

- `opacity + y/x` entrance -> `text-reveal` or `slide-push-in`
- marker sweep or highlight background -> `highlight-box` or `marker-sweep`
- circle, scribble, burst -> `scribble-callout`
- scene wipe, reveal, crossfade -> `chapter-transition`
- code line or diff emphasis -> `code-line-highlight`
- unknown selector plus tween -> `custom-component`

## Add Missing Actions

When a detected animation suggests an action id that does not exist, add a draft
action to the workbench action library.

Choose implementation mode:

- `parametric` for stable annotation controls.
- `custom-component` when selector and tween data are enough to preserve a
  concrete HyperFrames animation.
- `llm-assisted` when Codex must infer intent, schema, or component contract.

Draft actions should include `source: hyperframes`, `selector`, and
`actionSignature`.

## Modify Timeline Action Refs

Timeline action refs attach actions to scene-relative timing and may include a
target `elementId`.

When binding a selected action to an element:

1. Find the element frame range.
2. Select the segment containing that element.
3. Add an action ref with `actionId`, `elementId`, `from`, and `duration`.
4. Keep `from` relative to the segment start.

## Save Assembly State

Persist only the current workbench assembly state:

```text
course-assembly/
  inputs.json
  element-map.json
  actions.json
  timeline.json
  foreground-window.json
  handoff/
    codex-handoff.json
    capcut-manifest.json
```

This manifest answers only workbench questions: which background project,
foreground video, parsed elements, action bindings, foreground window, and
handoff targets are active. It is not a full production pipeline record.

## Generate Final Or Editor Handoff Outputs

Final render target:

```text
exports/final-course-video.mp4
```

Rules:

- Background is the HyperFrames rendered preview or renderer output.
- Background audio is muted by default.
- Foreground speaker video provides the final audio.
- Total duration follows the background timeline.
- Short foreground hides after ending; long foreground is truncated.

Editor handoff target:

```text
course-assembly/handoff/capcut/
  master-preview.mp4
  background-clean.mp4
  foreground-speaker.mp4
  overlays/
  captions.srt
  timeline.csv
  manifest.json
  edit-guide.md
```

`edit-guide.md` must name import order, track order, background file, foreground
speaker file, overlay mapping, and CapCut adjustment notes.
