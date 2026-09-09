# Response Direction Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let developers explicitly mark any recorded response as success-direction or error-direction, persist that choice per corpus sample, and generate independent success/error TypeScript response types from those directions.

**Architecture:** Response direction is an explicit, human-selected property stored on each corpus sample. Typegen splits samples by that direction rather than by platform-specific response heuristics. The web console lets the developer choose direction after seeing the response and before saving, reclassifies the pending sample on the server, and recomputes the displayed declaration/diff.

**Tech Stack:** TypeScript, Vitest, React, HeroUI, existing `@ikenxuan/amagi-typegen` and web console server.

**Spec:** This conversation’s approved design: per-sample persisted `direction`, chosen after response, generic across platforms, no automatic content-based direction inference.

## Global Constraints

- Response direction is orthogonal to HTTP status and response body content.
- Direction is persisted on each corpus sample, not inferred from `filter_detail`, `status_code`, `null`, `''`, or any platform-specific field.
- Success and error samples must generate separate root types.
- Existing reject/risk-control behavior remains unchanged.
- Legacy samples without `direction` infer direction from existing `verdict.kind` only for backward compatibility.
- No new runtime dependency.

---

### Task 1: Generic direction metadata in typegen

**Files:**
- Modify: `packages/typegen/src/corpus.ts`
- Test: `packages/typegen/test/corpus.test.ts`

**Interfaces:**
- Produces: `export type ResponseDirection = 'success' | 'error'`
- Produces: `CorpusMetadata.direction?: ResponseDirection`
- Produces: `CreateCorpusSampleInput.direction?: ResponseDirection`
- Produces: `responseDirectionOf(sample: CorpusSample): ResponseDirection`

- [x] **Step 1: Write failing tests**

Add tests that prove:
1. A sample created with `direction: 'error'` stores `metadata.direction === 'error'`.
2. A sample created without direction defaults to `success`.
3. Legacy `store-as-error` samples infer `error`.
4. Legacy `store` / `reject` samples infer `success`.

Example:

```ts
it('stores the developer-selected direction on the sample', () => {
  const result = createCorpusSample(input({ direction: 'error' }))
  assert('sample' in result)
  expect(result.sample.metadata.direction).toBe('error')
})

it('legacy store-as-error samples infer error direction', () => {
  const sample = withMetadata({ verdict: { kind: 'store-as-error', reason: 'legacy', confident: true } })
  expect(responseDirectionOf(sample)).toBe('error')
})
```

- [x] **Step 2: Run the failing tests**

```bash
pnpm --filter @ikenxuan/amagi-typegen test -- corpus.test.ts
```

Expected: fail because `direction` and `responseDirectionOf` do not exist.

- [x] **Step 3: Implement direction metadata**

Add:

```ts
export type ResponseDirection = 'success' | 'error'

export interface CorpusMetadata {
  direction?: ResponseDirection
  // existing fields unchanged
}

export interface CreateCorpusSampleInput {
  direction?: ResponseDirection
  // existing fields unchanged
}

export const responseDirectionOf = (sample: CorpusSample): ResponseDirection =>
  sample.metadata.direction ?? (sample.metadata.verdict.kind === 'store-as-error' ? 'error' : 'success')
```

Store `direction` in `metadata` inside `createCorpusSample`.

Remove the Douyin-specific `isDouyinInvisibleWork` helper and its tests.

- [x] **Step 4: Verify**

```bash
pnpm --filter @ikenxuan/amagi-typegen test -- corpus.test.ts
```

Expected: all corpus tests pass.

---

### Task 2: Typegen splits by direction, not verdict

**Files:**
- Modify: `packages/typegen/src/plan.ts`
- Test: `packages/typegen/test/plan.test.ts`

**Interfaces:**
- Consumes: `responseDirectionOf`
- Produces: `<Endpoint>_V0` for success samples
- Produces: `<Endpoint>_Error_V0` for error samples
- Produces: endpoint and platform barrel exports for both directions

- [x] **Step 1: Write failing tests**

Add tests for:
1. Manual `direction: 'error'` samples generate `Endpoint_Error_V0`.
2. Manual `direction: 'success'` samples generate `Endpoint_V0`.
3. Mixed directions generate both types without polluting each other.
4. Error-only endpoints generate only `Endpoint_Error_V0`.
5. Legacy `store-as-error` samples still generate `Endpoint_Error_V0`.

Example:

```ts
it('manual error direction generates an independent Error_V0', () => {
  const error = sample({ direction: 'error', raw: { anything: null } })
  const ok = sample({ raw: { data: { title: 'ok' } } })
  const { files } = plan([{ platform: 'bilibili', endpoint: 'videoInfo', samples: [error, ok] }])
  expect(files.get('bilibili/VideoInfo/VideoInfo_V0.ts')).toContain('title')
  expect(files.get('bilibili/VideoInfo/VideoInfo_Error_V0.ts')).toContain('anything: null')
})
```

- [x] **Step 2: Run failing tests**

```bash
pnpm --filter @ikenxuan/amagi-typegen test -- plan.test.ts
```

- [x] **Step 3: Implement**

In `planEndpoint`:

```ts
const successPayloads: JsonValue[] = []
const errorPayloads: JsonValue[] = []

for (const sample of input.samples) {
  if (responseDirectionOf(sample) === 'error') {
    errorPayloads.push(payloadOf(sample))
    errorUsed.push(sample)
  } else {
    successPayloads.push(payloadOf(sample))
    used.push(sample)
  }
}
```

Generate:

```ts
const errorRootName = `${name}_Error_V0`
generateTypes(errorPayloads, { rootName: errorRootName, ... })
```

Export both roots from the endpoint and platform barrels.

- [x] **Step 4: Verify**

```bash
pnpm --filter @ikenxuan/amagi-typegen test -- plan.test.ts
```

---

### Task 3: Server can reclassify a pending sample by direction

**Files:**
- Modify: `packages/web/server/outcome.ts`
- Modify: `packages/web/server/index.ts`
- Modify: `packages/web/shared/contract.ts`
- Test: `packages/web/test/outcome.test.ts`
- Test: `packages/web/test/serverDirection.test.ts` or extend an existing server test

**Interfaces:**
- Consumes: `ResponseDirection`
- Produces: `RecordOutcome.direction: ResponseDirection`
- Produces: `POST /api/direction` with body `{ pendingId: string; direction: 'success' | 'error' }`
- Produces: updated `RecordOutcome` after reclassification

- [x] **Step 1: Write failing tests**

Test that:
1. `buildOutcome` accepts `direction`.
2. Changing direction updates the pending sample’s metadata.
3. Changing direction recomputes `typeSource`, `diff`, and `shapeChanged`.
4. Unknown `pendingId` returns 404.
5. Invalid direction returns 400.

- [x] **Step 2: Run failing tests**

```bash
pnpm exec vitest run packages/web/test/outcome.test.ts packages/web/test/serverDirection.test.ts
```

- [x] **Step 3: Implement**

Add to `BuildOutcomeInput`:

```ts
direction?: ResponseDirection
```

Pass it to `createCorpusSample`.

Add a pure helper to rebuild an outcome from a pending sample:

```ts
export const rebuildOutcome = (
  entry: PendingSample,
  input: Omit<BuildOutcomeInput, 'raw' | 'normalized' | 'http' | 'amagiVersion' | 'recordedAt'>
): BuildOutcomeResult
```

Add route:

```ts
if (url.pathname === '/api/direction' && method === 'POST') {
  // validate pendingId and direction
  // update pending sample metadata.direction
  // rebuild outcome and return it
}
```

- [x] **Step 4: Verify**

```bash
pnpm exec vitest run packages/web/test/outcome.test.ts packages/web/test/serverDirection.test.ts
```

---

### Task 4: Web UI direction selector after response

**Files:**
- Modify: `packages/web/src/lib/api.ts`
- Modify: `packages/web/src/components/SamplePane.tsx`
- Modify: `packages/web/src/App.tsx`
- Test: `packages/web/test/result.test.ts`
- Test: `packages/web/test/samplePane.test.ts` or existing relevant test

**Interfaces:**
- Consumes: `RecordOutcome.direction`
- Consumes: `POST /api/direction`
- Produces: `setResponseDirection(pendingId, direction): Promise<RecordOutcome>`

- [x] **Step 1: Write failing tests**

Test that:
1. `SamplePane` renders a two-option direction control when `pendingId` exists.
2. Selecting error calls the reclassification callback.
3. Direction is shown as a chip.
4. Save remains disabled while reclassification is running.

- [x] **Step 2: Run failing tests**

```bash
pnpm exec vitest run packages/web/test/result.test.ts packages/web/test/samplePane.test.ts
```

- [x] **Step 3: Implement**

Add API client:

```ts
export const setResponseDirection = (
  pendingId: string,
  direction: 'success' | 'error'
): Promise<RecordOutcome> => request('/api/direction', { pendingId, direction })
```

In `SamplePane`, add a segmented control:

```tsx
<SegmentedControl
  aria-label="响应方向"
  value={outcome.direction ?? 'success'}
  onChange={(direction) => void onDirectionChange(direction)}
  options={[
    { value: 'success', label: '成功响应' },
    { value: 'error', label: '错误响应' }
  ]}
/>
```

Wire `onDirectionChange` in `App.tsx` to call `setResponseDirection` and replace the current outcome.

- [x] **Step 4: Verify**

```bash
pnpm exec vitest run packages/web/test/result.test.ts packages/web/test/samplePane.test.ts
```

---

### Task 5: Generated artifacts and full verification

**Files:**
- Modify: `packages/response-types/src/generated/**`
- Modify: `packages/response-types/src/generated/douyin/index.ts`

**Interfaces:**
- Produces: `ParseWork_V0`
- Produces: `ParseWork_Error_V0`

- [x] **Step 1: Regenerate types**

```bash
pnpm gen:types
```

- [x] **Step 2: Confirm split**

Ensure:
1. `ParseWork_V0` contains only success samples.
2. `ParseWork_Error_V0` contains only manually marked error samples.
3. Platform barrel exports both.

- [x] **Step 3: Full verification**

```bash
pnpm --filter @ikenxuan/amagi-typegen test
pnpm --filter @ikenxuan/amagi-web test
pnpm --filter @ikenxuan/amagi-typegen typecheck
pnpm --filter @ikenxuan/amagi-web typecheck
pnpm --filter @ikenxuan/amagi-response-types typecheck
pnpm --filter @ikenxuan/amagi-response-types build
pnpm --filter @ikenxuan/amagi-typegen lint
pnpm --filter @ikenxuan/amagi-web lint
pnpm --filter @ikenxuan/amagi-response-types lint
```

All commands must exit 0.
