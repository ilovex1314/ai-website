# AI Website 框架实现计划

> **给 agentic workers：** REQUIRED SUB-SKILL: 使用
> superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans
> 按任务执行本计划。步骤使用 checkbox（`- [ ]`）语法追踪。

**目标：** 搭建一个用于 vibe-coding demo lab 的 React + Vite 初始框架。

**架构：** 应用采用小型 data-first 结构。topic 元数据放在
`src/data/topics.ts`；`src/App.tsx` 根据 `window.location.pathname` 渲染
首页路线图或 topic 详情页；文档记录后续 topic 的执行顺序。

**技术栈：** React、Vite、TypeScript、Vitest、Testing Library。

---

### 任务 1：脚手架与测试基础

**文件：**
- 创建：`src/test/setup.ts`
- 修改：`package.json`
- 修改：`vite.config.ts`
- 创建：`src/data/topics.test.ts`
- 创建：`src/App.test.tsx`

- [x] **步骤 1：生成 Vite React TypeScript 项目**

运行：

```bash
npm create vite@latest ai-website -- --template react-ts
```

预期：Vite 创建 `/Volumes/2TB-NVMe/work/ai-website`。

- [x] **步骤 2：安装依赖**

运行：

```bash
npm install
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

预期：依赖安装完成且没有 vulnerabilities。

- [x] **步骤 3：先写失败测试**

测试要求包含 8 个 topic slug、可执行的 topic 元数据、首页 heading、8 张
article 卡片、ECharts 链接，以及 Matter.js 详情页。

- [x] **步骤 4：确认测试失败**

运行：

```bash
npm test
```

预期：测试失败，因为 `src/data/topics.ts` 尚不存在，Vite starter 页面也还没有
渲染规划中的 UI。

### 任务 2：路线图应用框架

**文件：**
- 创建：`src/data/topics.ts`
- 替换：`src/App.tsx`
- 替换：`src/App.css`
- 替换：`src/index.css`

- [x] **步骤 1：实现 topic 数据**

创建 8 个 topic 对象：ECharts、Spline、Three.js、Shadertoy、Unicorn、
Matter.js、Rive、Mapbox。每个 topic 包含 `slug`、`title`、`tool`、
`summary`、`demoGoal`、`plannedInteractions`、`acceptanceCriteria` 和
`references`。

- [x] **步骤 2：实现应用渲染**

在 `/` 渲染路线图首页，在 `/topics/<slug>` 渲染 topic 详情。未知 slug 渲染
not-found 面板，并提供返回 `/` 的链接。

- [x] **步骤 3：实现基础样式**

使用响应式 CSS grid、紧凑卡片、克制配色和稳定卡片尺寸。第一屏直接呈现应用
内容，不做营销式 landing page。

### 任务 3：文档与 Git

**文件：**
- 创建：`docs/demo-plan.md`
- 创建：`docs/superpowers/specs/2026-06-30-ai-website-framework-design.md`
- 创建：`docs/superpowers/plans/2026-06-30-ai-website-framework.md`
- 修改：`README.md`

- [x] **步骤 1：记录 demo 计划**

在 `docs/demo-plan.md` 写入 topic 顺序和工作规则。

- [x] **步骤 2：记录设计与实现计划**

在 `docs/superpowers` 下写入已确认的设计和本实现 checklist。

- [x] **步骤 3：验证**

运行：

```bash
npm test
npm run build
```

预期：两个命令都通过。

- [x] **步骤 4：提交并推送**

运行：

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin git@github.com:ilovex1314/ai-website.git
git push -u origin main
```

预期：初始框架提交推送到 GitHub。
