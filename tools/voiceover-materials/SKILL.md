---
name: voiceover-materials
description: Use when the user says "生成口播材料" or asks for Chinese narration, timing, recording guidance, or a HyperFrames handoff package for a teaching, product, screen-recording, or technical video.
---

# Generating Voiceover Materials

Produce a recording-ready Chinese voiceover package that matches the actual video, not a generic article.

## Workflow

1. Read available truth sources in this order: `animation-manifest.json`, `element-map.json`, `meta.json`, `script.md`, `DESIGN.md`, existing narration, then rendered-media metadata. Resolve conflicts explicitly; use `durationInFrames / fps` as the HyperFrames duration.
2. Confirm or state assumptions for audience, platform, target duration, desired tone, and CTA. Default to a natural, clear, non-promotional sharing voice. Treat personas such as “29 岁互联网女性” as optional only when the user or source material selects them; never make one persona universal.
3. Build a scene-to-message outline before drafting. Allocate words by scene duration and visual density. Keep the first 3 seconds to one speakable hook; leave room for the picture to explain diagrams and dense UI.
4. Choose a measured pace and compute the budget:
   - calm teaching: 220-240 Chinese speakable characters/minute;
   - natural product/technical sharing: 240-270;
   - fast short video: 270-300, only when requested.
   - `target characters = pace * (duration seconds - explicit pauses) / 60`. Keep the draft within about +/-8%; reserve 5-10% of runtime for breathing and visual holds when pauses are not yet timed.
5. Draft for speech. Use short clauses, concrete verbs, and one idea per breath. On first mention, turn jargon into “term + plain Chinese explanation”; later use the short term. Preserve technical meaning rather than deleting necessary terms.
6. Mark only useful delivery cues: `[停 0.3s]`, `[换气]`, `[重音: 关键词]`, `[语气: ...]`. Markers are not spoken and must not be included in the character budget.
7. Protect the presenter safe zone. Read the layout requirement and element coordinates; identify the exact reserved region when available (for example, a lower-right talking-head rectangle). Keep essential titles, code, captions, and callouts outside it. Do not invent coordinates when the project does not provide them; report the missing constraint.
8. Fill [templates/delivery.md](templates/delivery.md). Include the final clean narration, timed/scene script, pace and duration math, recording direction, terminology table, safe-zone note, and HyperFrames handoff checklist.

## Manifest-First Gate

Before delivery, verify:

- duration, fps, and scene ranges come from `animation-manifest.json` when present;
- every animation `targetElementId` exists in `element-map.json`;
- scene IDs agree, animation ranges stay inside the composition, and stable element IDs are retained;
- narration segments map to scene IDs/times and do not require visuals before they appear;
- handoff names the narration file, clean audio, captions/transcript, manifest, element map, preview/render, safe-zone requirement, and any unresolved mismatch.

Run the deterministic check when project files are available:

```bash
python3 scripts/validate_voiceover.py \
  --project-dir <hyperframes-project> \
  --narration <narration.txt> \
  --pace 255
```

Treat budget warnings as revision prompts, not permission to speed-read. If the user requests only text, still report estimated characters, pace, and duration.
