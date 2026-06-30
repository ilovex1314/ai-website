# AI Website Demo Plan

This project converts the Claude Design and vibe-coding research into a sequence
of focused React demos. The first commit establishes the shell, topic data, and
documentation. Later commits should implement one topic at a time.

## Topic Order

1. ECharts Interactive Charts
   - Prove chart rendering, data binding, click states, and responsive layout.
2. Matter.js Physics Lab
   - Prove 2D physics, direct manipulation, reset, and deterministic scenes.
3. Three.js Custom 3D Scene
   - Prove a nonblank WebGL canvas, pointer response, and stable framing.
4. Spline 3D Embed
   - Prove iframe/embed integration and clean fallbacks.
5. Shadertoy Shader Remix
   - Prove shader runtime basics and editable uniforms.
6. Unicorn Studio Effects Embed
   - Prove exported HTML/embed isolation and fallback motion.
7. Rive Interactive 2D Animation
   - Prove asset loading and state-machine-ready controls.
8. Mapbox Interactive Map
   - Prove token handling, map rendering, style switching, and overlays.

## Working Rule

Each topic should land as a self-contained demo with:

- a visible route under `/topics/<slug>`
- a small data or config boundary
- one focused test for the topic behavior
- verification with `npm test`, `npm run build`, and browser inspection when the
  topic renders canvas, iframe, or map surfaces

## Source Research Summary

The research points to an AI orchestration layer plus specialist engines:
ECharts for complex charting, Spline for ready-made 3D assets, Three.js for
custom 3D, Shadertoy for shader remixing, Unicorn Studio for no-code WebGL
effects, Matter.js for 2D rigid-body physics, Rive for interactive 2D animation,
and Mapbox GL JS for maps.
