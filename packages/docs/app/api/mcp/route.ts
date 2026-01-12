import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { DocumentService } from '@/lib/mcp/document-service';

// 创建 MCP Server 实例
function createMcpServer() {
  const server = new McpServer({
    name: 'amagi-docs-mcp',
    version: '1.0.0',
  });

  const documentService = new DocumentService();

  // 注册 list_documents 工具
  server.registerTool(
    'list_documents',
    {
      description: '获取所有可用的 Amagi 文档列表',
    },
    async () => {
      const result = await documentService.listDocuments();
      return {
        content: [{ type: 'text', text: JSON.stringify(result.content, null, 2) }],
      };
    }
  );

  // 注册 get_document 工具
  server.registerTool(
    'get_document',
    {
      description: '获取指定文档的完整内容',
      inputSchema: z.object({
        path: z.string().describe('文档路径，例如：usage/guide/sdk'),
      }),
    },
    async ({ path }) => {
      try {
        const result = await documentService.getDocument(path);
        return {
          content: [{ type: 'text', text: result.content }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `错误: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  // 注册 search_documents 工具
  server.registerTool(
    'search_documents',
    {
      description: '根据关键词搜索文档',
      inputSchema: z.object({
        query: z.string().describe('搜索关键词'),
      }),
    },
    async ({ query }) => {
      const result = await documentService.searchDocuments(query);
      return {
        content: [{ type: 'text', text: JSON.stringify(result.content, null, 2) }],
      };
    }
  );

  return server;
}

// POST 请求 - 处理 MCP 消息（无状态模式）
export async function POST(request: Request) {
  // 每次请求创建新的 server 和 transport（无状态模式，适合 Serverless）
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    // 无状态模式：不生成 session ID
    sessionIdGenerator: undefined,
  });

  // 连接 server 和 transport
  await server.connect(transport);

  // 处理请求
  return transport.handleRequest(request);
}

// GET 请求 - 健康检查
export async function GET() {
  return new Response(
    JSON.stringify({
      name: 'amagi-docs-mcp',
      version: '1.0.0',
      description: 'MCP Server for Amagi documentation',
      transport: 'streamable-http',
      tools: ['list_documents', 'get_document', 'search_documents'],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// DELETE 请求 - 无状态模式下直接返回成功
export async function DELETE() {
  return new Response(null, { status: 204 });
}

// OPTIONS 请求 - CORS 预检
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id',
    },
  });
}
