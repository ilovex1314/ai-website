# Lucky Draw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add and deploy a pure-frontend raffle page with sequential ticket claiming and random drawing from the claimed range.

**Architecture:** Keep raffle rules in a small pure TypeScript model and render them through a dedicated React page. Persist only sanitized raffle state to `localStorage`, then expose the page through the existing topic router and directory.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS

**Spec:** `docs/superpowers/specs/2026-11-16-lucky-draw-design.md`

## Global Constraints

- Pure frontend with no API and no new dependencies.
- Route is `/topics/lucky-draw`.
- State is local to the current browser and must survive reloads.
- The draw result must be an integer between `1` and the current issued count, inclusive.

## Review Focus

- Drawing with zero issued tickets must return no winner and remain disabled in the UI.
- The lowest and highest random boundaries must map to ticket `1` and the last issued ticket.
- Malformed or out-of-range persisted state must recover to an empty safe state.
- Issuing a ticket after a completed draw must clear the stale winner.
- Reset must clear visible state and browser persistence.

---

### Task 1: Raffle state model

**Files:**
- Create: `src/features/lucky-draw/raffleModel.ts`
- Test: `src/features/lucky-draw/raffleModel.test.ts`

**Interfaces:**
- Produces: `RaffleState`, `emptyRaffleState`, `claimNextTicket(state)`, `drawWinningTicket(state, random?)`, `parseRaffleState(value)`.

- [ ] Write failing tests for sequential claims, 1..80 random boundaries, empty draws, stale-winner clearing, and malformed persisted state.
- [ ] Run `npm test -- --run src/features/lucky-draw/raffleModel.test.ts` and verify failure because the model does not exist.
- [ ] Implement the minimal pure model.
- [ ] Re-run the focused test and verify it passes.
- [ ] Commit the model and tests.

### Task 2: Page, routing, persistence, and presentation

**Files:**
- Create: `src/features/lucky-draw/LuckyDrawPage.tsx`
- Create: `src/features/lucky-draw/LuckyDrawPage.css`
- Test: `src/features/lucky-draw/LuckyDrawPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/data/topics.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: raffle model exports from Task 1.
- Produces: `LuckyDrawPage` route component with local persistence and two functional zones.

- [ ] Write failing component and router tests for claim, draw, restore, reset, disabled state, and directory entry.
- [ ] Run focused page and app tests and verify expected failures.
- [ ] Implement the page, route, topic card, responsive CSS, and concise README entry.
- [ ] Re-run focused tests and verify they pass.
- [ ] Run lint, production build, and the full non-rendering test suite; document the known Remotion cold-render timeout separately.
- [ ] Commit the page implementation.

