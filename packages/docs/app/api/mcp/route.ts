import { INSTALL_COMMAND, SKILL_COMMANDS, SKILLS, SKILLS_DOC_PATH } from '@/lib/mcp/skills'
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server'
import { registerSearchTool, registerSourceTools } from 'fumadocs-core/mcp'
import { createFromSource } from 'fumadocs-core/search/server'
import { z } from 'zod'

import { docsLlms, source } from '@/lib/source'

/** 与 GET 健康检查里的 tools 数组共用一份，免得加了工具忘了改自述 */
const TOOLS = ['list_pages', 'get_page', 'search', 'list_skills']
const SERVER_VERSION = '2.0.0'

/**
 * 文档站的 MCP Server（Streamable HTTP，无状态）。
 *
 * **三个通用工具直接用框架的**：`fumadocs-core/mcp` 的 `registerSourceTools`
 * （`list_pages` / `get_page`）与 `registerSearchTool`（`search`）——
 * 上游 `headless/utils/mcp.mdx` 就是这个写法，配 `npx @fumadocs/cli feature mcp`
 * 生成。从前这三个是自研的（工具名叫 `list_documents` / `get_document` /
 * `search_documents`，自己拼文档清单、自己按关键词过滤排序），等价但多了一份
 * 要跟着框架演进的实现。
 *
 * **`list_skills` 是本站独有的**，仍然自己注册：它给的是仓库里 `skills/`
 * 下的技能包清单与安装方式，框架没有这个概念。
 *
 * 传输层也不再手搓：`createMcpHandler` 要一个**工厂**，每次请求现造一个 server
 * （无状态模式，适合 Serverless），它自己处理协议版本协商、批处理与 2025/2026
 * 两代协议的差异。从前是 `new WebStandardStreamableHTTPServerTransport({
 * sessionIdGenerator: undefined })` + `server.connect()` 手接，v1 SDK 的写法。
 *
 * 依赖是 `@modelcontextprotocol/server@2`（旧包名 `@modelcontextprotocol/sdk`
 * 是 v1，`fumadocs-core/mcp` 的类型就指向新包）。
 */
const handler = createMcpHandler(() => {
  const mcp = new McpServer({ name: 'amagi-docs-mcp', version: SERVER_VERSION })

  // 页面清单与取页。`docsLlms` 就是 llms.txt / llms-full.txt 用的那个渲染器，
  // 所以 MCP 取到的正文与那两个文件里的一模一样
  registerSourceTools(mcp, source, docsLlms)
  // 搜索复用站内搜索的后端（`/api/search` 那个），中英文同一套分词
  registerSearchTool(mcp, createFromSource(source))

  // 逐页读文档之外的另一条路：把仓库里的技能装到本地，让技能自带的
  // `fetch_docs.mjs` 去认页、判版本口径、兜网络失败，比每次现编一串取页调用可靠。
  // 这里只给「有哪些技能、怎么装、能跑什么」，用法散文在 `SKILLS_DOC_PATH` 那一页上，
  // 同一段话不写两遍。
  mcp.registerTool(
    'list_skills',
    {
      description:
        '列出本仓库提供的 Agent Skills（技能包）及安装方式。适合在需要长期、反复查 amagi 文档时改用技能，而不是逐页调 get_page',
      inputSchema: z.object({})
    },
    async () => {
      const payload = {
        install: INSTALL_COMMAND,
        usageDoc: { path: SKILLS_DOC_PATH, hint: `用 get_page 取 /docs/${SKILLS_DOC_PATH} 的完整用法说明` },
        commands: SKILL_COMMANDS,
        skills: SKILLS
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] }
    }
  )

  return mcp
})

// POST 请求 - 处理 MCP 消息
export async function POST(request: Request) {
  return handler.fetch(request)
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

// DELETE 请求 - 无状态模式下没有会话可关
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
