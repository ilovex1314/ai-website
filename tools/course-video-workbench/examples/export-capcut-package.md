# Export CapCut Package

Target:

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

Track order:

1. `background-clean.mp4` as base track.
2. `foreground-speaker.mp4` as speaker picture-in-picture and primary audio.
3. `overlays/*.webm` as transparent annotation tracks.
4. `captions.srt` as subtitle track.

`edit-guide.md` should explain which overlay maps to each action ref and where
manual CapCut adjustments are expected.

This handoff is a reserved structure for downstream rendering/editing. The
workbench itself does not replace CapCut and does not implement full trim,
split, or ripple-delete editing.
