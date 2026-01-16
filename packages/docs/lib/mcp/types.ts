/**
 * 文档元数据接口
 */
export interface DocumentMetadata {
  /** 文档路径，如 "docs/usage/guide/sdk" */
  path: string;
  /** 文档标题 */
  title: string;
  /** 文档描述 */
  description: string;
  /** GitHub 上的文档 URL */
  url: string;
}
