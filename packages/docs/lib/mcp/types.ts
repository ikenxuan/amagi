/**
 * 文档元数据接口
 */
export interface DocumentMetadata {
  /** 文档路径，如 "v7/usage/guide/sdk" */
  path: string
  /** 文档标题 */
  title: string
  /** 文档描述 */
  description: string
  /** 文档站上的页面 URL */
  url: string
}

/**
 * 技能包元数据（`lib/mcp/skills.ts` 那份清单的形状）
 */
export interface SkillManifest {
  /** 技能名，同时是 SKILL.md 里的 `name` 与目录名 */
  name: string
  /** 一句话说明它管什么事 */
  purpose: string
  /** 在仓库里的位置 */
  directory: string
  /** `get` / `bundle` 认得的主题名 */
  topics: string[]
}
