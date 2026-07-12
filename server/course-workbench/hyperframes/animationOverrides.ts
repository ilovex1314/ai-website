import { cp, mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { writeFileNoFollow } from '../pathSafety.js'

export type HyperframesAnimationOverride = {
  animationId: string
  operation: 'modify' | 'disable'
  fromFrame?: number
  durationFrames?: number
  ease?: string
  fallback?: 'show-final-state-at-start' | 'keep-base-state'
}

type ApplyAnimationOverridesOptions = {
  sourceRoot: string
  targetRoot: string
  fps: number
  overrides: HyperframesAnimationOverride[]
}

function overrideRuntime(fps: number, overrides: HyperframesAnimationOverride[]) {
  const serialized = JSON.stringify(overrides).replaceAll('</script', '<\\/script')

  return `
<script data-course-workbench-animation-overrides>
(() => {
  const FPS = ${fps};
  const overrides = ${serialized};
  window.__COURSE_WORKBENCH_ANIMATION_OVERRIDES__ = overrides;
  const byId = new Map(overrides.map((override) => [override.animationId, override]));
  const channels = (vars) => {
    const values = [];
    if (['x', 'xPercent', 'y', 'yPercent'].some((key) => key in vars)) values.push('translate');
    if (['scale', 'scaleX', 'scaleY'].some((key) => key in vars)) values.push('scale');
    if (['rotation', 'rotationX', 'rotationY'].some((key) => key in vars)) values.push('rotate');
    if ('opacity' in vars || 'autoAlpha' in vars) values.push('opacity');
    return values;
  };
  const kindOf = (vars, properties) => {
    if (vars.runBackwards === true && (vars.opacity === 0 || vars.autoAlpha === 0)) return 'entrance';
    if (vars.runBackwards !== true && (vars.opacity === 0 || vars.autoAlpha === 0)) return 'exit';
    if (typeof vars.repeat === 'number' && vars.repeat !== 0) return 'loop';
    if (properties.includes('translate')) return 'move';
    if (properties.includes('scale')) return 'scale';
    if (properties.includes('rotate')) return 'rotate';
    return 'effect';
  };
  let ordinal = 0;
  Object.values(window.__timelines || {}).forEach((timeline) => {
    (timeline.getChildren?.(true, true, false) || []).forEach((tween) => {
      const vars = tween.vars || {};
      const properties = channels(vars);
      const fromFrame = Math.max(0, Math.round((tween.globalTime?.(0) ?? tween.startTime?.() ?? 0) * FPS));
      const kind = kindOf(vars, properties);
      const stableAnimationId = typeof vars.data?.hfAnimationId === 'string'
        ? vars.data.hfAnimationId
        : undefined;
      (tween.targets?.() || []).forEach((target) => {
        if (!(target instanceof HTMLElement)) return;
        if (target.closest('.transition,[data-track-index="80"]')) return;
        const targets = target.hasAttribute('data-hf-element-id')
          ? [target]
          : Array.from(target.querySelectorAll('[data-hf-element-id]'));
        targets.forEach((element) => {
          const elementId = element.dataset.hfElementId;
          if (!elementId || properties.length === 0) return;
          ordinal += 1;
          const animationId = stableAnimationId || \`runtime-\${elementId}-\${fromFrame}-\${kind}-\${ordinal}\`;
          const override = byId.get(animationId);
          if (!override) return;
          if (override.operation === 'disable') {
            if (override.fallback === 'show-final-state-at-start') tween.progress(1);
            else tween.progress(0);
            tween.kill();
            return;
          }
          if (typeof override.fromFrame === 'number') tween.startTime(override.fromFrame / FPS);
          if (typeof override.durationFrames === 'number') tween.duration(override.durationFrames / FPS);
          if (typeof override.ease === 'string') {
            tween.vars.ease = override.ease;
            tween.invalidate?.();
          }
        });
      });
    });
  });
})();
</script>`
}

export async function applyAnimationOverrides({
  sourceRoot,
  targetRoot,
  fps,
  overrides,
}: ApplyAnimationOverridesOptions) {
  await rm(targetRoot, { recursive: true, force: true })
  await mkdir(dirname(targetRoot), { recursive: true })
  await cp(sourceRoot, targetRoot, { recursive: true })
  const entryHtmlPath = join(targetRoot, 'index.html')
  const overridesPath = join(targetRoot, 'animation-overrides.json')
  const html = await readFile(entryHtmlPath, 'utf8')
  const runtime = overrideRuntime(fps, overrides)
  const patched = html.includes('</body>')
    ? html.replace('</body>', `${runtime}\n</body>`)
    : `${html}\n${runtime}\n`

  await Promise.all([
    writeFileNoFollow(entryHtmlPath, patched),
    writeFileNoFollow(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`),
  ])

  return { entryHtmlPath, overridesPath, targetRoot }
}
