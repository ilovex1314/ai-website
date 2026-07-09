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

这个 topic 的目标不是做一个单条视频，而是搭一个“知识课程/教程口播动画库”
的微型制作工具。它的主链路是项目内结构化工程文件，Codex handoff 只作为辅助生成、
修改和交付打包入口。

第一阶段包含：

- 素材状态：口播视频、PPT 图片序列、字幕、讲稿等资产状态展示。
- Timeline：按课程片段管理 slide、caption、speaker 布局和动作引用。
- 动作库：主工作台保留动作库摘要入口；完整动作资产管理拆到子页面，
  支持 `parametric`、`llm-assisted`、`custom-component` 三类实现模式。
- Review 预览：选择时间轴片段和动画动作后，用 CSS/HTML 模拟课程画面；
  拖动预览标注可回写当前动作的 X/Y 参数。
- 工程包/剪映包思路：把项目、素材、timeline、actions 和导出清单作为稳定源数据，
  后续可生成 Remotion/HyperFrames/FFmpeg 视频，也可导出剪映/CapCut 分层素材包。
- 本地 Codex 协作：读取当前工程上下文，辅助生成 timeline、修改动作或打包后期输入文件。

复杂动画不强行塞进固定参数表。稳定动作由表单参数管理；复杂动作由 Codex 根据自然语言意图、
组件契约、上下文和验收标准生成实现草稿，再回写项目动作库。

第一批动作库 mock 覆盖课程/教程里更常见的表达：高亮框、箭头、圈注、重点文字卡、
章节标题条、PPT 局部聚焦、课程进度条、步骤逐项揭示、光标点击、代码行高亮、
前后对比擦除、遮罩聚光和章节转场。

公网部署到 Cloudflare 时，这个页面只作为静态前端平台展示，不会尝试连接本地服务；
`public/_redirects` 会把 `/topics/remotion-course` 和 `/topics/remotion-course/actions`
这类深层路由回退到 Vite SPA 入口。公网环境使用项目内 mock 数据展示管理端样式和流程，
不会调用本地 Codex handoff 或外部 LLM agent。
本地使用时，它是后续接入 Codex bridge / skill / Remotion / HyperFrames / FFmpeg
渲染链路的生产力入口。

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
