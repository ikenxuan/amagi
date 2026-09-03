import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'

import { DocumentService } from '@/lib/mcp/document-service'
import { INSTALL_COMMAND, SKILL_COMMANDS, SKILLS, SKILLS_DOC_PATH } from '@/lib/mcp/skills'

/** 与 GET 健康检查里的 tools 数组共用一份，免得加了工具忘了改自述 */
const TOOLS = ['list_documents', 'get_document', 'search_documents', 'list_skills']
const SERVER_VERSION = '1.1.0'

// 创建 MCP Server 实例
function createMcpServer() {
  const server = new McpServer({
    name: 'amagi-docs-mcp',
    version: SERVER_VERSION
  })

  const documentService = new DocumentService()

  // 注册 list_documents 工具
  server.registerTool(
    'list_documents',
    {
      description: '获取所有可用的 Amagi 文档列表'
    },
    async () => {
      const result = await documentService.listDocuments()
      return {
        content: [{ type: 'text', text: JSON.stringify(result.content, null, 2) }]
      }
    }
  )

  // 注册 get_document 工具
  server.registerTool(
    'get_document',
    {
      description: '获取指定文档的完整内容（路径带版本前缀：v7 起文档分成 v6 / v7 两棵树，`list_documents` 返回的 path 可直接拿来用）',
      inputSchema: z.object({
        path: z.string().describe('文档路径，例如：v7/usage/guide/sdk（v6 页面则是 v6/usage/guide/sdk）')
      })
    },
    async ({ path }) => {
      try {
        const result = await documentService.getDocument(path)
        return {
          content: [{ type: 'text', text: result.content }]
        }
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `错误: ${error.message}` }],
          isError: true
        }
      }
    }
  )

  // 注册 search_documents 工具
  server.registerTool(
    'search_documents',
    {
      description: '根据关键词搜索文档',
      inputSchema: z.object({
        query: z.string().describe('搜索关键词')
      })
    },
    async ({ query }) => {
      const result = await documentService.searchDocuments(query)
      return {
        content: [{ type: 'text', text: JSON.stringify(result.content, null, 2) }]
      }
    }
  )

  // 注册 list_skills 工具
  //
  // 逐页 get_document 之外的另一条路：把仓库里的技能装到本地，让技能自带的
  // `fetch_docs.mjs` 去认页、判版本口径、兜网络失败，比每次现编一串取页调用可靠。
  // 这里只给「有哪些技能、怎么装、能跑什么」，用法散文在 `SKILLS_DOC_PATH` 那一页上，
  // 同一段话不写两遍。
  server.registerTool(
    'list_skills',
    {
      description:
        '列出本仓库提供的 Agent Skills（技能包）及安装方式。适合在需要长期、反复查 amagi 文档时改用技能，而不是逐页调 get_document'
    },
    async () => {
      const payload = {
        install: INSTALL_COMMAND,
        usageDoc: { path: SKILLS_DOC_PATH, hint: `用 get_document("${SKILLS_DOC_PATH}") 取完整用法说明` },
        commands: SKILL_COMMANDS,
        skills: SKILLS
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }]
      }
    }
  )

  return server
}

// POST 请求 - 处理 MCP 消息（无状态模式）
export async function POST(request: Request) {
  // 每次请求创建新的 server 和 transport（无状态模式，适合 Serverless）
  const server = createMcpServer()
  const transport = new WebStandardStreamableHTTPServerTransport({
    // 无状态模式：不生成 session ID
    sessionIdGenerator: undefined
  })

  // 连接 server 和 transport
  await server.connect(transport)

  // 处理请求
  return transport.handleRequest(request)
}

// GET 请求 - 健康检查
export async function GET() {
  return new Response(
    JSON.stringify({
      name: 'amagi-docs-mcp',
      version: SERVER_VERSION,
      description: 'MCP Server for Amagi documentation',
      transport: 'streamable-http',
      tools: TOOLS,
      skills: { install: INSTALL_COMMAND, names: SKILLS.map((skill) => skill.name) }
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

// DELETE 请求 - 无状态模式下直接返回成功
export async function DELETE() {
  return new Response(null, { status: 204 })
}

// OPTIONS 请求 - CORS 预检
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id'
    }
  })
}
