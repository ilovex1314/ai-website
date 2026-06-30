# AI Website Framework Design

## Goal

Initialize a React and Vite project beside `/Volumes/2TB-NVMe/work/study-ai`
that turns the vibe-coding research into a demo roadmap.

## Scope

The first milestone is the project shell, not the individual demos. It includes
an app home page, a route-like topic detail view, structured topic data, tests,
README content, and planning docs. Each later milestone should implement one
topic at a time.

## Architecture

The app keeps the researched demo tracks in `src/data/topics.ts`. `src/App.tsx`
reads the current path and renders either the roadmap home or a topic detail
page. This avoids adding a router dependency before the app needs nested
navigation.

## Demo Tracks

- ECharts for charts
- Spline for 3D embeds
- Three.js for custom 3D
- Shadertoy for shader remixes
- Unicorn Studio for WebGL effect embeds
- Matter.js for 2D physics
- Rive for 2D interactive animation
- Mapbox GL JS for maps

## Testing

Use Vitest and Testing Library. The first tests cover the eight topic slugs,
actionable topic metadata, home rendering, and topic detail rendering.
