/**
 * 响应 schema 产物的形状契约。
 *
 * 生产者在 `scripts/gen-response-schemas.mts`（走 TypeScript AST 把端点声明的响应类型
 * 转成 JSON Schema），消费者是 `server/openapi.ts` 与生成的
 * `server/response-schemas.generated.ts`。
 *
 * 单独放契约层是为了让**两边都只依赖它**：生成脚本不能从 `src/` 反向 import，
 * 生成的模块也不该把 `scripts/` 拉进包的构建图。
 */

/** 一份 JSON Schema。形状由 ts-json-schema-generator 决定，不是本仓库的契约 */
export type ResponseSchema = Record<string, unknown>

/** `operationId` → 该端点 `data` 的 schema。没有可用类型的端点不出现在这里 */
export type ResponseSchemaMap = Record<string, ResponseSchema>

/**
 * 生成器的完整产出。
 *
 * 分两块是因为 JSON Schema 的引用结构决定的：`ts-json-schema-generator` 用
 * `expose: 'all'` 时把具名类型放进 `definitions` 并 `$ref` 它们，而 OpenAPI 要求具名
 * schema 平铺在 `components.schemas` 下、用 `#/components/schemas/` 引用。生成器负责
 * 摊平，并把键统一加 `<operationId>.` 前缀 —— 不同端点的定义会撞名
 * （`EmojiList_V0`、`Data` 这类每个端点里都有一份）。
 */
export interface ResponseSchemas {
  /** operationId → 该端点 `data` 的 schema（多形态的端点是一层 `anyOf`） */
  byEndpoint: ResponseSchemaMap
  /** 摊平后的具名 schema，键已加端点前缀，可直接并进 `components.schemas` */
  definitions: ResponseSchemaMap
}
