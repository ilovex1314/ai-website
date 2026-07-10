---
name: hyperframes-course-source
description: Use when generating or upgrading HyperFrames course source projects for Course Workbench import.
---

# HyperFrames Course Source

- Keep layouts responsive at 9:16, 16:9, and 4:3.
- Give each scene data-hf-scene-id and each editable target data-hf-element-id, with a semantic data-hf-role.
- Treat animation-manifest.json as the only animation timing and semantics authority. Every HyperFrames animation is baked-internal; never declare platform-overlay.
- Include complete scene and animation entries with stable IDs and existing HTML targets.

Before declaring generation complete, run:

    node tools/hyperframes-course-source/scripts/validate.mjs <project-folder>
