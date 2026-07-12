# Action Library Live Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在动作库子页面右侧增加只展示单个元素的实时动作 Demo。

**Architecture:** `CourseActionLibraryStudio` 管理选中动作；新组件 `CourseActionLiveDemo` 负责有限时长播放状态和单元素渲染。动作视觉复用现有 `preview-action` 分类样式，不引入第二套动作实现。

**Tech Stack:** React 19、TypeScript、CSS、Vitest、Testing Library。

## Global Constraints

- Demo 只展示一个元素，不展示整张 PPT 或全局合成。
- 切换动作自动重播，同时提供播放、暂停和重播。
- 尊重 `prefers-reduced-motion`，保持现有工具型视觉语言。

---

### Task 1: 单元素 Demo 组件

**Files:**
- Create: `src/features/remotion-course-workbench/CourseActionLiveDemo.tsx`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.css`
- Test: `src/features/remotion-course-workbench/CourseActionLibraryStudio.test.tsx`

**Interfaces:**
- Consumes: `AnimationAction` 与 `actionCategoryLabels`。
- Produces: `CourseActionLiveDemo({ action }: { action: AnimationAction })`。

- [ ] 写失败测试：默认动作名称、单元素舞台、暂停与重播控件可见。
- [ ] 运行 `npm test -- --run src/features/remotion-course-workbench/CourseActionLibraryStudio.test.tsx`，确认测试先失败。
- [ ] 实现有限时长播放状态、单元素载体和分类动作内容。
- [ ] 增加稳定尺寸、清晰选中态及 reduced-motion CSS。
- [ ] 重跑测试，确认通过。

### Task 2: 动作列表选择联动

**Files:**
- Modify: `src/features/remotion-course-workbench/CourseActionLibraryStudio.tsx`
- Test: `src/features/remotion-course-workbench/CourseActionLibraryStudio.test.tsx`

**Interfaces:**
- Consumes: `CourseActionLiveDemo`。
- Produces: 可点击动作资产行与右侧实时 Demo。

- [ ] 写失败测试：点击“红色圈注”后右侧标题、类别和 Demo class 同步更新。
- [ ] 把动作行改为语义化按钮，使用 `aria-pressed` 表达选中态。
- [ ] 将原“复杂动画意图”信息压缩到 Demo 元数据区，不再占据右侧主视图。
- [ ] 重跑定向测试与 `npm run build`。

### Task 3: 浏览器验收

**Files:**
- Modify: `README.md`（仅在功能说明需要同步时）

**Interfaces:**
- Consumes: `/topics/remotion-course/actions`。
- Produces: 可供用户直接 review 的本地页面。

- [ ] 在浏览器依次选择高亮框、圈注、箭头、进度和代码动作。
- [ ] 验证切换自动重播、暂停冻结、重播恢复。
- [ ] 运行全量测试、生产构建与 `git diff --check`。
