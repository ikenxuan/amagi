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

// 会话管理
const sessions = new Map<string, { server: McpServer; transport: WebStandardStreamableHTTPServerTransport }>();

// POST 请求 - 处理 MCP 消息
export async function POST(request: Request) {
  const sessionId = request.headers.get('mcp-session-id');

  // 复用已有会话
  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!;
    return transport.handleRequest(request);
  }

  // 创建新会话
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  // 连接 server 和 transport
  await server.connect(transport);

  // 处理请求
  const response = await transport.handleRequest(request);

  // 保存会话
  const newSessionId = transport.sessionId;
  if (newSessionId) {
    sessions.set(newSessionId, { server, transport });
  }

  return response;
}

// GET 请求 - SSE 流或健康检查
export async function GET(request: Request) {
  const sessionId = request.headers.get('mcp-session-id');

  // 如果有会话 ID，处理 SSE 流
  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!;
    return transport.handleRequest(request);
  }

  // 否则返回健康检查信息
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

// DELETE 请求 - 终止会话
export async function DELETE(request: Request) {
  const sessionId = request.headers.get('mcp-session-id');

  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!;
    await transport.close();
    sessions.delete(sessionId);
  }

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
