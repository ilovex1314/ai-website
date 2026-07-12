# Import HyperFrames Project

Input:

```text
videos/topic-share/
  index.html
  DESIGN.md
  assets/
  compositions/
  renders/preview.mp4
  hyperframes.json
```

Expected workbench result:

- `backgroundSource.sourceKind` is `hyperframes-project`.
- `backgroundSource.audioPolicy` is `muted`.
- `renderedPreview` points to `renders/preview.mp4` only as preview.
- Scene, element, and animation summaries come from `hyperframes.json` or HTML
  `data-*` attributes.
- Missing animation actions are added as draft actions with
  `source: hyperframes`.
