# AI Website Demo 计划

本项目会把 Claude Design 和 vibe-coding 调研结果转换成一组聚焦的
React demo。第一版提交只负责建立应用框架、topic 数据和文档；后续每次
围绕一个 topic 实现一个可交互样例。

## Topic 顺序

1. ECharts 交互图表
   - 已按方案 A 实现富途风格折线行情图：范围切换、hover 交易信息、红绿趋势、成交量、拖拽与 reback。
   - 复现指引见 `docs/echarts-market-chart-guide.md`。
2. Matter.js 物理实验
   - 验证二维物理、直接拖拽、重置和可复现的初始场景。
3. Three.js 自定义 3D 场景
   - 验证非空 WebGL canvas、指针响应和稳定构图。
4. Spline 3D 嵌入
   - 验证 iframe/embed 集成和优雅降级。
5. Shadertoy Shader 改造
   - 验证 shader 运行时基础能力和可编辑 uniforms。
6. Unicorn Studio WebGL 特效嵌入
   - 验证导出 HTML/embed 的隔离方式和本地 fallback 动效。
7. Rive 交互二维动画
   - 验证资源加载和预留给状态机输入的控制接口。
8. Mapbox 交互地图
   - 验证 token 处理、地图渲染、样式切换和数据覆盖层。

## 工作规则

每个 topic 都应该作为一个独立 demo 落地，并满足：

- 在 `/topics/<slug>` 下有可见页面
- 有清晰的数据或配置边界
- 至少有一个聚焦该 topic 行为的测试
- 提交前运行 `npm test`、`npm run build`
- 当 topic 涉及 canvas、iframe 或地图表面时，需要额外做浏览器检查

## 调研结论摘要

这套工作流可以理解为“AI 编排层 + 专用前端引擎”：ECharts 负责复杂图表，
Spline 负责现成 3D 资产，Three.js 负责自定义 3D，Shadertoy 负责 shader
改造，Unicorn Studio 负责无代码 WebGL 特效，Matter.js 负责二维刚体物理，
Rive 负责交互二维动画，Mapbox GL JS 负责地图。

## ECharts 数据说明

首个 ECharts demo 使用本地确定性模拟行情数据，而不是直接依赖实时金融接口。
这样可以保证演示在离线、停盘或公共接口限流时仍然稳定。数据结构已经保留
时间、价格、涨跌额、涨跌幅、成交量和成交额字段，后续可以替换为真实数据源。
