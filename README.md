# ai-website

这是一个基于 React + Vite 的交互 Demo 实验室，用来把 Claude Design /
vibe-coding 调研结果拆成一个个可验证的前端能力样例。

## 当前范围

当前网站承载 9 个 topic。前 8 个偏前端可视化/交互能力样例，第 9 个是
面向本地生产力工作流的 Remotion 课程动画制作台。

- ECharts 交互图表
- Spline 3D 嵌入
- Three.js 自定义 3D 场景
- Shadertoy Studio（三模式 Shader 学习与迁移工作台）
- Unicorn Studio WebGL 特效嵌入
- Matter.js 物理实验
- Rive 交互二维动画
- Mapbox 交互地图
- Remotion 课程动画制作台

## Shadertoy Studio

入口：`/topics/shadertoy`，也可通过 `?view=gallery|lab|porting` 直接进入三种模式。

- 作品展厅：四个原创、本地、无纹理依赖的单 Pass Shader，可切换背景、Hero、卡片容器以及速度、尺度、强度、颜色与渲染质量。
- 引导实验室：五节可编辑实验，从 `fragCoord`、`iResolution`、形状数学和 `iTime` 走到 `iMouse` 与宿主 uniforms。
- 迁移工作台：粘贴 Shadertoy `mainImage` 源码，先分析依赖，再运行兼容的 WebGL 1 / WebGL 2 单 Pass，成功后生成 React 接入配方。

共享 runtime 支持 `iResolution`、`iTime`、`iTimeDelta`、`iFrame`、`iFrameRate`、`iMouse`、`iDate` 和 `iSampleRate`。首版不伪装支持 Buffer、`iChannel`、纹理、音视频、VR、键盘、摄像头或多 Pass；检测到这些能力时会显示 blocker 和迁移建议。

## Remotion 课程动画制作台

入口：

- 本地预览：`/topics/remotion-course`
- 动作库子页面：`/topics/remotion-course/actions`
- 完整地址：`http://127.0.0.1:5173/topics/remotion-course`

这个 topic 的目标是搭一个“课程口播视频组装台 + 教学动画库管理”工具。上游的 topic 总结、
HyperFrames PPT 分享项目生成、口播文案生成和用户录制，只是输入上下文，不属于当前平台承包的生产系统。

当前 MVP 包含：

- Media Intake：后台区固定表达为 HyperFrames 项目文件夹，前台区表达为用户录制的口播视频。
- 后台区 source：`sourceKind: "hyperframes-project"`，`renderedPreview` 只作为预览或兜底，不作为结构化输入。
- 音频规则：前台口播视频是最终音频主轨，后台 HyperFrames preview 默认静音；总时长跟随后台区，前台短则结束隐藏，前台长则截断。
- Timeline：按课程片段管理 slide、caption、speaker 布局和动作引用。
- 动作库：主工作台保留动作库摘要入口；完整动作资产管理拆到子页面。用户可按“添加动画”与
  “添加元素 + 动画”两种资产类型及具体动作分类筛选；`parametric`、`llm-assisted`、
  `custom-component` 仅作为内部实现元数据保留。HyperFrames 检测到但动作库缺失的动画会补成 draft action。
- 指向箭头：先选择 PPT 目标 DOM，再添加直线、曲线、折线或自定义图片箭头。箭头尖端会吸附目标元素
  最近边缘，尾部和长度可在画布调整；每个绑定实例可独立配置颜色、持续时间和淡入淡出。
- Review 预览：导入真实 HyperFrames 项目后读取 scene、element map 和内置动画；支持播放、暂停、seek、
  16:9/4:3/9:16 画布切换、DOM 元素选择，以及把平台动作绑定到指定元素和时间点。
- Manifest-first 导入：优先读取 HyperFrames 项目内的 `animation-manifest.json` 和 `element-map.json`，
  直接恢复稳定元素 ID、各画幅位置和内置动画；缺少描述文件时才使用运行时检查兜底。本地开发环境
  打开工作台后会自动导入默认案例，导入完成前不展示旧 mock 元素框或 timeline。
- 内置动画覆盖：HyperFrames 原生动画绑定到对应 DOM，可在 Inspector 修改、停用和恢复；
  平台新增标注与原生动画分开保存，同一元素可以在不同时段绑定多个平台动作。
- 双视频同步：后台区视频作为播放时钟和总时长，默认静音；前台区视频与后台区从 0 对齐并提供主音轨，
  短于后台区时自动隐藏，长于后台区时按后台时长截断。
- 动作时间尺：展示 segment、action ref、播放头，以及带目标元素名的动作标签。
- Remotion 成片导出：本地服务会把当前组装状态渲染成 MP4；HyperFrames 内置动画只保留在后台视频中，
  平台新增标注才会作为 overlay 渲染，编辑器选择框和拖拽手柄不会进入成片。
- Assembly manifest：只保存当前平台内组装状态，包括 inputs、element map、actions、timeline、
  foreground window 和 handoff 结构；它不是完整生产链路的 source of truth。
- 本地 Codex 协作：读取当前 assembly 状态，辅助修改动作或 timeline，并为后续成片/剪映交付预留结构。

复杂动画不强行塞进固定参数表。稳定动作由表单参数管理；复杂动作由 Codex 根据自然语言意图、
组件契约、上下文和验收标准生成实现草稿，再回写项目动作库。

第一批动作库 mock 覆盖课程/教程里更常见的表达：高亮框、箭头、圈注、重点文字卡、
章节标题条、PPT 局部聚焦、课程进度条、步骤逐项揭示、光标点击、代码行高亮、
前后对比擦除、遮罩聚光和章节转场。

公网部署到 Cloudflare 时，这个页面只作为静态前端平台展示，不会尝试连接本地服务；
`public/_redirects` 会把 `/topics/remotion-course` 和 `/topics/remotion-course/actions`
这类深层路由回退到 Vite SPA 入口。公网环境使用项目内 mock 数据展示管理端样式和流程，
不会读取用户本地文件夹，也不会调用本地 Codex handoff 或外部 LLM agent。
本地使用时，它会同时启动 Vite 管理台和 Course Workbench Service。管理台可调用本地服务扫描
HyperFrames 项目文件夹、读取本地媒体并执行 Remotion 渲染；它不替代剪映/CapCut 做完整专业剪辑，
也不做泛用 NLE。

真实导出物默认写入：

`./.course-workbench/projects/<project-id>/renders/master-<aspect-ratio>.mp4`

新的默认测试案例位于 `videos/remotion-course-workbench-manifest-case/`。它用本项目的设计与制作过程
制作了一段 9:16 HyperFrames 教学视频，并随项目交付 7 个场景、35 个稳定元素、34 个内置动画、
`element-map.json` 和 `animation-manifest.json`。最终 MP4 为 110 秒、1080x1920、H.264 视频和 AAC 双声道音频；
当前本地实测结构化导入约 0.5 秒。案例的 `foregroundPreview` 暂时复用同一 MP4，便于完整验证双视频和音频链路。

项目内本地生产力 skill 草案位于 `tools/course-video-workbench/`。它只作为当前仓库内的
HyperFrames 项目读取、element map 生成、detected animation 映射、timeline action ref 修改、
assembly manifest 和后续成片/剪映交付结构说明，不注册成全局 Codex skill。

口播材料生成 skill 位于 `tools/voiceover-materials/`，用于根据成片目标时长、场景节奏和人设生成
口播文案、语速建议、录制提示与交付说明，并校验文案时长和 manifest-first 项目描述文件。

设计与计划文档：

- `docs/superpowers/specs/2026-07-09-remotion-course-workbench-phase1-design.md`
- `docs/superpowers/plans/2026-07-09-remotion-course-workbench-phase1.md`
- `docs/remotion-course-global-plan.md`
- `docs/remotion-course-animation-library-management.md`
- `docs/remotion-course-workflow-design.md`

## 常用命令

```bash
npm run start:course
npm run dev
npm test
npm run build
npm run lint
```

Fork 仓库的首次安装、快捷启动、环境变量和故障排查见
[`docs/remotion-course-local-setup.md`](docs/remotion-course-local-setup.md)。

topic-by-topic 的实现计划见 `docs/demo-plan.md`。
