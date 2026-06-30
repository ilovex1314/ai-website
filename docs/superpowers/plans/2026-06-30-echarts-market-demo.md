# ECharts Market Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/topics/echarts` 实现一个富途风格的 ECharts 折线行情 demo。

**Architecture:** 行情数据、范围窗口、降采样、拖拽平移等逻辑拆到
`src/features/market-chart/marketModel.ts`，React 组件只负责状态和渲染。
ECharts 初始化封装在 `EchartsMarketDemo.tsx` 的 effect 中，避免污染全局。

**Tech Stack:** React, TypeScript, ECharts, Vitest, Testing Library.

---

### Task 1: 行情模型与测试

**Files:**
- Create: `src/features/market-chart/marketModel.ts`
- Create: `src/features/market-chart/marketModel.test.ts`

- [x] **Step 1: Write failing tests**

覆盖范围定义、确定性数据生成、降采样平均点、趋势颜色、拖拽边界和分时禁拖。

- [x] **Step 2: Run focused tests**

Run: `npm test -- src/features/market-chart/marketModel.test.ts`

Expected: FAIL，因为模型文件尚未实现。

- [x] **Step 3: Implement model**

实现 `createMarketData`、`buildVisibleSeries`、`panWindow`、`getTrend`、
`formatTooltipRows` 等纯函数。

- [x] **Step 4: Verify model tests**

Run: `npm test -- src/features/market-chart/marketModel.test.ts`

Expected: PASS。

### Task 2: ECharts 组件与页面接入

**Files:**
- Create: `src/features/market-chart/EchartsMarketDemo.tsx`
- Create: `src/features/market-chart/EchartsMarketDemo.css`
- Modify: `src/App.tsx`
- Create: `src/features/market-chart/EchartsMarketDemo.test.tsx`

- [x] **Step 1: Write failing component tests**

测试 `/topics/echarts` 显示行情 demo、范围按钮、分时禁拖提示、拖拽后出现 reback。

- [x] **Step 2: Run focused tests**

Run: `npm test -- src/features/market-chart/EchartsMarketDemo.test.tsx`

Expected: FAIL，因为组件尚未实现。

- [x] **Step 3: Install and render ECharts**

安装 `echarts`，组件内初始化主图和成交量图，使用 resize observer 适配容器。

- [x] **Step 4: Implement interactions**

实现范围切换、禁用分时拖拽、左右拖拽、边界回弹和 reback。

- [x] **Step 5: Verify component tests**

Run: `npm test -- src/features/market-chart/EchartsMarketDemo.test.tsx`

Expected: PASS。

### Task 3: 验证与提交

**Files:**
- Modify: `docs/demo-plan.md`
- Modify: `.gitignore`

- [x] **Step 1: Update docs**

把 ECharts topic 标记为首个实现中的 demo，并记录本地模拟数据策略。

- [x] **Step 2: Full verification**

Run:

```bash
npm test
npm run build
npm run lint
```

Expected: all pass。

- [x] **Step 3: Browser verification**

打开 `/topics/echarts`，确认图表非空、按钮可切换、hover tooltip 可见、拖拽和
reback 可用。

- [x] **Step 4: Commit and push**

Run:

```bash
git add .
git commit -m "实现ECharts行情折线图Demo"
git push
```

Expected: pushed to `origin/main`。
