# Shadertoy 三模式工作台设计 Spec

## 背景

当前网站首页按 `src/data/topics.ts` 的顺序展示 9 个 topic，其中第 4 个是
`/topics/shadertoy` 的“Shadertoy 着色器改编”。这个入口目前仍是计划页，尚未提供真实
shader 运行时。

本 topic 需要同时解决三种学习需求：先看到 shader 能做什么，再理解它为什么这样工作，最后知道
如何把 Shadertoy 风格代码迁移进普通 React 网站。它不能只是一张炫酷背景，也不能在首版扩张成
完整 Shadertoy 复刻。

## 已确认方向

页面采用一个统一的 Shadertoy Studio 外壳，包含三个一级 Tab：

1. **A · 作品展厅**：通过原创 shader 和参数面板理解常见视觉能力与使用场景。
2. **B · 引导实验室**：通过五步课程理解 fragment shader，并修改、预测和运行 GLSL。
3. **C · 迁移工作台**：粘贴 Shadertoy `Image` 源码，完成单 Pass 兼容检查、运行验证和 React 接入说明。

C 首版完整支持无外部输入的单 Pass `mainImage`。发现 Buffer、`iChannel`、图片、视频、音频、键盘、
摄像头或 Cubemap 依赖时，工作台必须给出明确的依赖报告和迁移指引，但不在首版运行这些依赖。

## 产品定位

三个 Tab 不是三张互不相关的页面，而是同一条学习路径的三个视角：

- A 回答“它能做什么、参数怎么用”。
- B 回答“每个像素如何算出颜色、代码怎么改”。
- C 回答“社区代码为什么不能总是直接粘贴、怎样进入自己的项目”。

用户可以从任意 Tab 开始。A 和 B 提供显式“送到迁移工作台”动作；C 只有在用户确认后才接收源码，
不会因为切换 Tab 覆盖用户正在编辑的草稿。

## 产品目标

- 在 `/topics/shadertoy` 渲染真实 WebGL 工作台，而不是计划占位页。
- 用 A/B/C 三个键盘可访问的一级 Tab 承载展示、学习和迁移三种任务。
- 第一屏解释“对每个像素输入坐标，输出颜色”的 fragment shader 心智模型。
- A 提供 4 个原创单 Pass 作品、统一参数控制和真实网站容器预览。
- B 用五个递进实验连接 `fragCoord`、`iResolution`、数学距离、`iTime`、`iMouse` 和自定义 uniforms。
- B 允许用户修改 `mainImage`，在运行前选择预测，并通过编译诊断修正错误。
- C 能分析粘贴源码，区分可直接运行、需要人工确认和首版不支持的依赖。
- C 对可兼容单 Pass 源码提供本地运行预览与 React/WebGL 接入配方。
- 编译失败时展示源代码行号并保留上一次成功画面。
- 所有内置作品和教学 shader 都由本项目原创，不依赖远程作品、纹理、API 或 token。

## 非目标

- 不实现 Buffer A–D、多 Pass framebuffer 或历史反馈。
- 不加载 `iChannel0–3` 的图片、视频、音频、键盘、摄像头和 Cubemap 输入。
- 不接受 Shadertoy URL 导入，也不通过 Shadertoy API 拉取社区代码。
- 不自动下载或复制社区作品，不绕过作品授权要求。
- 不做完整 IDE：不引入 Monaco、语言服务器、自动补全、格式化或断点调试。
- 不做账号、云端保存、分享链接、作品发布或社区功能。
- 不承诺任意社区 shader 都能直接运行。
- 不把 Shadertoy 宣传为传统 3D 场景、游戏或所有网站视觉效果的最佳生产方案。

## 页面信息架构

### Studio 顶栏

- 返回案例目录。
- 标题“Shadertoy Studio”。
- 中文定位：“从作品、原理到 React 迁移。”
- 当前 WebGL profile 与运行状态：运行中、已暂停、编译失败、依赖阻塞或 WebGL 不可用。

### 一级 Tab

- 使用 `tablist`、`tab` 和 `tabpanel` 语义。
- Tab 标签固定为“作品展厅”“引导实验室”“迁移工作台”。
- 支持点击、左右方向键和 Home/End 切换。
- URL 使用查询参数保存当前 Tab：`/topics/shadertoy?view=gallery|lab|porting`。
- Tab 切换通过 `history.replaceState` 更新查询参数，不为每次切换制造一条浏览器历史记录。
- 未识别的 `view` 回退到 `gallery`。
- 三个状态域保存在页面父组件；只有当前 Tab 挂载 canvas runtime。切换时释放旧 WebGL context，
  但保留源码、参数、累计时间和最后成功版本，返回后按原状态重建。

### 共享概念条

三个 Tab 上方固定展示简化数据流：

`像素坐标 → mainImage → uniforms → GPU 逐像素计算 → canvas`

当前 Tab 高亮与自己最相关的部分，但不改变概念顺序。

## A · 作品展厅

### 目标

让用户先通过“选作品、调参数、换容器”理解 shader 是可配置的实时视觉程序，而不是固定视频或 GIF。

### 原创作品

首版包含 4 个本地单 Pass 作品：

1. **Aurora Orbit**：距离场、旋转坐标、时间与双色混合。
2. **Liquid Grid**：重复坐标、波形扰动与网格发光。
3. **Pulse Rings**：鼠标中心、同心环和衰减。
4. **Neon Threads**：多条正弦曲线、叠加和亮度控制。

每个作品数据包含稳定 ID、标题、一句话原理、源码、默认 uniforms、推荐容器和性能等级。

### 页面结构

- 左侧：4 个作品选择卡，卡片使用本地静态 poster，不为每张卡创建独立 WebGL context。
- 中间：一个真实 WebGL 主舞台。
- 右侧：参数面板、原理说明和应用容器切换。
- 移动端顺序为作品选择 → 主舞台 → 参数 → 原理。

### 参数

- `uSpeed`：动画速度。
- `uScale`：图案尺度。
- `uIntensity`：发光或对比强度。
- `uPrimaryColor`、`uSecondaryColor`：两种主题色。
- 恢复作品默认值。

修改参数只更新现有 program 的 uniforms，不重新编译 shader。

### 应用容器

用户可以把同一个实时 canvas 切换成三种展示框架：

- 页面背景：16:9 宽幅。
- Hero 横幅：3:1。
- 卡片封面：4:3。

容器切换只调整尺寸与 UI framing，不替换 shader。页面同时解释适合该效果的用途和需要注意的文字
对比度、性能与 reduced-motion 问题。

### 跨 Tab 动作

- “去实验室拆解”：把当前作品源码和参数作为只读参考送到 B 的“作品拆解”上下文。
- “检查迁移”：把当前源码、profile 和来源元数据填入 C，自动运行兼容分析。

## B · 引导实验室

### 目标

让没有系统图形学经验的前端开发者在约 10 分钟内理解 fragment shader 的核心心智模型，并完成一次
可观察的 GLSL 修改、预测和运行。

### 五步概念路径

1. **像素坐标 `fragCoord`**：当前 GPU 正在计算哪个像素。
2. **画布尺寸 `iResolution`**：把像素坐标转换成跨尺寸稳定的 UV。
3. **数学图形**：通过距离、`smoothstep` 和颜色混合生成形状。
4. **时间 `iTime`**：让每像素计算随时间变化。
5. **指针与参数**：用 `iMouse` 和宿主 uniforms 把 React 交互传入 GPU。

### 五个原创实验

#### 实验 1：像素变成颜色

- 输出基于 UV 的 RGB 渐变。
- 任务：预测交换 `uv.x` 与 `uv.y` 后渐变方向如何变化。

#### 实验 2：统一坐标与画圆

- 做中心化、宽高比修正，并用距离函数画圆。
- 任务：预测修改半径阈值后圆会变大还是变小。

#### 实验 3：让图形呼吸

- 使用 `sin(iTime * uSpeed)` 改变圆环半径与亮度。
- 任务：区分提高 `uSpeed` 与提高 `uIntensity` 的结果。

#### 实验 4：让鼠标进入 GPU

- 把 `iMouse.xy` 转换为 Y 轴向上的画布坐标。
- 任务：预测移除宽高比修正后圆会发生什么。

#### 实验 5：Aurora Orbit 拆解

- 综合坐标、旋转、距离、时间、鼠标和自定义 uniforms。
- 用户修改一处代码、先选预测、再运行并对照解释。

### 工作区

- 左栏：五步导航、概念、关键变量、预测题和观察点。
- 中栏：WebGL canvas、播放、暂停、重置时间和渲染倍率。
- 右栏：轻量 textarea 代码编辑器、运行、恢复示例和编译诊断。
- 下方：uniform 控制与“Shadertoy 代码如何进入 React”的宿主桥接说明。

### 草稿、预测与运行

- 每个实验第一次打开时加载默认源码和参数。
- 用户修改后，切换实验或 Tab 会保留每个实验自己的草稿、参数和预测选择。
- 编辑只更新草稿，不自动编译；点击“运行”后才尝试替换 program。
- 每个实验提供一个问题和 2–3 个互斥预测选项。
- 预测不是运行前置条件；第一次成功运行后揭示解释。
- 自动判定只针对预设任务；自由修改其他代码时只展示概念解释，不假装判断任意视觉结果。
- “恢复示例”只恢复当前实验。

### 跨 Tab 动作

- “检查这段代码”：把当前成功源码送到 C 并运行分析。
- 从 A 进入时，显示对应作品使用了哪些已学概念，不覆盖当前实验草稿。

## C · 迁移工作台

### 目标

让用户理解 Shadertoy 源码不是一个可直接安装的 React 组件，并完成“粘贴 → 分析 → 修正 → 预览 →
接入”的单 Pass 迁移闭环。

### 输入区

- GLSL 源码 textarea，要求包含 `mainImage`。
- 可选来源 URL、作者和许可证备注，用于提醒保留出处；这些字段只保存在当前页面内存中。
- WebGL profile 选择：自动、WebGL 1、WebGL 2。
- “分析兼容性”是显式动作，不在每次键入时运行。

### 静态兼容分析

分析结果分为三类：

- **可运行**：存在 `mainImage`，没有外部 Channel/Buffer 依赖，语法 profile 可由本地 runtime 包装。
- **需确认**：存在自定义 uniform、扩展、精度声明或 profile 模糊；允许继续编译，但解释风险。
- **阻塞依赖**：引用 `iChannel0–3`、`mainSound`、`mainVR`、音视频/键盘/摄像头语义或明确多 Pass
  依赖；首版不运行，必须给出下一步迁移清单。

以下情况也视为阻塞：缺少 `mainImage`、同时定义宿主 `main()`、声明任意 `sampler*` 外部纹理、
使用不受支持的矩阵/数组/结构体 uniform，或浏览器不支持源码明确要求的 WebGL profile。

仅凭粘贴的 Image 源码无法可靠判断某个 `iChannel` 来自图片还是 Buffer。工作台必须把它报告为
“外部输入来源未知”，不能猜测或声称已经完成自动迁移。

### 编译与预览

- 只有不存在阻塞依赖时才启用“尝试运行”。
- adapter 根据自动分析或用户选择生成 WebGL 1 / GLSL ES 1.00 或 WebGL 2 / GLSL ES 3.00 包装。
- 编译成功后原子替换迁移预览的 program。
- 编译失败时显示 profile、阶段、映射后的用户源码行号和原始浏览器日志。
- 失败时保留上一个成功迁移预览，不显示误导性的空白成功状态。
- `float`、`int`、`bool`、`vec2`、`vec3` 和 `vec4` 自定义 uniform 会生成基础数值输入，用户设置
  初始值后才能进入预览；输入值同时进入最终接入配方。
- 未设置或无法解析的自定义 uniform 显示为警告或阻塞，并列出 React 侧需要提供的名称和类型。

### 接入配方

成功运行后生成一份页面内配方，不直接修改用户仓库：

1. 当前成功编译的 `mainImage` 源码；保持用户逻辑，不做风格重写。
2. runtime 需要提供的 built-in 和自定义 uniforms 清单。
3. React canvas 生命周期示例：初始化、resize、RAF、pointer、清理。
4. 当前 profile、精度和浏览器要求。
5. 来源与许可证检查提醒。

每个代码区提供复制按钮。配方只针对当前成功编译版本，源码再次修改后标记为“需要重新验证”。

### 不支持依赖的迁移指引

发现阻塞依赖时，按实际符号给出最小下一步：

- `iChannel`：确认来源类型、准备本地资产、创建 texture、设置 filtering/wrapping、逐帧绑定 sampler。
- Buffer：拆分 Pass、创建 framebuffer/texture、定义执行顺序和 feedback 规则。
- 音视频：确认浏览器权限、解码与 autoplay 限制。
- `mainSound` / `mainVR`：说明当前网站 runtime 不提供对应执行管线。

首版不生成看似可用但实际缺少依赖的代码。

## 共享运行时契约

### 用户 shader 入口

基础入口为：

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // 用户或内置 shader 代码
}
```

共享 built-in：

- `iResolution: vec3`
- `iTime: float`
- `iTimeDelta: float`
- `iFrame: int`
- `iFrameRate: float`
- `iMouse: vec4`
- `iDate: vec4`
- `iSampleRate: float`

其中 `iDate` 使用年、月、日和当天秒数，`iSampleRate` 固定为 `44100.0`。`iChannelTime`、
`iChannelResolution` 和 `iChannel0–3` 属于外部输入能力，首版不注入并由 C 报告为阻塞依赖。

本站原创作品与课程额外使用：

- `uSpeed: float`
- `uScale: float`
- `uIntensity: float`
- `uPrimaryColor: vec3`
- `uSecondaryColor: vec3`

### WebGL profile

- 内置作品和教学实验统一使用 WebGL 1 / GLSL ES 1.00 可用语法，保证较宽兼容面。
- C 的自动模式检测 `#version 300 es`、GLSL ES 3.00 输出声明和 WebGL 2 专用语法。
- adapter 会先提取用户的 `#version` 指令，再把它放在最终源码第一行；版本指令不会被包在 precision
  或 uniform 声明之后。
- adapter 只注入用户源码尚未声明的受支持 built-in 和 precision，避免重复声明。
- WebGL 2 源码使用独立 adapter 和 fragment output；不通过字符串替换伪造版本兼容。
- 浏览器不支持源码要求的 profile 时显示阻塞状态，不静默降级。

### 时间

- `iTime` 使用内部累计时间，不直接使用页面加载后的墙钟时间。
- 暂停冻结累计时间；继续时从冻结位置恢复。
- `iTimeDelta` 是两次真实绘制之间的有效秒数，首帧与暂停状态下的主动重绘为 0。
- `iFrame` 每次实际 draw 后递增，`iFrameRate` 使用最近有效帧间隔计算。
- 重置时间同时把 `iTime`、`iTimeDelta` 和 `iFrame` 归零，但不重置源码或 uniforms。
- `iDate` 在每次 draw 前更新；暂停后的参数重绘仍使用当前日期。
- reduced-motion 用户首次进入 A/B 时默认暂停，仍可手动播放。

### 鼠标

- 指针坐标按 drawing buffer 尺寸缩放，并把浏览器向下的 Y 轴转换为 shader 向上的 Y 轴。
- pointer down 时，`iMouse.xy` 与正值 `iMouse.zw` 都记录按下位置。
- 按住拖动时只更新 `iMouse.xy`；pointer up 后保留最后位置，并把 `iMouse.zw` 变为负值以表示释放。
- 从未交互时四个分量都是 0。

### 尺寸与性能

- 渲染倍率提供 `0.5×`、`0.75×`、`1×`，device pixel ratio 上限为 2。
- ResizeObserver 同步 drawing buffer；不支持时降级为 window resize。
- 参数变化或 resize 时，即使暂停也主动绘制一帧。
- 页面任一时刻只维护当前 Tab 的一个 WebGL context；离开 Tab 时释放 context 关联资源并保存运行状态。
- A 的作品卡使用本地 poster，避免同时创建 4 个缩略 canvas。

### 编译安全

- 新源码先在临时 shader/program 中编译和链接。
- 成功后才原子替换当前 program，并释放旧 program。
- 失败时释放临时 GPU 资源并保留最后成功 program。
- 编译日志规范化为 profile、阶段、用户源码行号、消息和原始日志。
- 组件卸载时取消 RAF、observer 和事件监听，并删除 buffer、shader 和 program。

## 状态与跨 Tab 数据流

页面维护三个隔离状态域：

- `galleryState`：作品、uniforms、容器模式、播放和倍率。
- `labState`：五个实验草稿、参数、预测、解释和当前步骤。
- `portingState`：粘贴源码、来源元数据、profile、分析报告、最后成功编译版本和配方状态。

跨 Tab 只通过显式 handoff 发生：

```ts
type ShaderHandoff = {
  source: string
  origin: 'gallery' | 'lab'
  title: string
  profile: 'webgl1' | 'webgl2'
  uniformValues: Record<string, number | [number, number, number]>
  provenance?: {
    sourceUrl?: string
    author?: string
    licenseNote?: string
  }
}
```

C 接收 handoff 后仍会重新分析，不把本站内置源码当作绕过分析的特殊情况。

## 技术架构

首版使用原生 WebGL runtime，而不是 Three.js `ShaderMaterial`。这个 topic 要显式展示 Shadertoy
代码与浏览器宿主的边界，并直接控制编译日志、profile、program 原子替换与资源释放。已有 Three.js
topic 继续负责 Scene、Camera 和 Mesh 抽象，本 topic 不重复那套心智模型。

实现不新增生产依赖或编辑器依赖，继续使用现有 React、TypeScript、Vitest 和 Playwright 工具链。

### 文件边界

- `src/features/shadertoy-studio/runtime/shaderTypes.ts`
  - profile、uniform、诊断、运行状态和 handoff 类型。
- `src/features/shadertoy-studio/runtime/shaderAdapters.ts`
  - WebGL 1 与 WebGL 2 的 `mainImage` 包装和源码行号映射。
- `src/features/shadertoy-studio/runtime/shaderDiagnostics.ts`
  - Chrome/ANGLE、Safari 与 Firefox 编译日志规范化。
- `src/features/shadertoy-studio/runtime/shaderCompiler.ts`
  - 临时编译、链接、program 交换前结果和失败资源释放。
- `src/features/shadertoy-studio/runtime/shaderRuntime.ts`
  - context、全屏三角形、uniform locations、draw、resize 和 GPU 资源释放。
- `src/features/shadertoy-studio/runtime/shaderCompatibility.ts`
  - C 的 built-in、profile、Channel、Buffer、扩展和自定义 uniform 静态分析。
- `src/features/shadertoy-studio/runtime/useShaderCanvas.ts`
  - React 生命周期、RAF、累计时间、pointer、resize 和 context lost/restored。
- `src/features/shadertoy-studio/gallery/galleryPresets.ts`
  - 4 个原创作品及 poster、参数和应用说明。
- `public/images/shadertoy-studio/*.webp`
  - 由 4 个原创 shader 本地渲染得到的静态 poster，不从第三方网站抓取。
- `src/features/shadertoy-studio/gallery/ShaderGalleryTab.tsx`
  - A 的选择、实时舞台、参数和容器模式。
- `src/features/shadertoy-studio/lab/shaderLessons.ts`
  - 五个原创实验、预测选项和解释。
- `src/features/shadertoy-studio/lab/ShaderLabTab.tsx`
  - B 的课程导航、canvas、编辑器、参数和诊断。
- `src/features/shadertoy-studio/porting/ShaderPortingTab.tsx`
  - C 的输入、分析报告、编译预览和接入配方。
- `src/features/shadertoy-studio/porting/IntegrationRecipe.tsx`
  - 当前成功版本的 React/WebGL 配方与复制动作。
- `src/features/shadertoy-studio/ShadertoyStudioPage.tsx`
  - Tab URL 状态、三个状态域、共享状态栏和 handoff 协调。
- `src/features/shadertoy-studio/ShadertoyStudioPage.css`
  - 三 Tab 响应式布局、深色工作台、编辑器、诊断和容器 framing。

`src/App.tsx` 只增加 `/topics/shadertoy` 到 `ShadertoyStudioPage` 的路由分支，不把 runtime 逻辑放回
应用入口。

## 错误与降级

- WebGL context 创建失败：显示说明卡；源码、课程和分析仍可阅读，运行按钮禁用。
- Fragment/vertex 编译失败：展示 profile、阶段、用户行号和浏览器日志；保留最后成功画面。
- Program 链接失败：显示链接诊断，不切换 program。
- `highp` fragment precision 不可用：内置 WebGL 1 shader 使用 `mediump` 重新包装，并显示精度提示。
- C 的源码显式要求不支持的 precision/profile 时阻塞运行，不擅自改写。
- `webglcontextlost`：停止 RAF、阻止默认销毁并显示恢复状态。
- `webglcontextrestored`：用最后成功源码和 profile 重建资源；失败则回到不可用状态。
- 离开 Tab：保存累计时间与最后成功源码，销毁 runtime；再次进入时重建，不把离开时长计入 `iTime`。
- 复制 API 不可用：选中配方文本并显示手动复制提示。

## 视觉与可访问性

- 延续网站中文学习实验室风格，但 Studio 使用深色工作台衬托发光 canvas。
- 三个一级 Tab 在视觉上明确区分，同时共享同一标题、概念条和状态语言。
- 运行、警告、阻塞和错误不只用颜色区分，同时提供文字、图标和边框变化。
- canvas 提供可访问名称和不可用 fallback。
- 控件使用原生 button、range、color、radio 和 textarea，可通过键盘操作。
- 焦点样式清晰；诊断和复制结果使用合适的 `aria-live="polite"`。
- 移动端必须能切换 Tab、运行作品、修改参数、查看代码、运行分析和阅读配方；不要求舒适地编写长代码。

## 测试策略

### 纯逻辑测试

- WebGL 1/2 adapter 正确注入 built-ins、用户源码和各自的 fragment output。
- 诊断解析覆盖 Chrome/ANGLE、Safari 与 Firefox 常见格式，并映射回用户源码行号。
- compatibility analyzer 正确区分 ready、warning 和 blocker。
- `iChannel` 被报告为未知外部输入，不猜测具体来源。
- 4 个 gallery preset 和 5 个 lesson 的 ID、源码、参数和文案契约完整。
- pointer 映射覆盖 CSS 尺寸、drawing buffer 倍率和 Y 轴翻转。
- 暂停、继续、离开 Tab 和返回后的累计时间不会跳变。

### 组件测试

- `/topics/shadertoy` 渲染三个 Tab，默认选中作品展厅。
- URL `view` 与键盘 Tab 切换正确，未知值回退 gallery。
- A 可选择 4 个作品、修改参数和容器模式。
- B 可切换五步、保留草稿、选择预测、运行和查看诊断。
- C 可粘贴源码、运行分析、阻止 `iChannel` 依赖，并为兼容源码展示预览与配方。
- A/B 到 C 的显式 handoff 不会未经确认覆盖迁移草稿。
- WebGL 不可用时三个 Tab 的非运行内容仍然可用。

### 浏览器验证

- 桌面检查三个 Tab、URL、真实 WebGL 输出、参数、编辑、错误恢复、复制配方和跨 Tab handoff。
- 移动检查 Tab 可达性、内容顺序、canvas 比例、代码区与报告区溢出。
- 检查离开 Tab 后旧 runtime 已释放，且全程无 WebGL/console error。
- 人工触发一次 `WEBGL_lose_context` 验证恢复流程。
- 验证 reduced-motion 初始暂停和手动播放。

### 项目级验证

```bash
npm test
npm run lint
npm run build
```

## 分阶段施工边界

本 spec 是一个产品，但实现按共享依赖顺序拆成可独立验收的阶段：

1. 共享 runtime、adapter、诊断与基础页面外壳。
2. A 作品展厅。
3. B 引导实验室。
4. C 单 Pass 迁移工作台。
5. 跨 Tab handoff、浏览器验证、文档与视觉收口。

详细测试先行步骤、具体函数签名和提交边界由后续 implementation plan 定义。

## 验收标准

- `/topics/shadertoy` 不再显示计划占位页，而是包含 A/B/C 三个一级 Tab 的真实 Studio。
- A 提供 4 个原创作品、实时参数控制和 3 种网站容器预览。
- B 提供五步课程，用户能完成至少一次预测、源码修改和成功运行。
- C 能运行不依赖外部输入的单 Pass `mainImage`，并生成与成功版本一致的 React 接入配方。
- C 发现 `iChannel`、Buffer、音视频或其他未支持管线时明确阻塞并给出针对性指引。
- 合法 GLSL 修改会改变 canvas；uniform 修改不触发重新编译。
- 编译错误映射到用户源码行号，最后成功画面不会被黑屏覆盖。
- 三个 Tab 状态隔离，显式 handoff 可追踪且不会意外覆盖草稿。
- 播放、暂停、时间重置、渲染倍率、鼠标和 Tab 离开/返回行为稳定。
- 页面清楚解释 Shadertoy `mainImage` 与 React/WebGL 宿主之间的关系。
- 页面不依赖远程 shader、纹理、API 或 token。
- 桌面和移动端可用，键盘 Tab 交互与 reduced-motion 行为正确。
- focused tests、完整测试、lint 和 production build 全部通过。

## 文档一致性

当前 `docs/demo-plan.md` 保留了较早的 topic 顺序，把 Matter.js 排在第 2、Shadertoy 排在第 5，
而首页与 `src/data/topics.ts` 的当前顺序把 Shadertoy 排在第 4。实现时同步更新该文档，使读者看到的
顺序与首页一致。
