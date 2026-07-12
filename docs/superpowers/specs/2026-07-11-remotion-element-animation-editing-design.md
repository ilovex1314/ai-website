# Remotion 元素动画编辑与 9:16 工作台设计

## 目标

修复课程制作台的动画时间语义，让 HyperFrames 内置动画和平台新增动画都能围绕同一个 DOM 元素被看见、编辑和恢复；允许同一元素在不同时间绑定多个动画；为 9:16 视频提供经过确认的 A 型专属布局。

本轮不实现页面切换动画编辑。

## 一、统一时间模型

### 对外语义

Inspector、播放头、时间尺和动画卡片统一显示**全局绝对帧**。

动画区间采用左闭右开：

```text
[fromFrame, fromFrame + durationFrames)
```

例如 `228f - 508f · 280f` 表示动画在 `228f` 生效，在 `508f` 前结束，`508f` 起不再渲染。

### 内部兼容

现有 `TimelineSegment.actionRefs[].from` 继续保存章节相对帧，以保持旧数据兼容。所有读写必须经过统一 helper：

```ts
absoluteFrom = segment.from + ref.from
relativeFrom = absoluteFrom - segment.from
```

UI 不再直接读取或写入 `ref.from`。

### 淡入淡出

平台动画透明度由 Remotion 当前帧确定，不使用 CSS wall-clock animation：

```text
fadeIn  = clamp(localFrame / fadeInFrames, 0, 1)
fadeOut = clamp((durationFrames - localFrame) / fadeOutFrames, 0, 1)
opacity = min(fadeIn, fadeOut)
```

`fadeInFrames` 或 `fadeOutFrames` 为 0 时，对应系数为 1。预览、编辑选择框和导出使用同一个计算函数。

## 二、元素动画模型

右侧面板名称改为“元素动画”，分为两组。

### HyperFrames 内置动画

初始化时，从 `animation-manifest.json` 或运行时 GSAP timeline 读取动画，并按 `elementId` 绑定到元素。卡片展示：

- 动画类型和属性通道。
- 全局开始帧、结束帧和时长。
- 来源：HyperFrames。
- 当前状态：原始、已修改、已停用。
- 原始值和当前值差异。

内置动画可以：

- 修改起点、时长和缓动。
- 停用。
- 恢复原始动画。

停用不物理删除卡片和原始记录，而是写入 override。恢复时删除 override。

### 停用兜底

| 类型 | 停用后的行为 |
| --- | --- |
| 进入动画 | 在原开始帧直接显示动画最终状态 |
| 退出动画 | 保持基础可见状态，直到元素生命周期结束 |
| 移动、缩放、旋转 | 保持元素基础 CSS 状态 |
| 强调、扫光、循环 | 不播放效果，元素正常显示 |

修改和停用必须作用于 HyperFrames 项目副本并重新生成后台预览。原项目文件不直接改写。

### 平台新增动画

平台动画继续保存为 `actionRef` / `actionInstance`，由 Remotion 作为 overlay 渲染。一个元素可以拥有多个平台动画实例，每张卡片可独立选择、编辑、重播和移除。

点击“新增动画”进入空白绑定状态；点击已有卡片进入该实例编辑状态。新增绑定不能覆盖已有实例。

## 三、动画冲突

冲突判断维度为：

```text
同一 elementId + 时间区间重叠 + 相同独占通道
```

独占通道包括：

- `translate`
- `scale`
- `rotate`

同一时间的两个 `translate` 动画必须被阻止。顺序执行允许。圈注、高亮、箭头和文字卡等 overlay 不属于独占变换通道，可以与其他动画并存。

绑定或修改产生冲突时：

- 不写入错误配置。
- 在元素动画面板显示冲突对象、帧区间和通道。
- 时间尺把冲突区间标红。

## 四、HyperFrames 动画识别

优先级：

1. `animation-manifest.json` 中明确声明的动画。
2. `window.__timelines` 中 GSAP tween 的运行时信息。
3. 无法映射时才生成 `unresolved` 诊断，不再用“元素完整生命周期”伪装成真实进入动画。

运行时识别读取 tween 的 target、start time、duration、repeat、ease 和 vars，并通过 target 的 `data-hf-element-id` 建立归属。页面切换和没有元素归属的全局背景动画不进入元素动画面板。

## 五、非破坏性 Override

工作台保存：

```text
.course-workbench/projects/<project-id>/hyperframes/animation-overrides.json
```

每条 override 包含：

```ts
type HyperframesAnimationOverride = {
  animationId: string
  operation: 'modify' | 'disable'
  fromFrame?: number
  durationFrames?: number
  ease?: string
  fallback?: 'show-final-state-at-start' | 'keep-base-state'
}
```

预览重建流程：

1. 复制上游 HyperFrames 项目到工作台临时目录。
2. 注入 override runtime，不修改上游文件。
3. 对停用的进入动画应用最终状态兜底。
4. 使用 HyperFrames draft render 生成新的后台预览。
5. 更新工作台后台媒体地址。

## 六、9:16 A 型布局

16:9 和 4:3 保持当前工作台布局。

9:16 时仅重排 Review 内部：

- Review 左侧：画布比例、播放/暂停、重播、播放头、当前章节、当前动作和选中元素说明。
- Review 右侧：放大的 9:16 画布，高度优先，目标高度约 `min(76vh, 860px)`。
- 时间尺：横跨 Review 底部。
- 外层素材栏和右侧 Inspector 保持原位置。
- 动作库继续位于 Review 下方。

该方案不折叠素材栏，不引入额外模式切换。

## 七、验收标准

1. `228f - 508f` 的平台动画仅在 `[228, 508)` 内出现。
2. 100 帧淡入和 50 帧淡出在预览与导出中按帧生效。
3. 选择元素后能看到真实 HyperFrames 进入、移动、缩放等动画，不显示伪造生命周期动画。
4. HyperFrames 动画可修改、停用和恢复；停用后卡片仍保留。
5. 停用进入动画后，元素在原动画开始帧直接显示最终状态。
6. 同一元素可在 `100f-300f` 绑定圈注，在 `350f-500f` 绑定聚焦。
7. 同元素同时间的两个 `translate` 动画被阻止并解释原因。
8. 9:16 Review 使用 A 型布局，画布明显增大且第一屏可操作。
9. HyperFrames 内置动画不会作为平台 overlay 重复导出。
