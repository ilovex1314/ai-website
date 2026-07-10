# ai-website

这是一个基于 React + Vite 的交互 Demo 实验室，用来把 Claude Design /
vibe-coding 调研结果拆成一个个可验证的前端能力样例。

## 当前范围

当前网站承载 9 个 topic。前 8 个偏前端可视化/交互能力样例，第 9 个是
面向本地生产力工作流的 Remotion 课程动画制作台。

- ECharts 交互图表
- Spline 3D 嵌入
- Three.js 自定义 3D 场景
- Shadertoy Shader 改造
- Unicorn Studio WebGL 特效嵌入
- Matter.js 物理实验
- Rive 交互二维动画
- Mapbox 交互地图
- Remotion 课程动画制作台

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
- 动作库：主工作台保留动作库摘要入口；完整动作资产管理拆到子页面，
  支持 `parametric`、`llm-assisted`、`custom-component` 三类实现模式；HyperFrames 检测到但动作库缺失的动画会补成 draft action。
- Review 预览：选择时间轴片段、seek 播放头、切换 16:9/4:3/9:16 画布比例，
  并在 mock HyperFrames element map 上选择元素、绑定当前动作。
- 动作时间尺：展示 segment、action ref、播放头，以及带目标元素名的动作标签。
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
本地使用时，它是后续接入 Codex bridge / skill / Remotion / HyperFrames / FFmpeg
渲染链路的组装入口，不替代剪映/CapCut 做完整专业剪辑，也不做泛用 NLE。

项目内本地生产力 skill 草案位于 `tools/course-video-workbench/`。它只作为当前仓库内的
HyperFrames 项目读取、element map 生成、detected animation 映射、timeline action ref 修改、
assembly manifest 和后续成片/剪映交付结构说明，不注册成全局 Codex skill。

设计与计划文档：

- `docs/superpowers/specs/2026-07-09-remotion-course-workbench-phase1-design.md`
- `docs/superpowers/plans/2026-07-09-remotion-course-workbench-phase1.md`
- `docs/remotion-course-global-plan.md`
- `docs/remotion-course-animation-library-management.md`
- `docs/remotion-course-workflow-design.md`

## 常用命令

```bash
npm run dev
npm test
npm run build
npm run lint
```

topic-by-topic 的实现计划见 `docs/demo-plan.md`。
