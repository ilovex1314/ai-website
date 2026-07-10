# Course Workbench Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有课程动画管理台原型升级为可真实导入 HyperFrames 项目、编辑动作实例、保存多比例布局、调用 Codex CLI 生成动作并使用 Remotion 导出 Master 与 CapCut 交付包的本地生产工具。

**Architecture:** 保留 React/Vite topic 入口，增加只监听本机的 Node Workbench Service。前端和最终导出共用 `CourseComposition`；HyperFrames 源项目通过显式元数据契约导入；Codex CLI、Mock Agent、文件存储和渲染均通过 Provider 接口隔离。

**Tech Stack:** React 19、TypeScript 6、Vite 8、Vitest、Zod、Node HTTP、Remotion Player/Renderer、FFmpeg/FFprobe、Codex CLI。

## Global Constraints

- HyperFrames 原项目允许在用户确认后补全元数据；写回前必须生成备份或变更报告。
- HTML `data-*` 保存 scene/element 稳定标识；动画 manifest 是动画时间与语义的唯一权威来源。
- HyperFrames 内置动画必须标记为 `baked-internal`，不得重复生成平台覆盖层。
- `ActionTemplate` 不保存项目位置；拖拽、时间和比例覆盖只写 `ActionInstance`。
- 16:9、4:3、9:16 独立持久化，绑定动作跟随目标 DOM 的目标比例测量矩形。
- Remotion frame 是唯一播放时间源；后台静音，前台口播为主音轨，总时长跟随后台。
- Review Player 与最终 Renderer 必须使用同一个 `CourseComposition` 和同一份项目数据。
- Agent Gateway 当前只实现 `CodexCliProvider` 和 `MockAgentProvider`；本轮不调用 OpenAI API。
- Codex 参数修改只返回 patch；复杂动作只能写项目草稿目录；制作台任务不能自动修改核心编辑器代码。
- Cloudflare 只启用 Mock Provider，不读取本地文件、不调用 Codex、不渲染视频。
- 每个任务先写失败测试，再实现；jsdom 媒体 Mock 不能替代真实浏览器与真实渲染验收。

---

## File Map

### Domain

- `src/features/remotion-course-workbench/domain/courseProjectSchema.ts`：Zod v2 项目格式与类型。
- `src/features/remotion-course-workbench/domain/courseProjectMigration.ts`：旧 reducer 数据迁移。
- `src/features/remotion-course-workbench/domain/geometry.ts`：源坐标、元素锚点和比例布局变换。
- `src/features/remotion-course-workbench/domain/selectors.ts`：当前帧 scene、元素、动作实例选择器。

### Shared Remotion Runtime

- `src/features/remotion-course-workbench/remotion/CourseComposition.tsx`：预览和导出共用 Composition。
- `src/features/remotion-course-workbench/remotion/ActionOverlayLayer.tsx`：平台动作实例渲染。
- `src/features/remotion-course-workbench/remotion/ForegroundLayer.tsx`：前台口播窗口与主音轨。
- `src/features/remotion-course-workbench/remotion/Root.tsx`：Remotion CLI composition 注册。

### Local Service

- `server/course-workbench/app.ts`：本地 HTTP 服务和路由装配。
- `server/course-workbench/config.ts`：环境变量和允许目录。
- `server/course-workbench/projectRepository.ts`：项目文件原子读写。
- `server/course-workbench/hyperframes/importer.ts`：导入协调。
- `server/course-workbench/hyperframes/contract.ts`：HTML/manifest 契约校验。
- `server/course-workbench/hyperframes/migrator.ts`：旧项目补全和备份。
- `server/course-workbench/mediaProbe.ts`：FFprobe 媒体元数据。
- `server/course-workbench/agent/AgentProvider.ts`：Agent Provider 接口。
- `server/course-workbench/agent/CodexCliProvider.ts`：受限 `codex exec` 任务。
- `server/course-workbench/agent/MockAgentProvider.ts`：公网/测试结果。
- `server/course-workbench/render/renderService.ts`：Remotion 渲染任务。
- `server/course-workbench/render/capcutPackager.ts`：分层交付包。

### Frontend

- `src/features/remotion-course-workbench/api/workbenchClient.ts`：本地/Mock API 适配。
- `src/features/remotion-course-workbench/state/workbenchStore.tsx`：项目加载、保存和编辑命令。
- `src/features/remotion-course-workbench/CoursePreviewStage.tsx`：Remotion Player + editor overlay。
- `src/features/remotion-course-workbench/CourseTimelinePanel.tsx`：多轨时间轴。
- `src/features/remotion-course-workbench/ElementInspectorPanel.tsx`：元素、内置动画、动作实例。
- `src/features/remotion-course-workbench/CourseProjectIntake.tsx`：导入、迁移和上传。
- `src/features/remotion-course-workbench/CourseRenderPanel.tsx`：渲染任务和产物。

### HyperFrames Authoring Tool

- `tools/hyperframes-course-source/SKILL.md`
- `tools/hyperframes-course-source/schema/animation-manifest.schema.json`
- `tools/hyperframes-course-source/scripts/validate.mjs`
- `tools/hyperframes-course-source/scripts/migrate.mjs`
- `tools/hyperframes-course-source/examples/minimal-course/index.html`
- `tools/hyperframes-course-source/examples/minimal-course/animation-manifest.json`

---

### Task 1: Establish the Versioned Course Project Domain

**Files:**
- Create: `src/features/remotion-course-workbench/domain/courseProjectSchema.ts`
- Create: `src/features/remotion-course-workbench/domain/courseProjectMigration.ts`
- Create: `src/features/remotion-course-workbench/domain/courseProjectSchema.test.ts`
- Modify: `package.json`
- Modify: `tsconfig.node.json`

**Interfaces:**
- Produces: `CourseProjectV2`, `ActionTemplate`, `ActionInstance`, `LayoutVariant`, `parseCourseProject(value)`, `migrateLegacyWorkbenchState(value)`.
- Consumers: Tasks 2-9.

- [ ] **Step 1: Add schema dependencies and server TypeScript coverage**

Run:

```bash
npm install zod remotion @remotion/player @remotion/renderer
npm install --save-dev tsx
```

Update `tsconfig.node.json` so `include` contains `vite.config.ts`, `server/**/*.ts`, and `src/features/remotion-course-workbench/domain/**/*.ts`.

- [ ] **Step 2: Write failing schema tests**

```ts
it('keeps template defaults separate from instance overrides', () => {
  const project = parseCourseProject(validFixture)
  expect(project.actionTemplates[0]).not.toHaveProperty('layoutByAspect')
  expect(project.actionInstances[0].layoutByAspect['9:16']).toEqual({
    anchor: { kind: 'element', elementId: 'intro-title' },
    inset: { top: -12, right: -16, bottom: -12, left: -16 },
  })
})

it('rejects baked animations as exportable overlays', () => {
  expect(() => parseCourseProject(invalidBakedFixture)).toThrow(/baked-internal/)
})
```

- [ ] **Step 3: Verify the tests fail**

Run: `npm test -- courseProjectSchema.test.ts`

Expected: FAIL because `parseCourseProject` does not exist.

- [ ] **Step 4: Implement the minimum versioned schema**

Define discriminated export roles and aspect keys:

```ts
export const aspectRatioSchema = z.enum(['16:9', '4:3', '9:16'])
export const exportRoleSchema = z.enum([
  'baked-internal',
  'platform-overlay',
  'editor-only',
  'background-only',
])

export const actionInstanceSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  fromFrame: z.number().int().nonnegative(),
  durationFrames: z.number().int().positive(),
  exportRole: z.literal('platform-overlay'),
  params: z.record(z.string(), z.unknown()).default({}),
  layoutByAspect: z.object({
    '16:9': layoutOverrideSchema.optional(),
    '4:3': layoutOverrideSchema.optional(),
    '9:16': layoutOverrideSchema.optional(),
  }),
})
```

Add a `superRefine` rule that rejects `baked-internal` entries from `actionInstances`; baked animations live only in `source.bakedAnimations`.

- [ ] **Step 5: Add legacy migration tests and implementation**

Test that current `AnimationAction` values become templates and every timeline `actionRef` becomes a unique instance. Assert that moving one migrated instance does not mutate another instance or the template.

- [ ] **Step 6: Run domain verification**

Run:

```bash
npm test -- courseProjectSchema.test.ts
npm run build
```

Expected: schema tests PASS and TypeScript build PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.node.json src/features/remotion-course-workbench/domain
git commit -m "重构：建立课程制作项目数据模型"
```

### Task 2: Add the Local Workbench Service and Project Repository

**Files:**
- Create: `server/course-workbench/config.ts`
- Create: `server/course-workbench/projectRepository.ts`
- Create: `server/course-workbench/app.ts`
- Create: `server/course-workbench/start.ts`
- Create: `server/course-workbench/app.test.ts`
- Create: `scripts/run-course-workbench.mjs`
- Create: `src/features/remotion-course-workbench/api/workbenchClient.ts`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `CourseProjectV2`, `parseCourseProject` from Task 1.
- Produces: `createWorkbenchServer(config)`, REST routes `/api/health`, `/api/projects`, `/api/projects/:id`, and `WorkbenchClient`.

- [ ] **Step 1: Write failing repository tests**

```ts
it('writes project.json atomically and reloads it', async () => {
  const repo = createProjectRepository(tempRoot)
  await repo.save(validProject)
  expect(await repo.load(validProject.id)).toEqual(validProject)
  expect(existsSync(join(tempRoot, validProject.id, 'project.json.tmp'))).toBe(false)
})

it('rejects a project path outside configured roots', async () => {
  await expect(repo.importPath('/private/etc')).rejects.toMatchObject({
    code: 'SOURCE_NOT_ALLOWED',
  })
})
```

- [ ] **Step 2: Verify repository tests fail**

Run: `npm test -- server/course-workbench/app.test.ts`

Expected: FAIL because the server repository does not exist.

- [ ] **Step 3: Implement config and atomic repository**

Use `WORKBENCH_PROJECT_ROOT`, `WORKBENCH_ALLOWED_SOURCE_ROOTS`, `WORKBENCH_PORT`, and `WORKBENCH_AGENT_PROVIDER`. Resolve paths with `realpath`, require containment in an allowed root, write `<file>.tmp`, then rename atomically.

- [ ] **Step 4: Implement the minimal Node HTTP API**

Expose JSON-only project routes and structured errors:

```ts
export type WorkbenchErrorBody = {
  code: string
  stage: 'config' | 'import' | 'save' | 'agent' | 'render'
  message: string
  subject?: string
  recovery: string
}
```

Do not accept shell text or arbitrary output paths from the client.

- [ ] **Step 5: Add Vite proxy and one-command startup**

Add scripts:

```json
{
  "dev:web": "vite",
  "dev:workbench": "tsx watch server/course-workbench/start.ts",
  "dev:course": "node scripts/run-course-workbench.mjs"
}
```

Proxy `/api` to `http://127.0.0.1:4319`. The runner starts both child processes and terminates both on exit.

- [ ] **Step 6: Verify API and build**

Run:

```bash
npm test -- server/course-workbench/app.test.ts
npm run build
```

Expected: API tests PASS and frontend build PASS.

- [ ] **Step 7: Commit**

```bash
git add server scripts package.json package-lock.json vite.config.ts tsconfig.node.json .gitignore src/features/remotion-course-workbench/api
git commit -m "功能：增加课程制作台本地服务"
```

### Task 3: Define and Migrate the HyperFrames Source Contract

**Files:**
- Create: `tools/hyperframes-course-source/SKILL.md`
- Create: `tools/hyperframes-course-source/schema/animation-manifest.schema.json`
- Create: `tools/hyperframes-course-source/scripts/validate.mjs`
- Create: `tools/hyperframes-course-source/scripts/migrate.mjs`
- Create: `tools/hyperframes-course-source/examples/minimal-course/index.html`
- Create: `tools/hyperframes-course-source/examples/minimal-course/animation-manifest.json`
- Create: `server/course-workbench/hyperframes/contract.ts`
- Create: `server/course-workbench/hyperframes/migrator.ts`
- Create: `server/course-workbench/hyperframes/contract.test.ts`

**Interfaces:**
- Produces: `validateHyperframesContract(root)`, `planHyperframesMigration(root)`, `applyHyperframesMigration(plan)`.
- Consumers: Task 4 importer and Task 9 E2E.

- [ ] **Step 1: Write failing contract tests**

```ts
it('reports missing scene and element ids without modifying source', async () => {
  const report = await planHyperframesMigration(legacyFixture)
  expect(report.summary).toEqual({ recognized: 0, needsMetadata: 2, unresolved: 0 })
  expect(await readFile(legacyHtml, 'utf8')).not.toContain('data-hf-element-id')
})

it('creates a backup and a manifest whose target exists in HTML', async () => {
  const result = await applyHyperframesMigration(await planHyperframesMigration(legacyFixture))
  expect(result.backupPath).toMatch(/\.workbench-backup\//)
  expect(await validateHyperframesContract(legacyFixture)).toMatchObject({ valid: true })
})
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- contract.test.ts`

Expected: FAIL because contract functions do not exist.

- [ ] **Step 3: Implement the manifest schema**

Require `schemaVersion`, `fps`, `durationInFrames`, scenes, and animations:

```json
{
  "id": "intro-title-enter",
  "sceneId": "scene-intro",
  "targetElementId": "intro-title",
  "fromFrame": 0,
  "durationFrames": 24,
  "kind": "slide-in",
  "exportRole": "baked-internal",
  "properties": ["transform", "opacity"]
}
```

The validator must reject duplicate IDs, missing targets, negative frame ranges, and any HyperFrames animation declared as `platform-overlay`.

- [ ] **Step 4: Implement deterministic migration**

Generate IDs from scene order, semantic role, and a stable content hash. Produce a patch report before write. On apply, copy changed files into `.workbench-backup/<timestamp>/`, write HTML attributes and `animation-manifest.json`, then revalidate.

- [ ] **Step 5: Write the project-local generation skill**

The skill must instruct HyperFrames generation to emit responsive 9:16/16:9/4:3 layouts, stable scene/element IDs, a complete animation manifest, and to run:

```bash
node tools/hyperframes-course-source/scripts/validate.mjs <project-folder>
```

before declaring generation complete.

- [ ] **Step 6: Verify tool and fixtures**

Run:

```bash
node tools/hyperframes-course-source/scripts/validate.mjs tools/hyperframes-course-source/examples/minimal-course
npm test -- contract.test.ts
```

Expected: validator exits 0 and tests PASS.

- [ ] **Step 7: Commit**

```bash
git add tools/hyperframes-course-source server/course-workbench/hyperframes
git commit -m "功能：定义 HyperFrames 课程源识别规范"
```

### Task 4: Import Real HyperFrames Projects and Probe Media

**Files:**
- Create: `server/course-workbench/hyperframes/importer.ts`
- Create: `server/course-workbench/hyperframes/runtimeInspector.ts`
- Create: `server/course-workbench/mediaProbe.ts`
- Create: `server/course-workbench/hyperframes/importer.test.ts`
- Create: `src/features/remotion-course-workbench/CourseProjectIntake.tsx`
- Create: `src/features/remotion-course-workbench/CourseProjectIntake.test.tsx`
- Modify: `server/course-workbench/app.ts`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx`

**Interfaces:**
- Consumes: project schema, repository, contract validator/migrator.
- Produces: `importHyperframesProject(request)`, `probeMedia(path)`, POST `/api/imports/hyperframes`, POST `/api/projects/:id/foreground`.

- [ ] **Step 0: Add the runtime inspection dependency**

Run:

```bash
npm install --save-dev playwright
```

Use its bundled Chromium only inside the local importer and automated acceptance suite; do not expose a browser-control endpoint to the frontend.

- [ ] **Step 1: Write failing importer tests against a real fixture copy**

Assert that import returns scene map, element map, baked animation map, source dimensions, fingerprints, and a migration report. Assert that no baked animation is added to `actionInstances`.

- [ ] **Step 2: Verify importer tests fail**

Run: `npm test -- importer.test.ts`

Expected: FAIL because importer is missing.

- [ ] **Step 3: Implement FFprobe media metadata**

Run `ffprobe` with JSON output and map it to:

```ts
type MediaMetadata = {
  width: number
  height: number
  durationSeconds: number
  durationFrames: number
  fps: number
  hasAudio: boolean
  codec: string
}
```

Return `MEDIA_UNDECODABLE` with the source path and recovery instruction when probing fails.

- [ ] **Step 4: Implement runtime DOM inspection**

Open the project at each declared aspect viewport, seek sampled scene frames, and read only elements carrying `data-hf-element-id`. Save pixel rectangles, visibility ranges, role, selector and thumbnail reference. Validate each manifest target against the runtime DOM.

- [ ] **Step 5: Implement import and upload routes**

Import returns a migration report first. `applyMetadata=true` is required before source writeback. Foreground upload copies media into the course project, probes it and updates the source manifest; never store a browser-provided absolute path without server containment checks.

- [ ] **Step 6: Replace fake intake buttons**

Render explicit states: idle, scanning, migration-required, applying, ready, and error. The UI must show recognized/needs-metadata/unresolved counts and a single “补全项目元数据” action.

- [ ] **Step 7: Verify real fixture import**

Run the service and import a temporary copy of `/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial`. Expected: project persists, original fixture remains untouched, migrated copy validates, and media metadata reports 1080×1920, about 158 seconds, and its actual audio state.

- [ ] **Step 8: Commit**

```bash
git add server/course-workbench src/features/remotion-course-workbench/CourseProjectIntake* src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx
git commit -m "功能：支持真实 HyperFrames 项目导入"
```

### Task 5: Build the Shared Remotion Composition and Single Frame Clock

**Files:**
- Create: `src/features/remotion-course-workbench/remotion/CourseComposition.tsx`
- Create: `src/features/remotion-course-workbench/remotion/ActionOverlayLayer.tsx`
- Create: `src/features/remotion-course-workbench/remotion/ForegroundLayer.tsx`
- Create: `src/features/remotion-course-workbench/remotion/Root.tsx`
- Create: `src/features/remotion-course-workbench/remotion/CourseComposition.test.tsx`
- Modify: `src/features/remotion-course-workbench/CoursePreviewStage.tsx`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.css`

**Interfaces:**
- Consumes: `CourseProjectV2` and selectors.
- Produces: `CourseComposition({ project, aspectRatio })` and a Player-backed `CoursePreviewStage`.

- [ ] **Step 1: Write failing composition tests**

```ts
it('uses foreground audio and mutes background', () => {
  render(<CourseComposition project={fixture} aspectRatio="9:16" />)
  expect(screen.getByTestId('background-video')).toHaveAttribute('data-volume', '0')
  expect(screen.getByTestId('foreground-video')).toHaveAttribute('data-volume', '1')
})

it('hides a short foreground after its last frame', () => {
  setRemotionFrame(301)
  expect(screen.queryByTestId('foreground-window')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- CourseComposition.test.tsx`

Expected: FAIL because Composition is missing.

- [ ] **Step 3: Implement the minimum Composition**

Use `useCurrentFrame()`, `OffthreadVideo` or the supported Remotion video component, and `Sequence`. Background volume is zero. Foreground volume is one and duration is `min(foreground.durationFrames, project.durationFrames)`.

- [ ] **Step 4: Implement ActionOverlayLayer**

Render only active `platform-overlay` instances. Resolve template defaults, instance params, and current aspect layout in that order. Do not render baked animations or editor controls.

- [ ] **Step 5: Replace dual HTML video playback with Remotion Player**

`CoursePreviewStage` reads current frame from Player callbacks. Its selection boxes and handles are sibling editor overlays positioned by the same geometry transform, not children of `CourseComposition`.

- [ ] **Step 6: Render a still using the CLI**

Run:

```bash
npx remotion still src/features/remotion-course-workbench/remotion/Root.tsx CourseWorkbench /tmp/course-workbench-frame.png --frame=30
```

Expected: nonblank PNG with background, foreground and active platform overlay; no handles.

- [ ] **Step 7: Commit**

```bash
git add src/features/remotion-course-workbench/remotion src/features/remotion-course-workbench/CoursePreviewStage.tsx src/features/remotion-course-workbench/RemotionCourseWorkbench.css
git commit -m "重构：统一课程视频预览与渲染内核"
```

### Task 6: Implement Element-Anchored Layout Variants and the Multi-Track Editor

**Files:**
- Create: `src/features/remotion-course-workbench/domain/geometry.ts`
- Create: `src/features/remotion-course-workbench/domain/geometry.test.ts`
- Create: `src/features/remotion-course-workbench/ElementInspectorPanel.tsx`
- Create: `src/features/remotion-course-workbench/ElementInspectorPanel.test.tsx`
- Modify: `src/features/remotion-course-workbench/CourseTimelinePanel.tsx`
- Modify: `src/features/remotion-course-workbench/CoursePreviewStage.tsx`
- Create: `src/features/remotion-course-workbench/state/workbenchStore.tsx`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.css`

**Interfaces:**
- Produces: `resolveElementRect`, `resolveAnchoredOverlayRect`, `deriveLayoutVariant`, editor commands `moveActionInstance`, `resizeActionInstance`, `updateActionTiming`.

- [ ] **Step 1: Write failing geometry tests**

```ts
it('recomputes an element-bound circle from the 16:9 element measurement', () => {
  expect(resolveAnchoredOverlayRect(instance, project, '16:9')).toEqual({
    x: 224,
    y: 96,
    width: 752,
    height: 164,
  })
})

it('does not change 9:16 layout when editing 16:9', () => {
  const next = moveActionInstance(project, instance.id, '16:9', { x: 12, y: 8 })
  expect(next.actionInstances[0].layoutByAspect['9:16']).toEqual(
    project.actionInstances[0].layoutByAspect['9:16'],
  )
})
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- geometry.test.ts`

- [ ] **Step 3: Implement source-pixel geometry**

Use an explicit transform:

```ts
type ViewportTransform = {
  scale: number
  offsetX: number
  offsetY: number
  sourceWidth: number
  sourceHeight: number
}
```

For bound actions, apply inset/offset to the target element rectangle measured for the active aspect. For free actions, map from the output safe area. Never infer a `cover` crop unless stored in the layout variant.

- [ ] **Step 4: Build the Element Inspector**

Show two separate lists: read-only baked animations and editable platform action instances. Binding creates an instance at the playhead. Parameter fields update the instance. “发布到动作库” is absent here because instance editing is not template publishing.

- [ ] **Step 5: Rebuild the timeline as tracks**

Render scene, background, foreground/audio, baked animation and platform overlay tracks. Dragging an overlay updates `fromFrame`/`durationFrames`; clicking a baked animation selects metadata but exposes no delete or export controls.

- [ ] **Step 6: Add independent aspect persistence**

Switching aspect creates a derived layout only when missing, persists it through the repository, and reloads the exact same layout after refresh.

- [ ] **Step 7: Browser verification**

At 9:16, bind a red rounded circle to the title. Switch to 16:9 and 4:3. Expected: circle follows the measured title in each aspect, manual changes remain isolated, and returning to 9:16 restores its original layout.

- [ ] **Step 8: Commit**

```bash
git add src/features/remotion-course-workbench
git commit -m "功能：实现元素锚定动作和多比例时间轴"
```

### Task 7: Add the Codex CLI Agent Gateway and Draft Publishing

**Files:**
- Create: `server/course-workbench/agent/AgentProvider.ts`
- Create: `server/course-workbench/agent/CodexCliProvider.ts`
- Create: `server/course-workbench/agent/MockAgentProvider.ts`
- Create: `server/course-workbench/agent/agentGateway.ts`
- Create: `server/course-workbench/agent/agentGateway.test.ts`
- Modify: `server/course-workbench/app.ts`
- Modify: `src/features/remotion-course-workbench/CodexHandoffPanel.tsx`
- Modify: `src/features/remotion-course-workbench/CourseActionLibraryStudio.tsx`

**Interfaces:**
- Produces: `AgentProvider.submit(task)`, task routes, draft patch review and publish flow.

- [ ] **Step 1: Write failing provider contract tests**

```ts
it('allows parameter tasks to return only a typed patch', async () => {
  const result = await gateway.run(parameterTask)
  expect(result.kind).toBe('action-instance-patch')
  expect(result).not.toHaveProperty('files')
})

it('rejects a draft file outside the project draft directory', async () => {
  await expect(gateway.run(maliciousTask)).rejects.toMatchObject({
    code: 'AGENT_OUTPUT_OUTSIDE_DRAFTS',
  })
})
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- agentGateway.test.ts`

- [ ] **Step 3: Define structured task schemas**

Support `suggest-instance-patch`, `create-action-draft`, `revise-action-draft`, and `analyze-element-binding`. Each task carries project ID, bounded context and expected output schema; no raw shell field exists.

- [ ] **Step 4: Implement CodexCliProvider**

Spawn `codex exec --json --output-schema <generated-schema> -C <project-root>`. Do not pass a model unless `WORKBENCH_CODEX_MODEL` is configured. Use workspace-write permissions limited to the project and drafts directory. Capture JSONL progress and a structured final result.

- [ ] **Step 5: Implement draft validation and publish**

Run typecheck, unit tests, Remotion still and transparent-overlay validation. Publish copies a validated draft into the shared action library with a new semantic version; failed drafts remain local and expose the exact failed check.

- [ ] **Step 6: Replace handoff JSON dump with task UI**

Show queued/running/review/failed/completed states, patch diff, preview action and explicit Apply/Reject/Publish controls. Public mode uses `MockAgentProvider` and labels the result as sample data.

- [ ] **Step 7: Verify with a harmless Codex task**

Ask Codex to change only the selected circle instance fade-in from 8 to 12 frames. Expected: patch appears for review, project remains unchanged before Apply, and no core source file is touched.

- [ ] **Step 8: Commit**

```bash
git add server/course-workbench/agent server/course-workbench/app.ts src/features/remotion-course-workbench
git commit -m "功能：接入 Codex CLI 动作任务网关"
```

### Task 8: Render Master Video and Materialize the CapCut Package

**Files:**
- Create: `server/course-workbench/render/renderService.ts`
- Create: `server/course-workbench/render/capcutPackager.ts`
- Create: `server/course-workbench/render/outputVerifier.ts`
- Create: `server/course-workbench/render/renderService.test.ts`
- Create: `src/features/remotion-course-workbench/CourseRenderPanel.tsx`
- Create: `src/features/remotion-course-workbench/CourseRenderPanel.test.tsx`
- Modify: `server/course-workbench/app.ts`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx`

**Interfaces:**
- Produces: render job routes, `renderMaster(project, aspect)`, `packageCapCutHandoff(project, aspect)`, `verifyOutput(path, expectation)`.

- [ ] **Step 1: Write failing render-plan tests**

Assert that only `platform-overlay` instances create overlay jobs, baked animations remain in `background-clean.mp4`, and editor-only elements are absent from the Remotion input props.

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- renderService.test.ts`

- [ ] **Step 3: Implement queued Remotion rendering**

Bundle `Root.tsx` once per source revision, render `CourseWorkbench` with project input props, stream progress, and write to a temporary file before atomic rename.

- [ ] **Step 4: Implement real CapCut handoff materialization**

Create actual files rather than names: Master preview, background clean, foreground speaker, transparent WebM overlays, SRT, timeline CSV, manifest and edit guide. Overlay filenames include action instance IDs, not only template IDs.

- [ ] **Step 5: Implement output verification**

Use FFprobe to assert width, height, duration tolerance, fps and exactly one intended audio stream in Master. Render three circle frames: before, emphasis, after. Confirm overlay absent/present/absent and compare its target rectangle with Player geometry within two output pixels.

- [ ] **Step 6: Build render task UI**

Replace JSON `<pre>` output with target selector, progress, cancel, verified/failed status and concrete output links. Show file size, dimensions, duration and audio source.

- [ ] **Step 7: Commit**

```bash
git add server/course-workbench/render server/course-workbench/app.ts src/features/remotion-course-workbench/CourseRenderPanel* src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx
git commit -m "功能：实现课程视频和剪映交付包导出"
```

### Task 9: Complete Real Browser, Render, and Public Mock Acceptance

**Files:**
- Create: `tests/course-workbench/production-flow.test.ts`
- Create: `tests/fixtures/course-workbench/create-fixture.mjs`
- Create: `scripts/verify-course-workbench-output.mjs`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.test.tsx`
- Modify: `src/cloudflare-pages.test.ts`
- Modify: `README.md`
- Modify: `docs/topics/remotion-course/index.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: reproducible acceptance suite and operator documentation.

- [ ] **Step 1: Create an isolated real-project fixture**

Copy the real `codex-keyframes-tutorial` folder into a temporary test root. Generate two foreground media fixtures: one shorter and one longer than the background, each with an identifiable audio tone. Never mutate the original source during tests.

- [ ] **Step 2: Write the failing production flow**

The test must perform: import → migration report → apply metadata → upload foreground → select title → bind red circle → set rounded corners and timing → save → reload → create 16:9 and 4:3 variants → render Master → render CapCut package.

- [ ] **Step 3: Verify the flow fails before final wiring**

Run: `npm test -- production-flow.test.ts`

Expected: FAIL at the first missing integration boundary, not because fixture setup is broken.

- [ ] **Step 4: Complete missing wiring without adding new product scope**

Only fix integration defects exposed by the flow. Do not add unrelated actions, cloud APIs, native CapCut draft generation or desktop packaging.

- [ ] **Step 5: Run full automated verification**

```bash
npm run lint
npm test
npm run build
node scripts/verify-course-workbench-output.mjs <rendered-project-folder>
```

Expected: lint clean, all tests pass, Cloudflare build passes, output verifier reports correct dimensions/duration/audio and overlay frame phases.

- [ ] **Step 6: Run visible real-browser acceptance**

Use Chrome or the in-app browser against the real local service. Verify playback advances smoothly, audio comes from the foreground, later-scene elements can be selected, timeline follows the playhead, action controls never appear in rendered frames, and project state survives reload.

- [ ] **Step 7: Update documentation**

README must include:

```bash
npm run dev:course
```

and document environment variables, HyperFrames preparation, migration confirmation, foreground audio rules, action draft publishing, Master export, CapCut package use, public Mock limitations and troubleshooting commands.

- [ ] **Step 8: Final commit**

```bash
git add tests scripts README.md docs/topics/remotion-course src/cloudflare-pages.test.ts src/features/remotion-course-workbench/RemotionCourseWorkbench.test.tsx
git commit -m "测试：完成课程制作台真实生产链路验收"
```

---

## Final Release Gate

Do not push or declare completion until all conditions are true:

- The real HyperFrames fixture identifies every declared scene, element and baked animation.
- The title circle is element-anchored and correct in 9:16, 16:9 and 4:3.
- Foreground audio is the only final master audio and obeys hide/truncate rules.
- Preview and rendered keyframes agree within two output pixels.
- Baked animations are never emitted as platform overlays.
- Editor boxes and handles are absent from stills, Master and transparent overlays.
- A saved project reloads without losing bindings, timing or layout variants.
- Codex patch tasks do not modify state before approval and cannot write outside drafts.
- Master and every CapCut package file physically exist and pass FFprobe checks.
- Cloudflare static build renders Mock mode without contacting `127.0.0.1`.
