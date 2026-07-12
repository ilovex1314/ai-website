# Remotion Course Workbench Story Design

## Style Prompt

A vertical creator recap video from the perspective of a 29-year-old internet/product woman sharing a real tool-building process. It should feel like a calm, capable life-and-work vlog: honest, practical, slightly conversational, and still clearly a production tool. Use real product screenshots as evidence, but avoid sounding like a formal architecture review.

## Colors

- Canvas: `#07111f`
- Panel: `#0d1728`
- Text primary: `#f8fafc`
- Text secondary: `#94a3b8`
- Structure blue: `#2f6df6`
- Error red: `#ef4444`
- Success green: `#18b981`
- Warm highlight: `#f59e0b`

## Typography

- Chinese/UI: `Inter`, `PingFang SC`, `system-ui`
- Numeric/code tags: `SFMono-Regular`, `Menlo`, `monospace`

## Motion Rules

- Lead with the final result and conflict within the first 10 seconds.
- Use screenshot push-ins, pan moves, and picture-in-picture cards to create screen-recording realism.
- Keep transitions clean: wipe, masked slide, or fast blur fade.
- Use red for failure and blue/green for corrected architecture.
- Avoid marketing hero layouts, glowing blobs, cartoon illustrations, and generic AI gradients.
- Copy should sound like a lived personal share: "我最近在做...", "一开始我以为...", "后来发现...".
- Keep technical words only when necessary; translate architecture ideas into everyday production workflow language.

## Foreground Speaker Safe Area

- The rendered PPT/story video is designed as a 9:16 background plate for later composition with a 16:9 horizontal talking-head video.
- Reserve the lower-right speaker area for the foreground window: approximately `x=500`, `y=1510`, `w=520`, `h=292` on a `1080x1920` canvas.
- Important titles, callouts, comparison labels, and picture-in-picture screenshots should stay above or to the left of this safe area.
- Editor-only controls or temporary debug overlays may appear during production screenshots, but the final story composition should not rely on lower-right content.
