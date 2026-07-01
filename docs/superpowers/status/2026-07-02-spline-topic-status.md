# Spline Topic Development Status

Date: 2026-07-02

## Current Position

The Spline topic is paused as a learning-oriented product 3D workflow demo, not as a completed high-fidelity DJI Action 6 Spline scene.

The important correction is that a previous Spline starter public URL was removed because it showed Spline's default starter scene instead of an Action 6-related scene. The page now defaults to the local Action 6-inspired teaching model and does not claim to be a finished Spline scene.

## What Is Implemented

- `/topics/spline` routes to a dedicated Spline product showcase page.
- The showcase has local drag rotation, hover hotspot details, click-to-expand behavior, and collapse/expand transitions.
- Product/model data is centralized in `src/features/spline-showcase/splineShowcaseData.ts`.
- A local original GLB teaching asset exists at `public/models/action-6-inspired/action-6-inspired-study.glb`.
- Supporting local model metadata exists at `public/models/action-6-inspired/local-model.json`.
- The GLB can be regenerated with `npm run model:action6`.
- Beginner-facing documentation exists:
  - `docs/spline-3d-beginner-guide.md`
  - `docs/spline-modeling-from-zero.md`
  - `docs/spline-topic-status.md`

## What Is Not Done

- There is no real Action 6 Spline public URL yet.
- There is no exported local `scene.splinecode` yet.
- The current local model is not a precise Action 6 reconstruction.
- The full route `authorized 3D model -> Spline import -> Spline states/events -> publish/export -> React integration` has not been completed.

## Recommended Next Route

Use Spline for what it is best at in this topic:

1. Start from a Spline Community scene or an authorized GLB/OBJ/FBX product model.
2. Import it into Spline.
3. Rename objects to stable product-part names.
4. Set materials, lights, and camera.
5. Add Spline states such as `assembled`, `lens_expanded`, `screen_expanded`, and `mount_expanded`.
6. Publish or export the real scene.
7. Replace `sceneUrl` in `splineShowcaseData.ts`.

## Verification

Latest checks run before recording this status:

```bash
npm test -- src/features/spline-showcase/SplineProductShowcase.test.tsx --run
npm run lint
```

