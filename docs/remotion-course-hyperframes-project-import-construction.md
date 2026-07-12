# Remotion 课程制作台：HyperFrames 项目文件夹导入施工说明

## 目标

本轮把第 9 个 topic 从“动作库管理台”推进为“课程口播视频组装台”的第一版工作流。这个 topic 的职责是做好组装平台和教学动画库：导入后台区 HyperFrames 项目文件夹、导入前台区口播视频、识别后台元素、管理动作库、把动作绑定到元素和时间点，并提供 Review 与导出交付入口。

上游的 topic 总结、HyperFrames PPT 分享视频生成、口播文案生成和用户录制，只是这个平台的输入上下文，不属于当前平台要承包的生产系统。

平台内用户链路：

1. 用户在本平台导入 HyperFrames 项目文件夹，作为后台区素材源。
2. 用户上传口播视频，作为前台区素材源和最终音频来源。
3. 平台初始化后台区、前台区、scene、元素、已有动画和动作库补全结果。
4. 用户在 Review 区选择后台元素，绑定或调整教学动作。
5. 用户调整前台口播窗口的大小、位置和形状。
6. 平台保存当前组装状态，并输出成片预期或剪映 / CapCut 二次编辑交付包。

## 产品边界

当前平台要做：

- 组装后台区 HyperFrames 项目和前台区口播视频。
- 管理教学动画动作库。
- 识别或模拟 HyperFrames scene、element、animation 结构。
- 在 Review 里播放、暂停、seek、选元素、绑定动作。
- 维护当前组装 timeline。
- 为本地 Codex 后续修改动作 / timeline 预留 handoff payload。
- 为后续合成成片和剪映 / CapCut 交付包预留结构。

当前平台不做：

- 不负责完成开发 / 学习 topic 的总结。
- 不负责调用 HyperFrames 生成 PPT 分享项目。
- 不负责自动生成口播文案。
- 不负责替代剪映 / CapCut 做完整专业剪辑。
- 不做泛用视频编辑器，不追求 trim / split / ripple delete 等完整 NLE 能力。

## 固定输入形态

后台区输入固定为 HyperFrames 项目文件夹，而不是单个视频文件。

示例：

```text
videos/topic-share/
  index.html
  DESIGN.md
  assets/
  compositions/
  renders/
  hyperframes.json
  package.json
```

第一版允许 mock 一个 HyperFrames 项目文件夹记录，但 UI 和数据模型必须表达“项目文件夹”语义：

- `sourceKind: "hyperframes-project"`
- `projectPath`
- `entryHtml`
- `designFile`
- `assetsDir`
- `renderedPreview`
- `structureStatus`

扁平 mp4 只作为 rendered preview 或兜底预览，不作为主要结构化输入。

## 给 HyperFrames 的交付契约

后续当 agent 调用 HyperFrames 生成 PPT 分享视频时，提示词里必须明确要求输出一个完整项目文件夹。平台依赖这个文件夹做初始化，而不是反向解析视频。

最低交付要求：

- `index.html`：主 composition，包含 `data-composition-id`、`data-start`、`data-duration`、`data-track-index`。
- `DESIGN.md`：视觉风格、字体、颜色、动效规则，供平台展示项目语义。
- `assets/`：图片、视频、音频、截图等素材。
- `compositions/`：拆分出的 scene / sub-composition。
- `renders/`：可选预览文件，例如 `preview.mp4` 或 still frame。
- `hyperframes.json` 或同等 manifest：如果 HyperFrames 侧可以生成，优先写入 scene、duration、element、animation 摘要。

推荐额外约束：

- 重要元素必须有稳定 id 或 class，例如 `#scene-03-code-block`、`.metric-card-primary`。
- 重要文字和图形元素写入 `data-role`，例如 `data-role="code"`、`data-role="flow-node"`、`data-role="headline"`。
- 每个 scene 的关键元素需要可被 selector 定位，避免只靠截图识别。
- 若存在动画，保留 GSAP selector、start、duration 和 animated properties 的可读信息。
- 如果已经渲染 preview mp4，必须同时保留 HTML 源工程；preview 不能替代源工程。

## 口播文案契约

同一次上游 topic 复盘生成时，agent 可能会给用户一份口播文案。平台不负责生成口播文案，也不自动生成口播音频；第一版只需要能在 mock 数据中表达“口播文案可作为参考资料导入或关联”，便于用户理解前台视频和后台画面的语义关系。

口播文案建议结构：

```text
title: 课程口播视频动画库开发复盘
targetDurationSec: 180
sections:
  - startSec: 0
    endSec: 35
    slideHint: 开场与问题定义
    script: ...
  - startSec: 35
    endSec: 90
    slideHint: 平台架构
    script: ...
```

验收点：

- 文案总时长应接近 HyperFrames 项目总时长。
- 每段文案要能映射到 scene 或 slide hint。
- 用户录制后上传的前台视频可以以这份文案为语义参考，但最终音频仍以用户上传视频为准。

## 为什么不优先解析 mp4

mp4 已经丢失 DOM、scene、track、GSAP tween、元素 id 和语义。若从 mp4 识别元素，只能依赖 OCR / CV / 手动框选，准确率和可维护性都差。HyperFrames 的 HTML 和 `data-*` 才是可信源：

- `data-composition-id`
- `data-start`
- `data-duration`
- `data-track-index`
- `data-width` / `data-height`
- DOM id / class / text
- `window.__timelines`
- GSAP tween selector 与动画属性

因此初始化流程应优先解析 HyperFrames 项目文件夹。

## 初始化产物

导入 HyperFrames 项目文件夹后，平台应生成以下结构：

```ts
type HyperframesProjectSource = {
  id: string
  sourceKind: 'hyperframes-project'
  projectPath: string
  entryHtml: string
  designFile?: string
  renderedPreview?: string
  status: 'mock' | 'parsed' | 'missing'
}

type StageElement = {
  id: string
  source: 'hyperframes'
  compositionId: string
  selector: string
  kind: 'title' | 'paragraph' | 'code' | 'chart' | 'image' | 'flow-node' | 'caption' | 'unknown'
  label: string
  frameRange: [number, number]
  box: { x: number; y: number; width: number; height: number }
}

type DetectedHyperframesAnimation = {
  id: string
  compositionId: string
  selector: string
  actionSignature: string
  label: string
  from: number
  duration: number
  properties: string[]
  suggestedActionId: string
}
```

同时写入：

- 后台区 source
- scene / segment 列表
- element map
- detected animations
- action refs
- missing action drafts

## 动作库补全策略

HyperFrames 项目自带动画。初始化时不能把它们当成普通背景忽略，而要把已有动画识别并映射到动作库。

映射规则：

| HyperFrames 动画特征 | 动作库策略 |
|---|---|
| `opacity + y/x` entrance | 映射到 `text-reveal` / `slide-push-in` |
| marker sweep / highlight bg | 映射到 `highlight-box` 或新增 `marker-sweep` |
| circle / scribble / burst | 映射到圈注或新增 `scribble-callout` |
| scene wipe / reveal / crossfade | 映射到 `chapter-transition` 或新增 transition action |
| code line / diff emphasis | 映射到 `code-line-highlight` |
| 无法明确分类但有 selector 和 tween | 新增 `custom-component` action |

如果动作库没有对应动作，初始化时自动补充 draft：

```ts
type AnimationImplementationMode = 'parametric' | 'llm-assisted' | 'custom-component'
```

- 能从 HyperFrames selector 和 tween 明确复用的，建为 `custom-component`。
- 需要 Codex 理解意图、补 schema 或组件契约的，建为 `llm-assisted`。
- 稳定简单标注继续用 `parametric`。

## 前台区口播规则

前台区由用户上传口播视频：

- 前台区视频默认从 0 帧与后台区对齐。
- 最终音频使用前台区口播音频。
- 后台区 HyperFrames rendered preview 如果有音频，默认静音。
- 总时长使用后台区时长。
- 前台区短于后台区：结束后隐藏前台窗口。
- 前台区长于后台区：超出后台区总时长部分截断。

前台窗口参数：

```ts
type ForegroundWindow = {
  x: number
  y: number
  width: number
  height: number
  shape: 'rounded' | 'circle' | 'portrait' | 'rect'
  opacity: number
}
```

## UI 改造范围

### 1. Asset 区

从大文件列表改成紧凑的 Media Intake：

- 后台区：导入 HyperFrames 项目文件夹
- 前台区：上传口播视频
- 显示结构化能力状态：
  - scenes parsed
  - elements parsed
  - animations detected
  - missing actions created

公网环境用 mock 数据，不调用本地文件系统。

### 2. 画布比例

头部或 Review toolbar 增加可操作控件：

- `16:9`
- `4:3`
- `9:16`

切换后 Review canvas 使用对应 aspect-ratio。

### 3. Review 播放器

Review 区必须支持：

- 播放
- 暂停
- seek
- 当前帧 / 总帧
- 当前章节显示
- 当前 active action 显示

左侧 Timeline 只做章节定位。动作片段在 Review 下方时间尺显示。

### 4. 元素选择

Review 后台区展示 HyperFrames 识别出来的元素框。用户点击元素后：

- 元素高亮
- Inspector 显示元素信息
- 可点击“绑定动作到元素”

第一版可用 mock element map，但数据结构必须像真实 HyperFrames 解析结果。

### 5. 动作时间尺

Review 下方增加 action time ruler：

- 显示 segment range
- 显示 action ref range
- 显示播放头
- action ref 标签包含 `actionId` 和目标元素名

### 6. 动作库右侧预览

动作库子页面右侧继续保留动作 preview / contract 区。新增动作由 HyperFrames 初始化补入时，必须能在列表中看到：

- action 名称
- implementation mode
- source: hyperframes
- selector / action signature

## TDD 验收测试建议

Volta 实现时先补失败测试。

### Reducer / model 测试

文件：

- `src/features/remotion-course-workbench/courseWorkbenchReducer.test.ts`

新增断言：

- 默认 state 有 `stage.backgroundSource.sourceKind === "hyperframes-project"`。
- 默认后台 source name/path 包含 HyperFrames 项目文件夹语义，不是单个 mp4。
- 前台 source 音频策略为 `primary`。
- 后台 source 音频策略为 `muted`。
- `set-aspect-ratio` 能切到 `4:3` 和 `9:16`。
- `seek-frame` 能更新 currentFrame，并同步 selectedSegment。
- `select-stage-element` 能选中 HyperFrames 元素。
- `bind-selected-action-to-element` 能写入 action ref，包含 `elementId`、`from`、`duration`。
- 初始化时存在至少一个 `detectedHyperframesAnimation`。
- 如果 detected animation 对应动作库没有动作，state 中补出 draft action。

### Component 测试

文件：

- `src/features/remotion-course-workbench/RemotionCourseWorkbench.test.tsx`

新增断言：

- 页面出现 `Media Intake`、`后台区`、`前台区`。
- 后台区显示 `HyperFrames Project`。
- 有 `导入 HyperFrames 文件夹` 入口。
- 前台区显示 `上传口播视频` 入口。
- `画布比例` select 可切换，并改变 `preview-canvas[data-aspect-ratio]`。
- Review 有播放/暂停按钮和播放头 slider。
- 点击 `代码示例区域` 后显示 `已选元素：代码示例区域`。
- 点击 `绑定动作到元素` 后，时间尺显示 `highlight-box → 代码示例区域`。
- 时间尺 `data-testid="action-time-ruler"` 存在。

## 项目内 Codex skill 草案

新增目录：

```text
tools/course-video-workbench/
  SKILL.md
  README.md
  schema/
    hyperframes-project-source.schema.json
    stage-element.schema.json
    action-ref.schema.json
  examples/
    import-hyperframes-project.md
    bind-action-to-element.md
    export-capcut-package.md
```

第一版 `SKILL.md` 只作为项目内说明，不注册为全局 skill。内容包括：

- 如何读取 HyperFrames 项目文件夹
- 如何生成 element map
- 如何把 detected animations 映射到 action library
- 如何新增缺失动作
- 如何修改 timeline action refs
- 如何生成成片或剪辑软件交付包

## 真实使用上的注意点

### 1. 公网页面与本地生产力能力分离

Cloudflare 公网页面只展示 mock 数据和交互样式，不读取用户本地文件夹，不调用本地 Codex。真实生产力能力放在本地模式和项目内 skill / bridge 里。

### 2. 元素识别必须避免只靠视觉框选

第一版可以 mock element map，但产品方向必须明确：优先从 HyperFrames HTML / manifest 中拿元素结构。视觉框选适合作为人工修正手段，不适合作为默认解析策略。

### 3. 动作库不能只有固定参数表单

复杂动画需要三种承载方式并存：

- `parametric`：高亮框、箭头、字幕强调等稳定动作。
- `custom-component`：从 HyperFrames 或项目组件沉淀出来的具体动画。
- `llm-assisted`：用户描述意图，由本地 Codex 修改 action contract、组件实现或 timeline 绑定。

### 4. 组装状态只做工作台 manifest，不承包上游生产链路

后续可以沉淀一个轻量 assembly manifest，用来保存当前平台内的组装状态。它不是完整内容生产链路的 source of truth，也不要求平台管理上游 topic 总结或 HyperFrames 生成过程。

```text
course-assembly/
  inputs.json
  element-map.json
  actions.json
  timeline.json
  foreground-window.json
  handoff/
    capcut-manifest.json
    codex-handoff.json
```

这个 manifest 只回答平台自己的问题：

- 后台区用了哪个 HyperFrames 项目文件夹。
- 前台区用了哪个口播视频。
- 识别到哪些后台元素。
- 哪些动作绑定到了哪些元素和时间点。
- 前台窗口如何摆放。
- 当前组装结果如何交付给渲染器、剪映 / CapCut 或本地 Codex。

## 导出产物

平台后续需要支持两类输出。

### 1. 合成成片

由平台或后续渲染服务输出：

```text
exports/final-course-video.mp4
```

规则：

- 后台区视频 / HyperFrames render 作为主画面。
- 前台口播窗口叠加。
- 动作 overlay 叠加。
- 音频使用前台口播音频。

### 2. 专业剪辑软件交付包

输出：

```text
exports/capcut-handoff/
  master-preview.mp4
  background-clean.mp4
  foreground-speaker.mp4
  overlays/
  captions.srt
  timeline.csv
  manifest.json
  edit-guide.md
```

`edit-guide.md` 必须写明：

- 导入顺序
- 轨道顺序
- 哪个文件是后台画面
- 哪个文件是前台口播
- 哪些 overlay 对应哪些动作
- 如何在剪映 / CapCut 中二次微调

## 暂不做

本轮不做：

- 浏览器真实读取本地文件夹内容。
- 真实解析任意 HyperFrames 项目的完整 GSAP AST。
- 真实合成 mp4。
- 真实上传文件到服务端。

本轮做的是静态前端和本地生产力工具模型：用 mock HyperFrames 项目文件夹表达真实产品语义，为后续本地 bridge / skill / render pipeline 留接口。
