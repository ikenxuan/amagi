# Stable Response Exports and Diff Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export stable endpoint response type names while keeping `_Vn` variants internal, and replace the high-cost textual diff with a structured field-change view plus a full side-by-side code comparison.

**Architecture:** Typegen emits endpoint-local stable aliases (`EndpointSuccess`, `EndpointError`, `Endpoint`) that union internal variants and platform barrels expose only those stable aliases. The web outcome contract carries structured field changes and before/after generated source per changed file; the diff panel renders a default filterable field list and an alternate shared-scroll code comparison.

**Tech Stack:** TypeScript, Vitest, React 19, HeroUI v3, existing typegen renderer/flattening utilities.

**Spec:** Approved chat design on 2026-09-09: option 3 stable exports, default field list, alternate full code comparison, desktop side-by-side/mobile stacked, per-file selection, shared scrolling, changed-line emphasis.

## Global Constraints

- Public platform barrels do not expose `_Vn` names.
- Every endpoint exposes `Endpoint`, `EndpointSuccess`, and `EndpointError`; missing directions resolve to `never`.
- `Endpoint` is `EndpointSuccess | EndpointError`.
- Existing shape files may continue exporting `_Vn` internally.
- Field list is the default diff view.
- Code comparison uses the same server-produced before/after sources as the field list.
- No new dependency.

---

### Task 1: Stable endpoint aliases

**Files:** `packages/typegen/src/plan.ts`, `packages/typegen/test/plan.test.ts`, generated response-types, core generated reachability type tests.

- [ ] Add failing tests for success-only, error-only, mixed, and discriminated-union endpoints.
- [ ] Verify tests fail because platform barrels expose `_V0` names.
- [ ] Generate endpoint `index.ts` aliases: `EndpointSuccess`, `EndpointError`, `Endpoint`.
- [ ] Change platform barrels to prefix only stable aliases.
- [ ] Update generated reachability tests to stable names.
- [ ] Regenerate and verify typegen/response-types/core type tests.

### Task 2: Structured diff contract

**Files:** `packages/web/shared/contract.ts`, `packages/web/server/outcome.ts`, `packages/web/test/outcome.test.ts`.

- [ ] Add failing tests for `added`, `removed`, `type`, `optionality`, and source fallback records.
- [ ] Add `before`/`after`, path, kind, and reader-breaking metadata to `DiffLine`.
- [ ] Add before/after full source per changed file to `RecordOutcome`.
- [ ] Verify pure outcome tests.

### Task 3: Field-change list UI

**Files:** `packages/web/src/components/Result.tsx`, `packages/web/test/result.test.ts`.

- [ ] Add failing tests for summary counts, kind filters, breaking filter, field-path emphasis, and before→after rendering.
- [ ] Implement the field-list view as default.
- [ ] Keep complete-copy behavior.
- [ ] Verify result UI tests.

### Task 4: Code comparison UI

**Files:** `packages/web/src/components/Result.tsx`, `packages/web/src/components/ResultPane.tsx`, `packages/web/test/result.test.ts`.

- [ ] Add failing tests for view toggle, file selector, old/new labels, full source presence, and changed-line classes.
- [ ] Implement a shared vertical scroll container: two columns at desktop, stacked at narrow widths.
- [ ] Add per-file selection and changed-line highlighting.
- [ ] Verify UI tests and browser typecheck.

### Task 5: Documentation and full verification

**Files:** `packages/typegen/README.md`, `packages/web/README.md`, generated response-types.

- [ ] Document stable exports and diff views.
- [ ] Regenerate response types.
- [ ] Run package tests, typechecks, build, lint, and diff check.
