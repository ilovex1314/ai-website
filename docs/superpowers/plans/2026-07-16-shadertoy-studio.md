# Shadertoy Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/topics/shadertoy` as a three-tab Shadertoy Studio where users can explore four original shaders, learn fragment-shader concepts through five editable lessons, and migrate compatible single-pass Shadertoy `mainImage` code into a React/WebGL runtime.

**Architecture:** Keep all GPU concerns in a dependency-free native WebGL runtime under `src/features/shadertoy-studio/runtime/`. Gallery, lab, and porting tabs own serializable UI state supplied by the page parent, while the active tab mounts one shared `ShaderCanvas` integration component. Pure source adaptation, diagnostics, compatibility analysis, content data, and state transitions are covered in Vitest; real shader compilation, context recovery, responsive layout, and poster capture are verified in Chromium.

**Tech Stack:** React 19, TypeScript 6, native WebGL 1/WebGL 2, Vite 8, Vitest 4 + Testing Library, Playwright 1.61, CSS, Node.js poster capture script.

## Global Constraints

- Route: `/topics/shadertoy`; tab query values are exactly `gallery`, `lab`, and `porting`.
- No new production dependency or editor dependency.
- Built-in gallery and lesson shaders are original local single-pass GLSL and require no network, API, token, texture, or third-party source.
- Gallery contains exactly 4 presets: Aurora Orbit, Liquid Grid, Pulse Rings, and Neon Threads.
- Lab contains exactly 5 lessons covering `fragCoord`, `iResolution`, shape math, `iTime`, and `iMouse`/custom uniforms.
- Porting runs only compatible single-pass `mainImage` shaders; `iChannel`, sampler, Buffer, sound, VR, camera, keyboard, image, video, and multi-pass dependencies are blockers with explicit guidance.
- Supported built-ins are `iResolution`, `iTime`, `iTimeDelta`, `iFrame`, `iFrameRate`, `iMouse`, `iDate`, and `iSampleRate`.
- Internal shaders use WebGL 1 / GLSL ES 1.00; porting supports WebGL 1 and WebGL 2 through separate adapters.
- Compile and link failures keep the last successful program visible and map diagnostics back to user-source line numbers.
- Only the active tab owns a WebGL context; leaving a tab disposes GPU resources while preserving serializable state and elapsed time.
- Respect `prefers-reduced-motion`, cap device pixel ratio at 2, and expose `0.5×`, `0.75×`, and `1×` render quality.
- All controls remain keyboard accessible; tabs use `tablist`/`tab`/`tabpanel`; live diagnostics use `aria-live="polite"`.
- Required final commands: `npm test`, `npm run lint`, and `npm run build`.

---

## File Map

### Shared runtime

- `src/features/shadertoy-studio/runtime/shaderTypes.ts`: stable runtime, uniform, diagnostic, analysis, and handoff types.
- `src/features/shadertoy-studio/runtime/shaderAdapters.ts`: profile detection and WebGL 1/2 `mainImage` wrappers.
- `src/features/shadertoy-studio/runtime/shaderDiagnostics.ts`: vendor-log parsing and user-line mapping.
- `src/features/shadertoy-studio/runtime/shaderCompatibility.ts`: single-pass compatibility report and custom-uniform extraction.
- `src/features/shadertoy-studio/runtime/shaderCompiler.ts`: compile/link transaction with cleanup.
- `src/features/shadertoy-studio/runtime/shaderRuntime.ts`: context, full-screen triangle, program swap, resize, draw, and dispose.
- `src/features/shadertoy-studio/runtime/shaderClock.ts`: deterministic pause/resume/reset/frame timing.
- `src/features/shadertoy-studio/runtime/pointerMapping.ts`: CSS-to-buffer Shadertoy mouse coordinates.
- `src/features/shadertoy-studio/runtime/useShaderCanvas.ts`: React lifecycle, RAF, resize, pointer, and context recovery.
- `src/features/shadertoy-studio/runtime/ShaderCanvas.tsx`: accessible reusable canvas host.

### Product tabs

- `src/features/shadertoy-studio/gallery/galleryPresets.ts`: original shaders, default controls, state factory, and handoff conversion.
- `src/features/shadertoy-studio/gallery/ShaderGalleryTab.tsx`: Gallery UI.
- `src/features/shadertoy-studio/lab/shaderLessons.ts`: lesson shaders, prompts, choices, explanations, and state factory.
- `src/features/shadertoy-studio/lab/ShaderLabTab.tsx`: Lab UI.
- `src/features/shadertoy-studio/porting/portingModel.ts`: porting state factory, analysis application, custom-uniform values, and recipe model.
- `src/features/shadertoy-studio/porting/IntegrationRecipe.tsx`: verified source/runtime recipe and copy feedback.
- `src/features/shadertoy-studio/porting/ShaderPortingTab.tsx`: Porting UI.
- `src/features/shadertoy-studio/ShadertoyStudioPage.tsx`: query tabs, parent state, status strip, and cross-tab handoffs.
- `src/features/shadertoy-studio/ShadertoyStudioPage.css`: complete responsive dark workbench styling.

### Integration and assets

- `src/App.tsx`: route `shadertoy` to the Studio.
- `src/App.test.tsx`: route contract.
- `src/data/topics.ts`: update topic copy to the approved three-tab product.
- `src/data/topics.test.ts`: retain data-shape contract.
- `docs/demo-plan.md`: make topic order match the current home page.
- `README.md`: add the Shadertoy Studio entry and capabilities.
- `scripts/capture-shadertoy-posters.mjs`: capture four deterministic local WebP posters from the live canvas.
- `public/images/shadertoy-studio/*.webp`: generated local gallery posters.
- `package.json`: add `posters:shadertoy`.

---

### Task 1: Define shader contracts, profile adapters, and diagnostic mapping

**Files:**
- Create: `src/features/shadertoy-studio/runtime/shaderTypes.ts`
- Create: `src/features/shadertoy-studio/runtime/shaderAdapters.ts`
- Create: `src/features/shadertoy-studio/runtime/shaderAdapters.test.ts`
- Create: `src/features/shadertoy-studio/runtime/shaderDiagnostics.ts`
- Create: `src/features/shadertoy-studio/runtime/shaderDiagnostics.test.ts`

**Interfaces:**
- Produces: `ShaderProfile`, `ShaderProfilePreference`, `UniformKind`, `UniformValue`, `UniformBinding`, `ShaderDiagnostic`, `AdaptedShader`, `ShaderCompileRequest`, `ShaderCompileResult`, `ShaderHandoff`.
- Produces: `detectShaderProfile(source, preference)`, `adaptShaderSource(source, profile, defaultPrecision?)`, `parseShaderLog(raw, stage, profile, userLineOffset)`.
- Consumed by: Tasks 2–9.

- [ ] **Step 1: Write adapter and diagnostic tests**

Create tests with these exact behaviors:

```ts
import { describe, expect, it } from 'vitest'
import { adaptShaderSource, detectShaderProfile } from './shaderAdapters'

const source = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(fragCoord / iResolution.xy, 0.0, 1.0);
}`

describe('shaderAdapters', () => {
  it('wraps WebGL 1 mainImage without duplicating declared built-ins', () => {
    const adapted = adaptShaderSource(`uniform float iTime;\n${source}`, 'webgl1')
    expect(adapted.vertexSource).toContain('attribute vec2 aPosition')
    expect(adapted.fragmentSource.match(/uniform float iTime;/g)).toHaveLength(1)
    expect(adapted.fragmentSource).toContain('mainImage(gl_FragColor, gl_FragCoord.xy)')
    expect(adapted.userLineOffset).toBeGreaterThan(0)
  })

  it('keeps #version 300 es first and uses an explicit WebGL 2 output', () => {
    const adapted = adaptShaderSource(`#version 300 es\n${source}`, 'webgl2')
    expect(adapted.fragmentSource.startsWith('#version 300 es\n')).toBe(true)
    expect(adapted.fragmentSource).toContain('out vec4 runtimeFragColor;')
    expect(adapted.fragmentSource).toContain('mainImage(runtimeFragColor, gl_FragCoord.xy)')
  })

  it('detects WebGL 2 only when source or preference requires it', () => {
    expect(detectShaderProfile(source, 'auto')).toBe('webgl1')
    expect(detectShaderProfile('#version 300 es\n' + source, 'auto')).toBe('webgl2')
    expect(detectShaderProfile(source, 'webgl2')).toBe('webgl2')
  })
})
```

```ts
import { describe, expect, it } from 'vitest'
import { parseShaderLog } from './shaderDiagnostics'

describe('parseShaderLog', () => {
  it.each([
    ["ERROR: 0:18: 'x' : undeclared identifier", 18],
    ['0:18(7): error: syntax error', 18],
    ['WARNING: 0:18: implicit truncation', 18],
  ])('maps vendor log %s to the user source', (raw, compiledLine) => {
    const [diagnostic] = parseShaderLog(raw, 'fragment', 'webgl1', 12)
    expect(compiledLine).toBe(18)
    expect(diagnostic.line).toBe(6)
    expect(diagnostic.raw).toBe(raw)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/features/shadertoy-studio/runtime/shaderAdapters.test.ts src/features/shadertoy-studio/runtime/shaderDiagnostics.test.ts
```

Expected: FAIL because the runtime modules do not exist.

- [ ] **Step 3: Implement stable runtime types**

Create `shaderTypes.ts` with these exact public shapes:

```ts
export type ShaderProfile = 'webgl1' | 'webgl2'
export type ShaderProfilePreference = 'auto' | ShaderProfile
export type UniformKind = 'float' | 'int' | 'bool' | 'vec2' | 'vec3' | 'vec4'
export type UniformValue =
  | number
  | boolean
  | [number, number]
  | [number, number, number]
  | [number, number, number, number]

export type UniformBinding = {
  type: UniformKind
  value: UniformValue
}

export type ShaderStage = 'analysis' | 'vertex' | 'fragment' | 'link' | 'runtime'
export type ShaderRuntimeStatus = 'initializing' | 'running' | 'paused' | 'error' | 'unavailable' | 'context-lost'

export type ShaderDiagnostic = {
  severity: 'warning' | 'error'
  stage: ShaderStage
  profile: ShaderProfile
  line?: number
  message: string
  raw: string
}

export type AdaptedShader = {
  profile: ShaderProfile
  vertexSource: string
  fragmentSource: string
  userLineOffset: number
}

export type ShaderCompileRequest = {
  source: string
  profile: ShaderProfile
  revision: number
}

export type ShaderCompileResult =
  | { ok: true; profile: ShaderProfile }
  | { ok: false; profile: ShaderProfile; diagnostics: ShaderDiagnostic[] }

export type TeachingUniformValues = {
  uSpeed: number
  uScale: number
  uIntensity: number
  uPrimaryColor: [number, number, number]
  uSecondaryColor: [number, number, number]
}

export type ShaderHandoff = {
  source: string
  origin: 'gallery' | 'lab'
  title: string
  profile: ShaderProfile
  uniformValues: TeachingUniformValues
  provenance?: {
    sourceUrl?: string
    author?: string
    licenseNote?: string
  }
}
```

- [ ] **Step 4: Implement profile adapters**

Implement `shaderAdapters.ts` around a fixed built-in table. Extract `#version` before composing the wrapper, inject only missing declarations, and return the prefix line count used by diagnostics.

```ts
import type { AdaptedShader, ShaderProfile, ShaderProfilePreference } from './shaderTypes'

const builtIns = [
  ['vec3', 'iResolution'],
  ['float', 'iTime'],
  ['float', 'iTimeDelta'],
  ['int', 'iFrame'],
  ['float', 'iFrameRate'],
  ['vec4', 'iMouse'],
  ['vec4', 'iDate'],
  ['float', 'iSampleRate'],
] as const

const webgl1Vertex = `attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const webgl2Vertex = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

export function detectShaderProfile(
  source: string,
  preference: ShaderProfilePreference,
): ShaderProfile {
  if (preference !== 'auto') return preference
  return /#version\s+300\s+es|\btexture\s*\(|\btexelFetch\s*\(|\blayout\s*\(/u.test(source)
    ? 'webgl2'
    : 'webgl1'
}

function extractVersion(source: string) {
  const match = source.match(/^\s*#version\s+300\s+es\s*\n?/u)
  return {
    source: match ? source.slice(match[0].length) : source,
    version: match ? '#version 300 es' : undefined,
  }
}

function extractPrecision(source: string, defaultPrecision: 'highp' | 'mediump') {
  const pattern = /\bprecision\s+(?:lowp|mediump|highp)\s+float\s*;/u
  const match = source.match(pattern)
  return {
    source: match ? source.replace(pattern, '') : source,
    precision: match?.[0] ?? `precision ${defaultPrecision} float;`,
  }
}

function declares(source: string, name: string) {
  return new RegExp(`\\buniform\\s+\\w+\\s+${name}\\s*;`, 'u').test(source)
}

export function adaptShaderSource(
  source: string,
  profile: ShaderProfile,
  defaultPrecision: 'highp' | 'mediump' = 'highp',
): AdaptedShader {
  const extracted = extractVersion(source)
  if (extracted.version && profile !== 'webgl2') {
    throw new Error('GLSL ES 3.00 source requires the webgl2 profile')
  }
  const normalized = extractPrecision(extracted.source, defaultPrecision)
  const version = profile === 'webgl2' ? '#version 300 es' : undefined
  const precision = normalized.precision
  const uniforms = builtIns
    .filter(([, name]) => !declares(normalized.source, name))
    .map(([type, name]) => `uniform ${type} ${name};`)
    .join('\n')
  const output = profile === 'webgl2' ? 'out vec4 runtimeFragColor;' : ''
  const prefix = [version, precision, uniforms, output].filter(Boolean).join('\n')
  const call = profile === 'webgl2'
    ? 'mainImage(runtimeFragColor, gl_FragCoord.xy);'
    : 'mainImage(gl_FragColor, gl_FragCoord.xy);'
  const fragmentSource = `${prefix}\n${normalized.source.trim()}\nvoid main() {\n  ${call}\n}`
  const prefixLines = prefix.split('\n').length

  return {
    profile,
    vertexSource: profile === 'webgl2' ? webgl2Vertex : webgl1Vertex,
    fragmentSource,
    userLineOffset: prefixLines - (extracted.version ? 1 : 0),
  }
}
```

- [ ] **Step 5: Implement vendor-log parsing**

Create `shaderDiagnostics.ts` with both ANGLE/Safari and Mesa/Firefox patterns. Lines inside the injected prefix or wrapper remain without a user line number.

```ts
import type { ShaderDiagnostic, ShaderProfile, ShaderStage } from './shaderTypes'

const patterns = [
  /^(ERROR|WARNING):\s*\d+:(\d+):\s*(.*)$/u,
  /^\d+:(\d+)\(\d+\):\s*(error|warning):\s*(.*)$/u,
]

export function parseShaderLog(
  raw: string,
  stage: ShaderStage,
  profile: ShaderProfile,
  userLineOffset: number,
): ShaderDiagnostic[] {
  return raw.split('\n').filter(Boolean).map((entry) => {
    const angle = entry.match(patterns[0])
    const mesa = entry.match(patterns[1])
    const compiledLine = Number(angle?.[2] ?? mesa?.[1] ?? 0)
    const level = (angle?.[1] ?? mesa?.[2] ?? 'ERROR').toLowerCase()
    const message = angle?.[3] ?? mesa?.[3] ?? entry
    const mapped = compiledLine > userLineOffset ? compiledLine - userLineOffset : undefined
    return {
      severity: level === 'warning' ? 'warning' : 'error',
      stage,
      profile,
      ...(mapped ? { line: mapped } : {}),
      message,
      raw: entry,
    }
  })
}
```

- [ ] **Step 6: Run focused tests**

Run the Task 1 command again. Expected: 6 or more assertions PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/features/shadertoy-studio/runtime
git commit -m "功能：建立 Shadertoy 源码适配协议"
```

---

### Task 2: Build compatibility analysis and porting recipe models

**Files:**
- Create: `src/features/shadertoy-studio/runtime/shaderCompatibility.ts`
- Create: `src/features/shadertoy-studio/runtime/shaderCompatibility.test.ts`
- Create: `src/features/shadertoy-studio/porting/portingModel.ts`
- Create: `src/features/shadertoy-studio/porting/portingModel.test.ts`

**Interfaces:**
- Consumes: `ShaderProfilePreference`, `ShaderProfile`, `UniformBinding`, `ShaderHandoff` from Task 1.
- Produces: `CompatibilityIssue`, `CustomUniformDefinition`, `CompatibilityReport`, `analyzeShaderCompatibility(source, preference)`.
- Produces: `PortingState`, `createInitialPortingState()`, `applyAnalysis(state)`, `acceptHandoff(state, handoff)`, `createIntegrationRecipe(state)`.
- Consumed by: Tasks 7–9.

- [ ] **Step 1: Write analyzer tests**

```ts
import { describe, expect, it } from 'vitest'
import { analyzeShaderCompatibility } from './shaderCompatibility'

describe('analyzeShaderCompatibility', () => {
  it('accepts a self-contained single-pass shader', () => {
    const report = analyzeShaderCompatibility(
      'void mainImage(out vec4 color, in vec2 coord) { color = vec4(coord.xy, 0.0, 1.0); }',
      'auto',
    )
    expect(report.status).toBe('ready')
    expect(report.profile).toBe('webgl1')
    expect(report.canRun).toBe(true)
  })

  it.each([
    'void mainImage(out vec4 c, in vec2 p) { c = texture2D(iChannel0, p); }',
    'vec2 mainSound(int sample, float time) { return vec2(0.0); } void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
    'void mainVR(out vec4 c, in vec2 p, in vec3 o, in vec3 d) { c = vec4(1.0); } void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
    'uniform sampler2D sourceTexture; void mainImage(out vec4 c, in vec2 p) { c = texture2D(sourceTexture, p); }',
  ])(
    'blocks unsupported dependency %s',
    (shader) => {
      const report = analyzeShaderCompatibility(shader, 'auto')
      expect(report.canRun).toBe(false)
      expect(report.issues.some((issue) => issue.level === 'blocker')).toBe(true)
    },
  )

  it('extracts supported custom uniforms and warns', () => {
    const report = analyzeShaderCompatibility(
      'uniform float glow; uniform vec3 tint; void mainImage(out vec4 c, in vec2 p) { c = vec4(tint * glow, 1.0); }',
      'auto',
    )
    expect(report.status).toBe('warning')
    expect(report.customUniforms.map((item) => [item.name, item.type])).toEqual([
      ['glow', 'float'],
      ['tint', 'vec3'],
    ])
  })

  it('reports iChannel as an unknown external input instead of guessing', () => {
    const report = analyzeShaderCompatibility(
      'void mainImage(out vec4 c, in vec2 p) { c = texture2D(iChannel0, p); }',
      'webgl1',
    )
    expect(report.issues[0].detail).toMatch(/外部输入来源未知/)
  })

  it('ignores unsupported names that only appear in comments', () => {
    const report = analyzeShaderCompatibility(
      '// iChannel0 and mainSound are discussed here\nvoid mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
      'auto',
    )
    expect(report.canRun).toBe(true)
  })

  it('blocks arrays and an explicit WebGL 1 downgrade of GLSL ES 3.00', () => {
    expect(analyzeShaderCompatibility(
      'uniform float weights[4]; void mainImage(out vec4 c, in vec2 p) { c = vec4(weights[0]); }',
      'auto',
    ).canRun).toBe(false)
    expect(analyzeShaderCompatibility(
      '#version 300 es\nvoid mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
      'webgl1',
    ).canRun).toBe(false)
  })
})
```

- [ ] **Step 2: Run analyzer tests to verify failure**

Run:

```bash
npx vitest run src/features/shadertoy-studio/runtime/shaderCompatibility.test.ts
```

Expected: FAIL because `shaderCompatibility.ts` does not exist.

- [ ] **Step 3: Implement compatibility analysis**

Use a deterministic rule table; do not execute pasted source during analysis.

```ts
import { detectShaderProfile } from './shaderAdapters'
import type { ShaderProfile, ShaderProfilePreference, UniformKind } from './shaderTypes'

export type CompatibilityIssue = {
  id: string
  level: 'ready' | 'warning' | 'blocker'
  title: string
  detail: string
  action: string
}

export type CustomUniformDefinition = { name: string; type: UniformKind }

export type CompatibilityReport = {
  status: 'ready' | 'warning' | 'blocker'
  canRun: boolean
  profile: ShaderProfile
  issues: CompatibilityIssue[]
  customUniforms: CustomUniformDefinition[]
}

const builtInNames = new Set([
  'iResolution', 'iTime', 'iTimeDelta', 'iFrame', 'iFrameRate', 'iMouse', 'iDate', 'iSampleRate',
])
const supportedTypes = new Set<UniformKind>(['float', 'int', 'bool', 'vec2', 'vec3', 'vec4'])

function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/.*$/gmu, '')
}

export function analyzeShaderCompatibility(
  source: string,
  preference: ShaderProfilePreference,
): CompatibilityReport {
  const profile = detectShaderProfile(source, preference)
  const analyzedSource = stripComments(source)
  const issues: CompatibilityIssue[] = []
  const uniformPattern = /\buniform\s+(\w+)\s+(\w+)(\s*\[[^\]]+\])?\s*;/gu
  const uniforms = [...analyzedSource.matchAll(uniformPattern)]
  const customUniforms: CustomUniformDefinition[] = []

  const block = (id: string, title: string, detail: string, action: string) =>
    issues.push({ id, level: 'blocker', title, detail, action })

  if (!/\bvoid\s+mainImage\s*\(/u.test(analyzedSource)) {
    block('missing-main-image', '缺少 mainImage', '源码没有 Shadertoy Image 入口。', '保留 Image tab 的 mainImage 函数。')
  }
  if (/\bvoid\s+main\s*\(/u.test(analyzedSource)) {
    block('host-main', '包含宿主 main', '本地 adapter 会生成 main，重复入口无法安全包装。', '移除 main，只保留 mainImage。')
  }
  if (/\biChannel(?:Time|Resolution|[0-3])\b/u.test(analyzedSource)) {
    block('external-channel', '发现 Channel 依赖', '外部输入来源未知，可能来自图片、视频、音频、键盘、Cubemap 或 Buffer。', '确认来源并建立 texture/framebuffer 管线。')
  }
  if (/\bmainSound\s*\(/u.test(analyzedSource)) {
    block('sound-pipeline', '发现声音入口', '当前 runtime 不提供音频合成管线。', '把声音迁移为独立 Web Audio 实现。')
  }
  if (/\bmainVR\s*\(/u.test(analyzedSource)) {
    block('vr-pipeline', '发现 VR 入口', '当前 runtime 不提供 VR 视图参数。', '改用 WebXR 渲染管线。')
  }

  if (preference === 'webgl1' && /#version\s+300\s+es/u.test(analyzedSource)) {
    block('profile-downgrade', 'WebGL profile 不匹配', 'GLSL ES 3.00 不能静默降级为 WebGL 1。', '选择自动或 WebGL 2。')
  }

  for (const [, rawType, name, arraySuffix] of uniforms) {
    if (builtInNames.has(name)) continue
    if (arraySuffix) {
      block(`uniform-${name}`, '不支持的 uniform 数组', `${name} 使用数组输入。`, '把数组拆成受支持的标量或向量输入。')
    } else if (rawType.startsWith('sampler')) {
      block(`sampler-${name}`, '发现外部纹理', `${name} 需要 ${rawType} 资源。`, '创建并绑定对应 texture 后再迁移。')
    } else if (!supportedTypes.has(rawType as UniformKind)) {
      block(`uniform-${name}`, '不支持的 uniform 类型', `${name} 使用 ${rawType}。`, '把输入拆成 float/int/bool/vec2/vec3/vec4。')
    } else {
      customUniforms.push({ name, type: rawType as UniformKind })
    }
  }

  if (customUniforms.length > 0) {
    issues.push({
      id: 'custom-uniforms', level: 'warning', title: '需要宿主输入',
      detail: `发现 ${customUniforms.map((item) => item.name).join('、')}。`,
      action: '在运行前设置初始值，并把同一组值写入 React 配方。',
    })
  }
  if (issues.length === 0) {
    issues.push({ id: 'single-pass-ready', level: 'ready', title: '单 Pass 可运行', detail: '没有发现外部输入。', action: '尝试编译并验证画面。' })
  }
  const status = issues.some((issue) => issue.level === 'blocker')
    ? 'blocker'
    : issues.some((issue) => issue.level === 'warning') ? 'warning' : 'ready'
  return { status, canRun: status !== 'blocker', profile, issues, customUniforms }
}
```

- [ ] **Step 4: Write porting-model tests**

```ts
import { describe, expect, it } from 'vitest'
import { acceptHandoff, applyAnalysis, createInitialPortingState, createIntegrationRecipe } from './portingModel'

describe('portingModel', () => {
  it('accepts an explicit handoff and creates a verified recipe only after success', () => {
    const handed = acceptHandoff(createInitialPortingState(), {
      source: 'void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
      origin: 'gallery', title: 'Aurora Orbit', profile: 'webgl1',
      uniformValues: {
        uSpeed: 1, uScale: 3, uIntensity: 1,
        uPrimaryColor: [0.2, 0.7, 1], uSecondaryColor: [0.8, 0.2, 1],
      },
    })
    const analyzed = applyAnalysis(handed)
    expect(analyzed.report?.canRun).toBe(true)
    expect(createIntegrationRecipe(analyzed)).toBeNull()
    const verified = { ...analyzed, verifiedRevision: analyzed.sourceRevision }
    expect(createIntegrationRecipe(verified)?.title).toBe('Aurora Orbit React 接入配方')
  })
})
```

- [ ] **Step 5: Implement the serializable porting model**

Define `PortingState` with `source`, `sourceRevision`, `verifiedRevision`, `profilePreference`, `report`, `customUniforms`, `provenance`, and `title`. `applyAnalysis` must set zero-valued bindings for every reported custom uniform and clear `verifiedRevision`. `createIntegrationRecipe` must return `null` unless `verifiedRevision === sourceRevision` and must emit five concrete sections: source, bindings, lifecycle code, platform requirements, provenance reminder.

```ts
export function defaultValue(type: UniformKind): UniformBinding {
  if (type === 'bool') return { type, value: false }
  if (type === 'vec2') return { type, value: [0, 0] }
  if (type === 'vec3') return { type, value: [0, 0, 0] }
  if (type === 'vec4') return { type, value: [0, 0, 0, 0] }
  return { type, value: 0 }
}
```

Use this exact verified lifecycle body in the recipe, interpolating only the source import and custom-binding object:

```ts
export const reactLifecycleRecipe = `useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const runtime = createShaderRuntime(canvas, profile)
  const compiled = runtime.replaceSource(fragmentSource)
  if (!compiled.ok) throw new Error(compiled.diagnostics.map((item) => item.message).join('\\n'))

  let frame = 0
  let clock = createShaderClock()
  let currentMouse: [number, number, number, number] = [0, 0, 0, 0]
  const resize = () => runtime.resize(1)
  const pointer = (event: PointerEvent) => {
    const phase = event.type === 'pointerdown' ? 'down' : event.type === 'pointerup' ? 'up' : 'move'
    currentMouse = mapPointerToShader(
      canvas.getBoundingClientRect(),
      { width: canvas.width, height: canvas.height },
      event,
      phase,
      currentMouse,
    )
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  canvas.addEventListener('pointerdown', pointer)
  canvas.addEventListener('pointermove', pointer)
  canvas.addEventListener('pointerup', pointer)

  const draw = (now: number) => {
    clock = tickShaderClock(clock, now, true)
    runtime.draw(clock, currentMouse, customUniforms)
    frame = requestAnimationFrame(draw)
  }
  resize()
  frame = requestAnimationFrame(draw)

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    canvas.removeEventListener('pointerdown', pointer)
    canvas.removeEventListener('pointermove', pointer)
    canvas.removeEventListener('pointerup', pointer)
    runtime.dispose()
  }
}, [fragmentSource, profile])`
```

- [ ] **Step 6: Run Task 2 tests**

Run:

```bash
npx vitest run src/features/shadertoy-studio/runtime/shaderCompatibility.test.ts src/features/shadertoy-studio/porting/portingModel.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/features/shadertoy-studio/runtime/shaderCompatibility* src/features/shadertoy-studio/porting/portingModel*
git commit -m "功能：分析 Shadertoy 单 Pass 迁移兼容性"
```

---

### Task 3: Implement the transactional WebGL runtime and React canvas host

**Files:**
- Create: `src/features/shadertoy-studio/runtime/shaderClock.ts`
- Create: `src/features/shadertoy-studio/runtime/shaderClock.test.ts`
- Create: `src/features/shadertoy-studio/runtime/pointerMapping.ts`
- Create: `src/features/shadertoy-studio/runtime/pointerMapping.test.ts`
- Create: `src/features/shadertoy-studio/runtime/shaderCompiler.ts`
- Create: `src/features/shadertoy-studio/runtime/shaderCompiler.test.ts`
- Create: `src/features/shadertoy-studio/runtime/shaderRuntime.ts`
- Create: `src/features/shadertoy-studio/runtime/useShaderCanvas.ts`
- Create: `src/features/shadertoy-studio/runtime/ShaderCanvas.tsx`

**Interfaces:**
- Consumes: Task 1 adapters, diagnostics, compile request/result, and uniform bindings.
- Produces: `ShaderClock`, `mapPointerToShader(rect, buffer, event, phase, previous)`, `compileProgram(gl, adapted)`, `createShaderRuntime(canvas, profile)`, `useShaderCanvas(options)`, and `<ShaderCanvas />`.
- Consumed by: Tasks 5–8.

- [ ] **Step 1: Write deterministic clock and pointer tests**

```ts
import { describe, expect, it } from 'vitest'
import { createShaderClock, tickShaderClock } from './shaderClock'

describe('shaderClock', () => {
  it('freezes while paused and resumes without adding hidden time', () => {
    let clock = createShaderClock(2)
    clock = tickShaderClock(clock, 1000, true)
    clock = tickShaderClock(clock, 1016, true)
    expect(clock.time).toBeCloseTo(2.016)
    expect(clock.frame).toBe(2)
    clock = tickShaderClock(clock, 5016, false)
    expect(clock.time).toBeCloseTo(2.016)
    expect(clock.delta).toBe(0)
    clock = tickShaderClock(clock, 6016, true)
    expect(clock.delta).toBe(0)
    clock = tickShaderClock(clock, 6032, true)
    expect(clock.time).toBeCloseTo(2.032)
  })
})
```

```ts
import { describe, expect, it } from 'vitest'
import { mapPointerToShader } from './pointerMapping'

describe('mapPointerToShader', () => {
  it('scales CSS coordinates and flips Y', () => {
    const value = mapPointerToShader(
      { left: 10, top: 20, width: 200, height: 100 },
      { width: 400, height: 200 },
      { clientX: 60, clientY: 45 },
      'down',
      [0, 0, 0, 0],
    )
    expect(value).toEqual([100, 150, 100, 150])
    expect(mapPointerToShader(
      { left: 10, top: 20, width: 200, height: 100 },
      { width: 400, height: 200 },
      { clientX: 110, clientY: 70 },
      'up',
      value,
    )).toEqual([200, 100, -100, -150])
  })
})
```

Add a fake-GL compiler test that proves failed temporary shaders/programs are deleted and a successful program is returned without touching any pre-existing program:

```ts
import { describe, expect, it, vi } from 'vitest'
import { adaptShaderSource } from './shaderAdapters'
import { compileProgram } from './shaderCompiler'

function fakeGl(fragmentCompiles: boolean) {
  const vertex = { type: 1 }
  const fragment = { type: 2 }
  const program = { id: 'candidate' }
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    createShader: (type: number) => type === 1 ? vertex : fragment,
    shaderSource: vi.fn(), compileShader: vi.fn(),
    getShaderParameter: (shader: { type: number }) => shader.type === 1 || fragmentCompiles,
    getShaderInfoLog: () => "ERROR: 0:12: 'bad' : syntax error",
    deleteShader: vi.fn(), createProgram: () => program,
    attachShader: vi.fn(), linkProgram: vi.fn(),
    getProgramParameter: () => true, getProgramInfoLog: () => '', deleteProgram: vi.fn(),
  }
  return gl as unknown as WebGLRenderingContext
}

describe('compileProgram', () => {
  it('cleans temporary handles after a failed fragment compile', () => {
    const gl = fakeGl(false)
    const result = compileProgram(gl, adaptShaderSource(
      'void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }', 'webgl1',
    ))
    expect(result.ok).toBe(false)
    expect(gl.deleteShader).toHaveBeenCalledTimes(2)
  })

  it('returns a linked candidate and deletes attached shader handles', () => {
    const gl = fakeGl(true)
    const result = compileProgram(gl, adaptShaderSource(
      'void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }', 'webgl1',
    ))
    expect(result.ok).toBe(true)
    expect(gl.deleteShader).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run clock/pointer tests to verify failure**

```bash
npx vitest run src/features/shadertoy-studio/runtime/shaderClock.test.ts src/features/shadertoy-studio/runtime/pointerMapping.test.ts
```

Expected: FAIL because both modules are absent.

- [ ] **Step 3: Implement clock and pointer pure functions**

Use this state; `lastNow` resets to `null` whenever `playing` is false so resume produces zero delta on its first frame.

```ts
export type ShaderClock = {
  time: number
  delta: number
  frame: number
  frameRate: number
  lastNow: number | null
}

export function createShaderClock(time = 0): ShaderClock {
  return { time, delta: 0, frame: 0, frameRate: 0, lastNow: null }
}

export function tickShaderClock(clock: ShaderClock, now: number, playing: boolean): ShaderClock {
  if (!playing) return { ...clock, delta: 0, lastNow: null }
  const delta = clock.lastNow === null ? 0 : Math.max(0, Math.min((now - clock.lastNow) / 1000, 0.1))
  return {
    time: clock.time + delta,
    delta,
    frame: clock.frame + 1,
    frameRate: delta > 0 ? 1 / delta : clock.frameRate,
    lastNow: now,
  }
}
```

Implement pointer phases `down | move | up`; move only changes `.xy` while `.zw` is positive, and up negates the absolute press coordinates.

- [ ] **Step 4: Implement compiler transactions**

`compileProgram` must create vertex and fragment shaders, compile both, link only after both succeed, delete shader handles after link, and delete a failed program. Return `{ ok: true, program }` or `{ ok: false, diagnostics }`. Use `getShaderInfoLog`/`getProgramInfoLog` and Task 1 diagnostic mapping. Never delete the caller's current program.

- [ ] **Step 5: Implement `createShaderRuntime`**

Use a six-vertex full-screen triangle list `[-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]`. The returned object must expose:

```ts
export type ShaderRuntime = {
  canvas: HTMLCanvasElement
  profile: ShaderProfile
  precision: 'highp' | 'mediump'
  replaceSource: (source: string) => ShaderCompileResult
  resize: (quality: 0.5 | 0.75 | 1) => void
  draw: (clock: ShaderClock, mouse: [number, number, number, number], uniforms: Record<string, UniformBinding>) => void
  dispose: () => void
}
```

At context creation, set `precision` from `getShaderPrecisionFormat(FRAGMENT_SHADER, HIGH_FLOAT)`: use `highp` when `precision > 0`, otherwise `mediump`. `replaceSource` passes that value as the adapter's default precision, compiles a temporary program, catches adapter/profile errors as runtime diagnostics, and swaps only on success. If user source explicitly declares `highp` on a context without it, return a diagnostic instead of rewriting the declaration. `draw` must set all eight Shadertoy built-ins plus custom bindings. Use `uniform1i` for `int`/`bool`, `uniform1f` for `float`, and the matching `uniformNf` for vectors. `resize` uses `getBoundingClientRect()`, `Math.min(devicePixelRatio, 2)`, and quality. `dispose` deletes program and position buffer and calls `WEBGL_lose_context.loseContext()` only when the runtime is explicitly unmounted.

- [ ] **Step 6: Implement React canvas lifecycle**

`useShaderCanvas` receives:

```ts
type ShaderCanvasOptions = {
  request: ShaderCompileRequest
  uniforms: Record<string, UniformBinding>
  playing: boolean
  quality: 0.5 | 0.75 | 1
  initialElapsed: number
  ariaLabel: string
  onCompileResult: (result: ShaderCompileResult) => void
  onElapsedChange: (elapsed: number) => void
  onMouseChange?: (mouse: [number, number, number, number]) => void
}
```

The hook returns `{ hostRef, status }`, where status is `initializing | running | paused | error | unavailable | context-lost`. It creates a candidate canvas and runtime for the requested profile. A candidate replaces the visible canvas only after `replaceSource` succeeds, preserving the previous canvas on failure. Same-profile revisions may compile transactionally in the current runtime. Attach pointer events to the active canvas, create a `ResizeObserver` with a window-resize fallback, run RAF only while playing, draw one frame when uniforms/quality change while paused, and rebuild from the last successful request on `webglcontextrestored`. Cleanup reports elapsed time and disposes the runtime. Keep the imperative canvas host empty from React's perspective so `replaceChildren(candidateCanvas)` cannot conflict with a React-managed child.

- [ ] **Step 7: Implement accessible `ShaderCanvas`**

```tsx
export function ShaderCanvas(props: ShaderCanvasOptions) {
  const { hostRef, status } = useShaderCanvas(props)
  return (
    <div className="shader-canvas-shell" data-runtime-status={status}>
      <div className="shader-canvas-host" ref={hostRef} data-testid="shader-canvas-host" />
      {status === 'unavailable' ? (
        <p className="shader-canvas-fallback">当前浏览器无法创建 WebGL 画布。</p>
      ) : null}
    </div>
  )
}
```

The hook-created canvas must set `aria-label={ariaLabel}`, `tabIndex={0}`, and `data-shader-profile`.

- [ ] **Step 8: Run Task 3 tests and typecheck**

```bash
npx vitest run src/features/shadertoy-studio/runtime/shaderClock.test.ts src/features/shadertoy-studio/runtime/pointerMapping.test.ts
npx vitest run src/features/shadertoy-studio/runtime/shaderCompiler.test.ts
npx tsc -b --pretty false
```

Expected: PASS and no TypeScript errors.

- [ ] **Step 9: Commit Task 3**

```bash
git add src/features/shadertoy-studio/runtime
git commit -m "功能：实现事务式 Shadertoy WebGL 运行时"
```

---

### Task 4: Create original gallery presets and five lesson models

**Files:**
- Create: `src/features/shadertoy-studio/gallery/galleryPresets.ts`
- Create: `src/features/shadertoy-studio/gallery/galleryPresets.test.ts`
- Create: `src/features/shadertoy-studio/lab/shaderLessons.ts`
- Create: `src/features/shadertoy-studio/lab/shaderLessons.test.ts`

**Interfaces:**
- Consumes: `TeachingUniformValues`, `ShaderHandoff`, and runtime uniform types.
- Produces: `GalleryPreset`, `GalleryState`, `galleryPresets`, `createGalleryState()`, `galleryUniformBindings(state)`, `galleryHandoff(state)`.
- Produces: `ShaderLesson`, `LabDraft`, `LabState`, `shaderLessons`, `createLabState()`, `updateLessonDraft()`, `labHandoff(state)`.
- Consumed by: Tasks 5, 6, and 8.

- [ ] **Step 1: Write content contract tests**

```ts
import { describe, expect, it } from 'vitest'
import { galleryPresets } from './galleryPresets'

describe('galleryPresets', () => {
  it('ships four original local single-pass presets', () => {
    expect(galleryPresets.map((preset) => preset.id)).toEqual([
      'aurora-orbit', 'liquid-grid', 'pulse-rings', 'neon-threads',
    ])
    for (const preset of galleryPresets) {
      expect(preset.source).toContain('void mainImage')
      expect(preset.source).not.toMatch(/iChannel|https?:\/\//)
      expect(preset.poster).toMatch(/^\/images\/shadertoy-studio\/.+\.webp$/)
    }
  })
})
```

```ts
import { describe, expect, it } from 'vitest'
import { createLabState, shaderLessons, updateLessonDraft } from './shaderLessons'

describe('shaderLessons', () => {
  it('moves through the five approved concepts', () => {
    expect(shaderLessons.map((lesson) => lesson.id)).toEqual([
      'pixel-color', 'normalized-circle', 'breathing-shape', 'mouse-input', 'aurora-breakdown',
    ])
    expect(shaderLessons.map((lesson) => lesson.concept)).toEqual([
      'fragCoord', 'iResolution', 'shape-math', 'iTime', 'iMouse-uniforms',
    ])
  })

  it('keeps per-lesson drafts isolated', () => {
    const state = createLabState()
    const changed = updateLessonDraft(state, 'pixel-color', { source: 'changed' })
    expect(changed.drafts['pixel-color'].source).toBe('changed')
    expect(changed.drafts['normalized-circle'].source).toContain('mainImage')
  })
})
```

- [ ] **Step 2: Run content tests to verify failure**

```bash
npx vitest run src/features/shadertoy-studio/gallery/galleryPresets.test.ts src/features/shadertoy-studio/lab/shaderLessons.test.ts
```

Expected: FAIL because content modules do not exist.

- [ ] **Step 3: Implement shared teaching controls and gallery state**

Use these defaults and stable poster paths:

```ts
const defaults: TeachingUniformValues = {
  uSpeed: 1,
  uScale: 3,
  uIntensity: 1,
  uPrimaryColor: [0.12, 0.74, 1],
  uSecondaryColor: [0.88, 0.18, 0.96],
}

export type GalleryState = {
  presetId: GalleryPreset['id']
  uniforms: TeachingUniformValues
  container: 'background' | 'hero' | 'card'
  playing: boolean
  quality: 0.5 | 0.75 | 1
  elapsed: number
  compileRevision: number
}
```

Use these exact original source bodies; prepend `teachingUniformHeader` to each and set `licenseNote: 'Original project shader'` in handoffs:

```ts
export const teachingUniformHeader = `uniform float uSpeed;
uniform float uScale;
uniform float uIntensity;
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;`

export const gallerySources = {
  'aurora-orbit': `${teachingUniformHeader}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  float t = iTime * uSpeed;
  float angle = t * 0.18;
  mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  p = rotation * p * (0.7 + uScale * 0.12);
  float orbit = abs(length(p) - (0.48 + 0.06 * sin(t)));
  float ring = 1.0 - smoothstep(0.015, 0.08, orbit);
  float wash = 0.5 + 0.5 * sin(p.x * 3.0 + p.y * 4.0 + t);
  vec3 color = mix(uPrimaryColor, uSecondaryColor, wash);
  fragColor = vec4(color * (0.08 + ring * uIntensity), 1.0);
}`,
  'liquid-grid': `${teachingUniformHeader}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  float t = iTime * uSpeed;
  p *= 1.4 + uScale * 0.35;
  p.x += sin(p.y * 1.8 + t) * 0.28;
  p.y += cos(p.x * 1.5 - t * 0.8) * 0.22;
  vec2 cell = abs(fract(p) - 0.5);
  float grid = 1.0 - smoothstep(0.42, 0.5, min(cell.x, cell.y));
  float pulse = 0.5 + 0.5 * sin((p.x + p.y) * 2.0 - t * 1.4);
  vec3 color = mix(uPrimaryColor, uSecondaryColor, pulse);
  fragColor = vec4(color * grid * uIntensity + color * 0.06, 1.0);
}`,
  'pulse-rings': `${teachingUniformHeader}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  vec2 pointer = iMouse.z > 0.0
    ? (iMouse.xy * 2.0 - iResolution.xy) / iResolution.y
    : vec2(0.0);
  float distanceToPointer = length(p - pointer);
  float wave = 0.5 + 0.5 * cos(distanceToPointer * (12.0 + uScale * 4.0) - iTime * uSpeed * 4.0);
  float rings = smoothstep(0.58, 0.92, wave) * (1.0 - smoothstep(0.2, 1.3, distanceToPointer));
  vec3 color = mix(uPrimaryColor, uSecondaryColor, distanceToPointer);
  fragColor = vec4(color * (0.06 + rings * uIntensity), 1.0);
}`,
  'neon-threads': `${teachingUniformHeader}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  float glow = 0.0;
  for (int index = 0; index < 5; index++) {
    float lineIndex = float(index) - 2.0;
    float y = lineIndex * 0.13 + sin(p.x * (uScale + lineIndex * 0.16) + iTime * uSpeed + lineIndex) * 0.12;
    glow += 1.0 - smoothstep(0.01, 0.055, abs(p.y - y));
  }
  float blend = 0.5 + 0.5 * sin(p.x * 2.0 + iTime * 0.25);
  vec3 color = mix(uPrimaryColor, uSecondaryColor, blend);
  fragColor = vec4(color * glow * uIntensity + color * 0.04, 1.0);
}`,
} as const
```

- [ ] **Step 4: Implement exact lesson progression**

Each lesson contains `id`, `number`, `title`, `concept`, `summary`, `source`, `predictionQuestion`, exactly 3 `predictionOptions`, `correctPredictionId`, `explanation`, and default teaching uniforms. Use these full sources; lesson 5 imports the exact Aurora Orbit source from the Gallery rather than copying a divergent version:

```ts
const lessonSources = {
  'pixel-color': `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  fragColor = vec4(uv.x, uv.y, 0.35, 1.0);
}`,
  'normalized-circle': `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  float circle = 1.0 - smoothstep(0.38, 0.4, length(p));
  vec3 color = mix(vec3(0.03, 0.08, 0.16), vec3(0.2, 0.85, 1.0), circle);
  fragColor = vec4(color, 1.0);
}`,
  'breathing-shape': `${teachingUniformHeader}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  float radius = 0.34 + sin(iTime * uSpeed) * 0.08;
  float shape = 1.0 - smoothstep(radius, radius + 0.035, length(p));
  vec3 color = mix(uSecondaryColor, uPrimaryColor, shape);
  fragColor = vec4(color * (0.08 + shape * uIntensity), 1.0);
}`,
  'mouse-input': `${teachingUniformHeader}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  vec2 pointer = iMouse.z > 0.0
    ? (iMouse.xy * 2.0 - iResolution.xy) / iResolution.y
    : vec2(0.0);
  float distanceToPointer = length(p - pointer);
  float glow = 1.0 - smoothstep(0.04, 0.5 / max(uScale, 0.5), distanceToPointer);
  vec3 color = mix(uSecondaryColor, uPrimaryColor, glow);
  fragColor = vec4(color * (0.05 + glow * uIntensity), 1.0);
}`,
  'aurora-breakdown': galleryPresets.find((preset) => preset.id === 'aurora-orbit')!.source,
} as const
```

`createLabState()` creates one draft per lesson. Each draft stores source, uniforms, predictionId, explanationRevealed, compileRevision, lastSuccessfulSource, and elapsed.

- [ ] **Step 5: Run Task 4 tests**

Run the Task 4 command again. Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add src/features/shadertoy-studio/gallery src/features/shadertoy-studio/lab
git commit -m "内容：加入原创 Shader 作品与五步课程"
```

---

### Task 5: Build the Gallery tab

**Files:**
- Create: `src/features/shadertoy-studio/gallery/ShaderGalleryTab.tsx`
- Create: `src/features/shadertoy-studio/gallery/ShaderGalleryTab.test.tsx`

**Interfaces:**
- Consumes: `GalleryState`, preset helpers, `ShaderCanvas`, `ShaderHandoff`.
- Produces: `<ShaderGalleryTab state onChange onInspectInLab onCheckMigration />`.
- Consumed by: Task 8.

- [ ] **Step 1: Write the Gallery interaction test with the GPU component mocked**

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGalleryState } from './galleryPresets'
import { ShaderGalleryTab } from './ShaderGalleryTab'

vi.mock('../runtime/ShaderCanvas', () => ({
  ShaderCanvas: () => <div data-testid="shader-canvas-host" />,
}))

afterEach(cleanup)

describe('ShaderGalleryTab', () => {
  it('selects presets, edits uniforms, and changes website framing', async () => {
    const user = userEvent.setup()
    let state = createGalleryState()
    const onChange = vi.fn((next) => { state = next })
    const { rerender } = render(
      <ShaderGalleryTab state={state} onChange={onChange} onInspectInLab={vi.fn()} onCheckMigration={vi.fn()} />,
    )
    expect(screen.getAllByRole('button', { name: /选择作品/ })).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: /选择作品 Liquid Grid/ }))
    rerender(<ShaderGalleryTab state={state} onChange={onChange} onInspectInLab={vi.fn()} onCheckMigration={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Liquid Grid' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Hero 横幅' }))
    expect(onChange).toHaveBeenCalled()
    expect(screen.getByLabelText('动画速度')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '去实验室拆解' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '检查迁移' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the Gallery test to verify failure**

```bash
npx vitest run src/features/shadertoy-studio/gallery/ShaderGalleryTab.test.tsx
```

Expected: FAIL because `ShaderGalleryTab.tsx` is absent.

- [ ] **Step 3: Implement Gallery layout and state changes**

Render four poster buttons, one `ShaderCanvas`, range inputs for speed/scale/intensity, two color inputs, three radio container modes, play/pause, reset, quality buttons, concept summary, and both handoff buttons. Convert color input hex values to normalized RGB before writing `TeachingUniformValues`. Selecting a preset replaces defaults, increments `compileRevision`, and keeps the current container/quality. Pass the selected source and revision to `ShaderCanvas`.

Use this callback contract exactly:

```ts
type ShaderGalleryTabProps = {
  state: GalleryState
  onChange: (state: GalleryState) => void
  onInspectInLab: (presetId: GalleryPreset['id']) => void
  onCheckMigration: (handoff: ShaderHandoff) => void
}
```

The live stage wrapper must set `data-container={state.container}` and contain text explaining background, hero, or card use plus contrast/performance/reduced-motion notes.

- [ ] **Step 4: Run the Gallery test**

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

```bash
git add src/features/shadertoy-studio/gallery
git commit -m "功能：实现 Shader 作品展厅"
```

---

### Task 6: Build the guided Lab tab

**Files:**
- Create: `src/features/shadertoy-studio/lab/ShaderLabTab.tsx`
- Create: `src/features/shadertoy-studio/lab/ShaderLabTab.test.tsx`

**Interfaces:**
- Consumes: `LabState`, lesson helpers, `ShaderCanvas`, `ShaderHandoff`.
- Produces: `<ShaderLabTab state onChange referencePreset onCheckMigration />`.
- Consumed by: Task 8.

- [ ] **Step 1: Write Lab workflow tests**

Import `fireEvent` from Testing Library. Mock `ShaderCanvas` so a `useEffect` keyed by `request.revision` calls `onCompileResult({ ok: true, profile: 'webgl1' })`. Test all five lesson buttons, source draft edits, prediction radios, explicit run, explanation reveal, restore, and the host bridge explanation.

```tsx
expect(screen.getAllByRole('button', { name: /实验 \d/ })).toHaveLength(5)
fireEvent.change(screen.getByLabelText('GLSL mainImage 源码'), {
  target: { value: 'void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }' },
})
await user.click(screen.getByRole('radio', { name: /渐变方向交换/ }))
await user.click(screen.getByRole('button', { name: '运行代码' }))
expect(screen.getByText(/运行结果解释/)).toBeInTheDocument()
expect(screen.getByText(/React 创建 canvas/)).toBeInTheDocument()
```

- [ ] **Step 2: Run the Lab test to verify failure**

```bash
npx vitest run src/features/shadertoy-studio/lab/ShaderLabTab.test.tsx
```

Expected: FAIL because `ShaderLabTab.tsx` is absent.

- [ ] **Step 3: Implement Lab state-preserving UI**

Render the five-step rail, current concept card, prediction fieldset, canvas controls, teaching uniform controls, textarea, Run, Restore, diagnostics, and host bridge. Editing changes only the active draft source. Run increments only the active draft's `compileRevision`; on successful compile set `lastSuccessfulSource`, reveal explanation, and retain the selected prediction. A failed compile stores diagnostics and does not reveal a new explanation.

Use this callback contract:

```ts
type ShaderLabTabProps = {
  state: LabState
  onChange: (state: LabState) => void
  referencePreset?: GalleryPreset
  onCheckMigration: (handoff: ShaderHandoff) => void
}
```

The bridge section must display the exact five host responsibilities: create canvas/context, compile/link, resize `iResolution`, update time/mouse/custom uniforms, cancel RAF and delete GPU resources.

- [ ] **Step 4: Run the Lab test**

Expected: PASS.

- [ ] **Step 5: Commit Task 6**

```bash
git add src/features/shadertoy-studio/lab
git commit -m "功能：实现五步 Shader 引导实验室"
```

---

### Task 7: Build the single-pass Porting tab and integration recipe

**Files:**
- Create: `src/features/shadertoy-studio/porting/IntegrationRecipe.tsx`
- Create: `src/features/shadertoy-studio/porting/ShaderPortingTab.tsx`
- Create: `src/features/shadertoy-studio/porting/ShaderPortingTab.test.tsx`

**Interfaces:**
- Consumes: Task 2 porting model/report, Task 3 `ShaderCanvas`, pending `ShaderHandoff`.
- Produces: `<ShaderPortingTab state onChange pendingHandoff onAcceptHandoff onRejectHandoff />` and `<IntegrationRecipe recipe />`.
- Consumed by: Task 8.

- [ ] **Step 1: Write Porting workflow tests**

Import `fireEvent` from Testing Library. Cover ready source, channel blocker, custom-uniform inputs, successful verification, stale recipe after edits, copy fallback, and pending handoff confirmation.

```tsx
fireEvent.change(screen.getByLabelText('Shadertoy Image 源码'), { target: { value: readySource } })
await user.click(screen.getByRole('button', { name: '分析兼容性' }))
expect(screen.getByText('单 Pass 可运行')).toBeInTheDocument()
await user.click(screen.getByRole('button', { name: '尝试运行' }))
expect(screen.getByRole('heading', { name: /React 接入配方/ })).toBeInTheDocument()

fireEvent.change(screen.getByLabelText('Shadertoy Image 源码'), { target: { value: channelSource } })
await user.click(screen.getByRole('button', { name: '分析兼容性' }))
expect(screen.getByText('发现 Channel 依赖')).toBeInTheDocument()
expect(screen.getByRole('button', { name: '尝试运行' })).toBeDisabled()
expect(screen.getByText(/外部输入来源未知/)).toBeInTheDocument()
```

- [ ] **Step 2: Run the Porting test to verify failure**

```bash
npx vitest run src/features/shadertoy-studio/porting/ShaderPortingTab.test.tsx
```

Expected: FAIL because the UI modules are absent.

- [ ] **Step 3: Implement the compatibility-first Porting UI**

Render source, URL, author, license note, profile radios, Analyze, issue cards, generated inputs for supported custom uniforms, Try Run, canvas, compile diagnostics, and recipe. Source edits increment `sourceRevision`, clear `verifiedRevision`, and mark an existing recipe stale. Analyze calls `applyAnalysis`. Try Run is disabled if `report?.canRun !== true`. On successful compile set `verifiedRevision = sourceRevision`.

For blockers, map issue IDs to exact guidance:

- `external-channel`: texture source discovery, filtering/wrapping, frame binding.
- `sampler-*`: local asset plus sampler binding.
- `sound-pipeline`: Web Audio.
- `vr-pipeline`: WebXR.
- `uniform-*`: flatten matrix/array/struct inputs.

Do not render a fake code recipe while blocked.

- [ ] **Step 4: Implement recipe rendering and copy behavior**

`IntegrationRecipe` renders five labeled `<pre>` blocks and uses `navigator.clipboard.writeText`. When Clipboard API is absent or rejects, focus and select the related readonly textarea and show “请手动复制已选文本”. The feedback node uses `aria-live="polite"`.

- [ ] **Step 5: Run the Porting test**

Expected: PASS.

- [ ] **Step 6: Commit Task 7**

```bash
git add src/features/shadertoy-studio/porting
git commit -m "功能：实现单 Pass Shader 迁移工作台"
```

---

### Task 8: Integrate the Studio shell, URL tabs, route, and cross-tab handoffs

**Files:**
- Create: `src/features/shadertoy-studio/ShadertoyStudioPage.tsx`
- Create: `src/features/shadertoy-studio/ShadertoyStudioPage.test.tsx`
- Create: `src/features/shadertoy-studio/ShadertoyStudioPage.css`
- Modify: `src/App.tsx:1-63`
- Modify: `src/App.test.tsx:56-90`
- Modify: `src/data/topics.ts:76-105`

**Interfaces:**
- Consumes: all three tab components and state factories.
- Produces: complete `/topics/shadertoy` product surface.

- [ ] **Step 1: Write Studio integration tests**

Test default gallery, query selection, invalid query fallback, keyboard tabs, state persistence, A→B reference, A/B→C handoff, and overwrite confirmation.

```tsx
window.history.pushState({}, '', '/topics/shadertoy?view=porting')
render(<ShadertoyStudioPage />)
expect(screen.getByRole('tab', { name: '迁移工作台' })).toHaveAttribute('aria-selected', 'true')
expect(screen.getByRole('tabpanel', { name: '迁移工作台' })).toBeInTheDocument()

await user.keyboard('{ArrowLeft}')
expect(screen.getByRole('tab', { name: '引导实验室' })).toHaveFocus()
expect(window.location.search).toBe('?view=lab')
```

Add this route assertion to `App.test.tsx`:

```tsx
it('renders Shadertoy Studio from the fourth topic route', () => {
  window.history.pushState({}, '', '/topics/shadertoy')
  render(<App />)
  expect(screen.getByRole('heading', { level: 1, name: 'Shadertoy Studio' })).toBeInTheDocument()
  expect(screen.getAllByRole('tab')).toHaveLength(3)
})
```

- [ ] **Step 2: Run integration tests to verify failure**

```bash
npx vitest run src/features/shadertoy-studio/ShadertoyStudioPage.test.tsx src/App.test.tsx
```

Expected: FAIL because the page and route do not exist.

- [ ] **Step 3: Implement parent-owned state and URL tabs**

`ShadertoyStudioPage` owns `GalleryState`, `LabState`, `PortingState`, `activeView`, `referencePresetId`, and `pendingHandoff`. Parse `view` from `window.location.search`; use `history.replaceState` on changes. Render only the active tab panel so only it mounts a canvas runtime.

The shell must render the back link, `Shadertoy Studio` H1, subtitle “从作品、原理到 React 迁移。”, a text status containing active profile/runtime state, and the five-node concept strip `像素坐标 → mainImage → uniforms → GPU 逐像素计算 → canvas`. Set `data-active-view` on the concept strip so CSS can highlight the gallery, lab, or porting emphasis without changing node order.

Tab keyboard behavior:

```ts
const views = ['gallery', 'lab', 'porting'] as const
function nextView(current: StudioView, key: string): StudioView | undefined {
  const index = views.indexOf(current)
  if (key === 'ArrowRight') return views[(index + 1) % views.length]
  if (key === 'ArrowLeft') return views[(index + views.length - 1) % views.length]
  if (key === 'Home') return views[0]
  if (key === 'End') return views[views.length - 1]
  return undefined
}
```

When A requests Lab inspection, set `referencePresetId` and switch to `lab` without touching lesson drafts. When A/B requests porting and C is empty, accept and analyze immediately. When C contains a different source, store `pendingHandoff`, switch to C, and show Accept/Keep buttons; only Accept overwrites C.

- [ ] **Step 4: Add the App route and topic copy**

Import `ShadertoyStudioPage` next to existing feature imports and add:

```tsx
if (slug === 'shadertoy') {
  return <ShadertoyStudioPage />
}
```

Update the Shadertoy topic summary, goal, interactions, and acceptance criteria to mention all three tabs, while retaining the existing slug/category/reference.

- [ ] **Step 5: Implement complete responsive CSS**

Use `.shadertoy-studio` as the only global root and scope every selector below it. Required layout values:

```css
.shadertoy-studio {
  --shader-bg: #05070d;
  --shader-panel: rgba(13, 18, 30, 0.92);
  --shader-line: rgba(141, 164, 196, 0.22);
  --shader-text: #f3f7ff;
  --shader-muted: #9eacc0;
  --shader-cyan: #4ce6ff;
  --shader-violet: #a979ff;
  min-height: 100vh;
  padding: 20px;
  color: var(--shader-text);
  background: radial-gradient(circle at 20% 0%, #132344 0, transparent 34%), var(--shader-bg);
}

.shader-tablist { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.shader-concept-strip { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.shader-gallery-grid,
.shader-lab-grid,
.shader-porting-grid { display: grid; grid-template-columns: 280px minmax(0, 1fr) 360px; gap: 14px; }
.shader-stage[data-container='background'] { aspect-ratio: 16 / 9; }
.shader-stage[data-container='hero'] { aspect-ratio: 3 / 1; }
.shader-stage[data-container='card'] { aspect-ratio: 4 / 3; max-width: 640px; }
.shader-canvas-host, .shader-canvas-host canvas { width: 100%; height: 100%; display: block; }
.shader-code-input { min-height: 360px; resize: vertical; font: 0.82rem/1.55 ui-monospace, monospace; }

@media (max-width: 1100px) {
  .shader-gallery-grid,
  .shader-lab-grid,
  .shader-porting-grid { grid-template-columns: 240px minmax(0, 1fr); }
  .shader-side-panel { grid-column: 1 / -1; }
}

@media (max-width: 720px) {
  .shadertoy-studio { padding: 12px; }
  .shader-tablist { grid-template-columns: 1fr; }
  .shader-concept-strip { display: flex; overflow-x: auto; }
  .shader-gallery-grid,
  .shader-lab-grid,
  .shader-porting-grid { grid-template-columns: 1fr; }
  .shader-code-input { min-height: 280px; }
}

@media (prefers-reduced-motion: reduce) {
  .shadertoy-studio *, .shadertoy-studio *::before, .shadertoy-studio *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

Append these scoped panel, control, status, and accessibility rules; do not alter `App.css` global heading rules:

```css
.shadertoy-studio .shader-panel {
  border: 1px solid var(--shader-line);
  border-radius: 14px;
  padding: 16px;
  background: var(--shader-panel);
  box-shadow: 0 18px 54px rgba(0, 0, 0, 0.28);
}
.shadertoy-studio button,
.shadertoy-studio input,
.shadertoy-studio textarea { font: inherit; }
.shadertoy-studio button {
  min-height: 40px;
  border: 1px solid var(--shader-line);
  border-radius: 9px;
  color: var(--shader-text);
  background: rgba(25, 34, 52, 0.9);
  cursor: pointer;
}
.shadertoy-studio button[aria-selected='true'],
.shadertoy-studio button[aria-pressed='true'] {
  border-color: var(--shader-cyan);
  color: #031018;
  background: var(--shader-cyan);
}
.shadertoy-studio button:disabled { cursor: not-allowed; opacity: 0.48; }
.shadertoy-studio :focus-visible { outline: 3px solid var(--shader-violet); outline-offset: 3px; }
.shader-preset-card { display: grid; gap: 8px; text-align: left; overflow: hidden; }
.shader-preset-card img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 7px; }
.shader-control-list { display: grid; gap: 14px; }
.shader-control-list label { display: grid; gap: 6px; color: var(--shader-muted); }
.shader-control-list input[type='range'] { width: 100%; accent-color: var(--shader-cyan); }
.shader-status { display: inline-flex; align-items: center; gap: 8px; color: var(--shader-muted); }
.shader-status::before { width: 8px; height: 8px; border-radius: 999px; background: currentColor; content: ''; }
.shader-status[data-level='running'], .shader-issue[data-level='ready'] { color: #77f2b6; }
.shader-status[data-level='warning'], .shader-issue[data-level='warning'] { color: #ffd166; }
.shader-status[data-level='error'], .shader-issue[data-level='blocker'] { color: #ff7b8f; }
.shader-issue { border-left: 3px solid currentColor; padding: 10px 12px; background: rgba(255, 255, 255, 0.035); }
.shader-code-input,
.shader-recipe textarea {
  width: 100%;
  border: 1px solid var(--shader-line);
  border-radius: 10px;
  padding: 12px;
  color: #dff7ff;
  background: #070b13;
}
.shader-recipe { display: grid; gap: 16px; }
.shader-recipe pre { overflow: auto; max-height: 420px; padding: 14px; border-radius: 10px; background: #03060c; }
.shader-handoff-banner { display: grid; gap: 10px; border: 1px solid #ffd166; padding: 14px; border-radius: 10px; }
.shader-canvas-fallback { position: absolute; inset: 0; display: grid; place-items: center; color: var(--shader-muted); }
```

- [ ] **Step 6: Run Studio and App tests**

Expected: PASS.

- [ ] **Step 7: Commit Task 8**

```bash
git add src/App.tsx src/App.test.tsx src/data/topics.ts src/features/shadertoy-studio/ShadertoyStudioPage*
git commit -m "功能：接入 Shadertoy 三模式工作台"
```

---

### Task 9: Generate local posters, align docs, and verify the real browser experience

**Files:**
- Create: `scripts/capture-shadertoy-posters.mjs`
- Create: `public/images/shadertoy-studio/aurora-orbit.webp`
- Create: `public/images/shadertoy-studio/liquid-grid.webp`
- Create: `public/images/shadertoy-studio/pulse-rings.webp`
- Create: `public/images/shadertoy-studio/neon-threads.webp`
- Modify: `package.json:6-22`
- Modify: `docs/demo-plan.md:7-28`
- Modify: `README.md:5-28`

**Interfaces:**
- Consumes: completed Studio route and Playwright.
- Produces: checked-in original posters, corrected topic documentation, and final verification evidence.

- [ ] **Step 1: Add the poster capture script and package command**

The script accepts `SHADERTOY_BASE_URL` defaulting to `http://127.0.0.1:5173`, opens the Gallery, clicks each accessible preset button, pauses, resets time, waits two animation frames, calls `canvas.toDataURL('image/webp', 0.86)`, and writes the decoded base64 bytes using `node:fs/promises`.

```js
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const baseUrl = process.env.SHADERTOY_BASE_URL ?? 'http://127.0.0.1:5173'
const presets = ['aurora-orbit', 'liquid-grid', 'pulse-rings', 'neon-threads']
const output = new URL('../public/images/shadertoy-studio/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
await page.goto(`${baseUrl}/topics/shadertoy?view=gallery`)

for (const id of presets) {
  await page.locator(`[data-preset-id="${id}"]`).click()
  const pause = page.getByRole('button', { name: '暂停动画' })
  if (await pause.isVisible()) await pause.click()
  await page.getByRole('button', { name: '重置时间' }).click()
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const dataUrl = await page.locator('.shader-stage canvas').evaluate((canvas) =>
    (canvas).toDataURL('image/webp', 0.86),
  )
  await writeFile(new URL(`${id}.webp`, output), Buffer.from(dataUrl.split(',')[1], 'base64'))
}

await browser.close()
```

Set `data-preset-id={preset.id}` on the same accessible preset selection button used by the Gallery component test.

Add:

```json
"posters:shadertoy": "node scripts/capture-shadertoy-posters.mjs"
```

- [ ] **Step 2: Start the existing dev server or launch it if absent**

Check:

```bash
curl -fsS http://127.0.0.1:5173/topics/shadertoy >/dev/null
```

If that fails, run `npm run dev -- --host 127.0.0.1` in a persistent terminal session. Do not start a duplicate server when one already responds.

- [ ] **Step 3: Capture posters and verify files**

```bash
npm run posters:shadertoy
file public/images/shadertoy-studio/*.webp
```

Expected: four WebP files, each non-empty and visually matching its selected original shader.

- [ ] **Step 4: Update documentation**

Rewrite `docs/demo-plan.md` topic order to match `src/data/topics.ts`: ECharts, Spline, Three.js, Shadertoy, Unicorn, Matter.js, Rive, Mapbox, Remotion Course. Mark Shadertoy as the active fourth implementation and summarize A/B/C. Add a README subsection with `/topics/shadertoy`, the three tabs, supported built-ins, and the single-pass boundary.

- [ ] **Step 5: Run all automated validation**

```bash
npm test
npm run lint
npm run build
```

Expected: all tests PASS, oxlint reports zero errors, TypeScript/Vite production build exits 0.

- [ ] **Step 6: Perform desktop Playwright verification**

At 1440×1000:

1. Open Gallery; select all four presets and confirm the canvas changes without console errors.
2. Change speed, scale, intensity, both colors, quality, and all three container modes.
3. Pause, resume, and reset time; verify reset returns the animation to its initial state.
4. Open Lab; edit valid GLSL, select a prediction, run, and see explanation.
5. Introduce one syntax error; verify mapped line diagnostics and the last successful picture remain.
6. Open Porting; analyze a ready shader, set custom uniforms, run, copy recipe.
7. Analyze and run one `#version 300 es` single-pass shader; verify the visible canvas reports `data-shader-profile="webgl2"`.
8. Analyze `iChannel0`; verify blocker and specific guidance, with Try Run disabled.
9. Exercise A→B and A/B→C handoffs, including the overwrite-confirmation banner.
10. Confirm URL query changes without adding history entries.

- [ ] **Step 7: Perform mobile and recovery verification**

At 390×844:

1. Verify one-column order, readable horizontal concept strip, non-overflowing canvas, textarea, and recipe.
2. Use keyboard focus traversal through tabs and controls.
3. Emulate reduced motion and verify A/B start paused.
4. Trigger `WEBGL_lose_context`; verify recovery status, resource rebuild, and restored last successful source.
5. Switch tabs repeatedly and confirm the inactive runtime is disposed and elapsed time does not include time away.

- [ ] **Step 8: Commit Task 9**

```bash
git add package.json scripts/capture-shadertoy-posters.mjs public/images/shadertoy-studio docs/demo-plan.md README.md
git commit -m "完成：收口 Shadertoy Studio 资产与文档"
```

---

## Final Completion Check

- [ ] `git status --short` shows no unintended files.
- [ ] Every spec acceptance criterion maps to Tasks 5–9.
- [ ] No remote shader, texture, API, or token is required.
- [ ] Exactly four gallery presets and five lab lessons ship.
- [ ] Single-pass WebGL 1 and WebGL 2 sources have separate wrappers.
- [ ] External inputs are blockers with honest guidance, never silent guesses.
- [ ] Compile failure preserves the last successful canvas and exposes mapped diagnostics.
- [ ] Tab state, explicit handoff, reduced motion, mobile layout, and context recovery are browser-verified.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass immediately before delivery.
