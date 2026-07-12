# Course Video Workbench

Project-local draft skill and schemas for the Remotion course workbench MVP.

The browser page at `/topics/remotion-course` is public-safe and uses mock data.
This folder documents the local workflow that can read HyperFrames project
folders, create element maps, map detected animations, bind actions, update the
foreground window, and save a lightweight `course-assembly` manifest.

## Files

- `SKILL.md`: local workflow instructions for Codex.
- `schema/hyperframes-project-source.schema.json`: structured background source.
- `schema/stage-element.schema.json`: parsed HyperFrames element map item.
- `schema/action-ref.schema.json`: timeline action binding.
- `examples/`: short examples for import, binding, and export handoff.

## Current MVP Boundary

- Public page: mock project folder, mock elements, mock detected animations.
- Local mode: future bridge or agent may read real folders and write
  `course-assembly` files.
- Upstream topic summaries, HyperFrames generation, narration script generation,
  and full CapCut/NLE editing are outside this platform boundary.
- No browser-side local filesystem reads.
- No real arbitrary GSAP AST parsing yet.
- No real mp4 composition in this round.
