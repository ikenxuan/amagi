/**
 * `@ikenxuan/amagi-typegen` —— 响应类型自动化里**纯函数的那一半**。
 *
 * 见 `RESPONSE-TYPE-AUTOGEN-PRD.md` 四的那张图：录制器（有网络、非确定、偶尔手动跑）
 * 与生成器（纯函数、确定、CI 可跑）分开。本包只有生成器这半边，而且**不读文件、不发请求、不落盘**：
 * 「样本 → 形状树 → TypeScript 源码字符串」以及「样本 → 判别联合的一整套文件内容」为止。
 * 落盘那层将来照 `packages/core/scripts/gen-openapi.mts` 的契约写（生成逻辑在 src、
 * 脚本只负责写、`--check` 与已提交产物比对并置 `process.exitCode = 1`、行尾归一）。
 *
 * 两条入口，按要不要判别联合选：
 * 1. `generateTypes` —— N 份样本合成**一个**类型（合并规则见 PRD 五那张表）；
 * 2. `emitDiscriminatedUnion` —— 先做 PRD 5.1 判别式发现，按取值分组、每组各自合并，
 *    产出 `<Endpoint>/<判别式字面量>/<判别式字面量>_V<n>.ts` + barrel + `is*` 类型守卫 + 覆盖率报告。
 *    守卫是必须品不是锦上添花：core 的 `test/types/discriminant-narrowing.test-d.ts` 实测出
 *    「嵌套判别式的 `if` 不收窄、类型谓词能收窄」。
 *
 * 还没做的部分如实写在 `report.ts` 的 `NOT_IMPLEMENTED` 里，随每份报告一起返回。
 *
 * 第三条入口 `scrubSample` 名义上属于录制器（PRD 七的脱敏），但它本身是纯函数，
 * 所以放在这半边：录制器只管「发请求 → 交给它 → 写盘」，脱敏规则的正确性能在这里被单测钉住。
 *
 * 第四条 `planCorpusTypes` 是上面两条的调度层：整个 corpus → 「相对路径 → 源码」。
 * `scripts/gen-types.mts` 只在它外面套一层读盘 / 写盘 / `--check`，一如 `gen-openapi.mts`
 * 之于 `buildOpenApiSpec`。
 *
 * 第五条 `parseRequestCollection` 属于 `WEB-API-CONSOLE-PRD.md` 三那件新事：请求参数进 git。
 * 它与样本反着来 —— 样本只留本地、值是假的，请求集合进 git、值是真的。同样是纯函数，
 * 读盘那层在 `packages/web/server` 那边。
 */

export {
  assessCorpusAge,
  classifyResponse,
  CORPUS_FORMAT,
  CORPUS_ROOT,
  type CorpusAge,
  type CorpusHttpInfo,
  type CorpusMetadata,
  type CorpusSample,
  type CorpusVerdict,
  type CorpusVerdictKind,
  corpusPath,
  createCorpusSample,
  type CreateCorpusSampleInput,
  type CreateCorpusSampleResult,
  CREDENTIAL_PARAM,
  DEFAULT_MAX_AGE_DAYS,
  hashParams,
  serializeCorpusSample
} from './corpus'
export { type BreakingChange, detectBreakingChanges, readGeneratedProps } from './breaking'
export {
  buildCoverage,
  type BuildCoverageInput,
  DEFAULT_KEY_PATH_DEPTH,
  DEFAULT_MAX_DISCRIMINANT_VALUES,
  DEFAULT_MIN_SHAPE_WITNESSES,
  describeDiscriminant,
  type DiscriminantCandidate,
  type DiscriminantCoverage,
  type DiscriminantValue,
  type DiscriminantValueCoverage,
  type DriftRecord,
  findDiscriminants,
  type FindDiscriminantsOptions,
  groupSamplesByDiscriminant,
  type GroupSamplesResult,
  pickDiscriminant,
  readLiteralAtPath,
  type SampleGroup,
  type ShapeCluster,
  type ShapeSplit,
  splitShapes,
  type SplitShapesOptions
} from './discriminant'
export {
  collectSeedsFromSamples,
  DEFAULT_EDGE_LIMIT,
  type DependencyEdge,
  EMPTY_SEED_FILE,
  parseSeedFile,
  planRecordingOrder,
  type PlatformSeeds,
  readValuesAtPath,
  type RecordingPlan,
  resolveSeeds,
  type SeedFile
} from './deps'
export { collectShapePaths, type DocSidecar, findOrphanDocs, parseDocSidecar, type RenderDocIssue, renderJsDoc } from './docs'
export {
  emitDiscriminatedUnion,
  type EmitOptions,
  type EmitResult,
  type EmittedMember,
  type EmittedShape,
  fileNameFromLiteral,
  typeNameFromLiteral
} from './emit'
export { diffFlattened, type FieldDiff, type FieldDiffResult, type FlatField, flattenTypeSource, type FlattenResult } from './flatten'
export { type GenerateOptions, type GenerateResult, generateTypes } from './generate'
export { mergeSamples, type MergeResult } from './merge'
export {
  DEFAULT_MAX_COMBINATIONS,
  DEFAULT_MAX_VALUES_PER_PARAM,
  expandParamMatrix,
  type JsonSchemaLike,
  type ParamMatrix,
  type ParamMatrixOptions
} from './matrix'
export { childPath, DEFAULT_MAX_LITERALS, elementPath, GENERATED_BANNER, type MergeOptions, type RenderOptions } from './options'
export { type CorpusEndpointInput, planCorpusTypes, type PlanResult } from './plan'
export { INDEX_SIGNATURE, renderShape, type RenderResult } from './render'
export {
  type EmptyArrayFinding,
  type Finding,
  type LiteralWidenedFinding,
  type MergeReport,
  type MixedPrimitivesFinding,
  NOT_IMPLEMENTED,
  type UnsafeIntegerFinding
} from './report'
export {
  DEFAULT_REQUESTS_COMMENT,
  parseRequestCollection,
  type RequestCollection,
  type RequestEntry,
  REQUEST_VERDICTS,
  type RequestVerdict,
  REQUESTS_FORMAT,
  requestsPath,
  serializeRequestCollection
} from './requests'
export {
  createScrubSession,
  DEFAULT_SCRUB_KEEP,
  DEFAULT_SCRUB_RULES,
  MAX_SUSPECTS,
  type ScrubKind,
  type ScrubManifest,
  type ScrubMatcher,
  type ScrubOptions,
  type ScrubReplacement,
  type ScrubResult,
  type ScrubRule,
  scrubSample,
  type ScrubSession,
  type ScrubSuspect
} from './scrub'
export { SHAPE_KEY, SHAPE_KEY_PREFIX, SHAPE_KEY_VERSION, shapeKeyOfPayloads, shapeKeyOfSamples } from './shape'
export { DEFAULT_MAX_ELEMENTS, type TrimOptions, type TrimRecord, type TrimResult, trimSample } from './trim'
export type { ArrayShape, JsonValue, LiteralValue, ObjectShape, PrimitiveName, PrimitiveShape, Shape } from './types'
