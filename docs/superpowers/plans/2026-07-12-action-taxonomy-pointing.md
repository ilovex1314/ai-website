# Action Taxonomy And Pointing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将动作库拆分为“添加动画”和“添加元素 + 动画”，并新增可锚定 PPT DOM 的“指向”箭头资产。

**Architecture:** `AnimationAction.assetKind` 表达用户可见资产类型，`implementation.mode` 仅保留为内部实现信息。`PointingArrowVisual` 同时服务动作库 Demo、主工作台预览和 Remotion 导出；自定义图片通过归一化双锚点映射到目标向量。

**Tech Stack:** React、TypeScript、SVG、Remotion、Vitest、Testing Library。

## Global Constraints

- 实现 mode 不在动作库主列表展示。
- 内置箭头支持 straight、curve、elbow。
- 自定义素材只接受 PNG、WebP、SVG，并清理危险 SVG 内容。
- 尖端锚定目标 DOM，尾部和尺度可通过画布编辑。

---

### Task 1: 动作资产分类

**Files:**
- Modify: `src/features/remotion-course-workbench/workbenchTypes.ts`
- Modify: `src/features/remotion-course-workbench/animationLibraryModel.ts`
- Modify: `src/features/remotion-course-workbench/CourseActionLibraryStudio.tsx`
- Modify: `src/features/remotion-course-workbench/CourseActionLiveDemo.tsx`
- Test: `src/features/remotion-course-workbench/CourseActionLibraryStudio.test.tsx`

- [x] 写失败测试，断言资产类型筛选与列表列位。
- [x] 增加 `ActionAssetKind` 和所有内置动作分类。
- [x] 用资产类型替换 mode 列，并实现筛选。
- [x] 运行定向测试。

### Task 2: 指向箭头共享组件

**Files:**
- Create: `src/features/remotion-course-workbench/PointingArrowVisual.tsx`
- Modify: `src/features/remotion-course-workbench/remotion/ActionOverlayLayer.tsx`
- Modify: `src/features/remotion-course-workbench/CourseActionLiveDemo.tsx`
- Test: `src/features/remotion-course-workbench/remotion/CourseComposition.test.tsx`

- [x] 写失败测试覆盖 straight、curve、elbow 和 DOM 锚定。
- [x] 实现 SVG 箭头路径与最近边缘布局。
- [x] 在 Demo 与导出层复用组件。
- [x] 运行定向测试。

### Task 3: 自定义图片与双锚点

**Files:**
- Create: `src/features/remotion-course-workbench/arrowAssetModel.ts`
- Create: `src/features/remotion-course-workbench/PointingArrowEditor.tsx`
- Modify: `src/features/remotion-course-workbench/CourseActionEditor.tsx`
- Test: `src/features/remotion-course-workbench/arrowAssetModel.test.ts`

- [x] 写失败测试覆盖文件类型、SVG 清理和双锚点映射。
- [x] 实现安全文件读取与归一化锚点数据。
- [x] 实现上传、尾部/尖端点击校准和形状选择。
- [x] 运行定向测试。

### Task 4: 主画布交互与验收

**Files:**
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.tsx`
- Modify: `src/features/remotion-course-workbench/CoursePreviewStage.tsx`
- Modify: `src/features/remotion-course-workbench/RemotionCourseWorkbench.css`
- Test: `src/features/remotion-course-workbench/RemotionCourseWorkbench.test.tsx`

- [x] 写失败测试：绑定“指向”后时间与目标 DOM 正确。
- [x] 接入形状、颜色、持续和淡入淡出参数。
- [x] 验证拖拽更新尾部，缩放更新箭头长度。
- [x] 浏览器验证动作库筛选、形状切换、DOM 绑定与画布渲染；比例适配复用目标元素的 `rectsByAspect`。
- [x] 运行全量测试、构建和 `git diff --check`。
