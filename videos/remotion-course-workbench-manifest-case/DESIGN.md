# Remotion Course Workbench Manifest Case

## Style Prompt

A vertical 9:16 product-teaching video told by a 29-year-old internet-product woman. It should feel like a practical screen-side explanation rather than a launch trailer: bright technical canvas, visible grid, crisp information hierarchy, real product evidence, and calm motion. The visual language combines an editorial white workspace with ink, cobalt, cyan, coral, and signal green.

## Colors

- Canvas: `#f4f7fb`
- Grid: `rgba(31, 55, 92, 0.08)`
- Ink: `#172033`
- Muted: `#65738a`
- Structure blue: `#2563eb`
- Cyan: `#16a8b8`
- Coral: `#ef5b5b`
- Signal green: `#24a36a`
- Dark evidence panel: `#111827`

## Typography

- Chinese/UI: `Inter`, `PingFang SC`, `system-ui`
- Numeric/code: `SFMono-Regular`, `Menlo`, `monospace`

## Motion Rules

- Every authored animation has a stable ID and a matching entry in `animation-manifest.json`.
- Use short slide/fade entrances and restrained scale focus. Motion exists to explain hierarchy.
- Scene transitions remain baked into the background video and are not exposed as element actions.
- Keep the lower-right 480 x 270 area free of essential text for a later 16:9 talking-head window.
- No glowing blobs, oversized arrows, marketing slogans, fake chat bubbles, or decorative gradients.

## Composition

- Canvas: `1080 x 1920`, `30fps`.
- Six scenes, ten seconds each, total `1800f`.
- Information lives in the upper two thirds; the lower-right speaker-safe region stays quiet.
