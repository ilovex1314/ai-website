# AI Website Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the initial React and Vite framework for a vibe-coding demo lab.

**Architecture:** The app uses a small data-first structure. Topic metadata lives
in `src/data/topics.ts`; `src/App.tsx` renders the roadmap or a topic detail page
based on `window.location.pathname`; docs describe the topic execution plan.

**Tech Stack:** React, Vite, TypeScript, Vitest, Testing Library.

---

### Task 1: Scaffold And Test Harness

**Files:**
- Create: `src/test/setup.ts`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/data/topics.test.ts`
- Create: `src/App.test.tsx`

- [x] **Step 1: Generate the Vite React TypeScript project**

Run:

```bash
npm create vite@latest ai-website -- --template react-ts
```

Expected: Vite creates `/Volumes/2TB-NVMe/work/ai-website`.

- [x] **Step 2: Install dependencies**

Run:

```bash
npm install
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: dependencies install with no vulnerabilities.

- [x] **Step 3: Write failing tests**

Add tests that require eight topic slugs, actionable topic metadata, the home
heading, eight article cards, the ECharts link, and a Matter.js detail page.

- [x] **Step 4: Verify tests fail**

Run:

```bash
npm test
```

Expected: tests fail because `src/data/topics.ts` does not exist and the Vite
starter page does not render the planned UI.

### Task 2: Roadmap Shell

**Files:**
- Create: `src/data/topics.ts`
- Replace: `src/App.tsx`
- Replace: `src/App.css`
- Replace: `src/index.css`

- [x] **Step 1: Implement topic data**

Create eight topic objects for ECharts, Spline, Three.js, Shadertoy, Unicorn,
Matter.js, Rive, and Mapbox. Each topic includes `slug`, `title`, `tool`,
`summary`, `demoGoal`, `plannedInteractions`, `acceptanceCriteria`, and
`references`.

- [x] **Step 2: Implement app rendering**

Render the roadmap home at `/` and topic details at `/topics/<slug>`. Unknown
topic slugs render a not-found panel with a link back to `/`.

- [x] **Step 3: Style the shell**

Use responsive CSS grid, compact cards, restrained colors, and stable card
dimensions. Keep the first screen focused on the app, not a marketing page.

### Task 3: Documentation And Git

**Files:**
- Create: `docs/demo-plan.md`
- Create: `docs/superpowers/specs/2026-06-30-ai-website-framework-design.md`
- Create: `docs/superpowers/plans/2026-06-30-ai-website-framework.md`
- Modify: `README.md`

- [x] **Step 1: Document the demo plan**

Write the topic order and working rule in `docs/demo-plan.md`.

- [x] **Step 2: Document the design and implementation plan**

Write the approved design and this implementation checklist under
`docs/superpowers`.

- [x] **Step 3: Verify**

Run:

```bash
npm test
npm run build
```

Expected: both commands pass.

- [ ] **Step 4: Commit and push**

Run:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin git@github.com:ilovex1314/ai-website.git
git push -u origin main
```

Expected: the initial framework commit is pushed to GitHub.
