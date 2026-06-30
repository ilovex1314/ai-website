# AI Website 框架设计

## 目标

在 `/Volumes/2TB-NVMe/work/study-ai` 同级初始化一个 React + Vite 项目，
用于把 vibe-coding 调研结果整理成 demo 路线图。

## 范围

第一阶段交付项目框架，不实现具体 demo。范围包括：首页、类路由的 topic
详情页、结构化 topic 数据、测试、README 和计划文档。后续每个阶段只实现
一个 topic。

## 架构

调研得到的 demo track 统一放在 `src/data/topics.ts`。`src/App.tsx` 读取
当前路径，在首页路线图和 topic 详情页之间切换。这样可以先避免引入路由库，
等应用真正需要嵌套路由时再加。

## Demo Track

- ECharts：图表
- Spline：3D 嵌入
- Three.js：自定义 3D
- Shadertoy：shader 改造
- Unicorn Studio：WebGL 特效嵌入
- Matter.js：二维物理
- Rive：交互二维动画
- Mapbox GL JS：地图

## 测试

使用 Vitest 和 Testing Library。第一批测试覆盖 8 个 topic slug、可执行的
topic 元数据、首页渲染和 topic 详情页渲染。
