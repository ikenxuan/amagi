import { source, getLLMText } from '@/lib/source';
import type { DocumentMetadata } from './types';

/**
 * 文档服务
 * 
 * 直接从本地 source 获取文档，无需调用 GitHub API
 */
export class DocumentService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 分钟

  /**
   * 获取所有文档列表
   */
  async listDocuments(): Promise<{ content: DocumentMetadata[] }> {
    const cacheKey = 'document-list';
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { content: cached };
    }

    const pages = source.getPages();
    const documents: DocumentMetadata[] = pages.map((page) => ({
      path: page.slugs.join('/'),
      title: page.data.title,
      description: page.data.description || '',
      url: `https://amagi-docs.vercel.app${page.url}`,
    }));

    this.setCache(cacheKey, documents);
    return { content: documents };
  }

  /**
   * 获取指定文档内容
   */
  async getDocument(path: string): Promise<{ content: string }> {
    // 将路径转换为 slug 数组
    const slugs = path.replace(/^docs\//, '').split('/').filter(Boolean);
    const page = source.getPage(slugs);

    if (!page) {
      throw new Error(`文档不存在: ${path}`);
    }

    const content = await getLLMText(page);
    return { content };
  }

  /**
   * 搜索文档
   */
  async searchDocuments(query: string): Promise<{ content: DocumentMetadata[] }> {
    const { content: allDocs } = await this.listDocuments();

    if (!query || query.trim() === '') {
      return { content: allDocs };
    }

    const lowerQuery = query.toLowerCase();
    const results = allDocs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.description.toLowerCase().includes(lowerQuery) ||
        doc.path.toLowerCase().includes(lowerQuery)
    );

    // 按相关度排序（标题匹配优先）
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(lowerQuery);
      const bTitle = b.title.toLowerCase().includes(lowerQuery);
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return 0;
    });

    return { content: results };
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}
