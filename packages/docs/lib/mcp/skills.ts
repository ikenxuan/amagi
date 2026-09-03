import type { SkillManifest } from './types'

/**
 * 仓库根 `skills/` 下两个技能包的清单。
 *
 * 为什么 MCP 要知道技能的存在：接了这个 MCP 的编码代理，除了逐页拉文档，还可以直接把
 * 技能装到本地——技能里那个 `fetch_docs.mjs` 会自己认页、自己判版本口径、自己兜网络失败，
 * 比代理每次现编一串 `get_document` 调用可靠。所以 `list_skills` 只回答一件事：
 * **有哪两个技能、怎么装、装完能跑哪些命令**。
 *
 * 这里只放「装与跑」这类不会天天变的事实；用法散文写在文档站的 `/docs/v7/ai` 页上，
 * 由 `get_document('v7/ai')` 取 —— 同一段话不写两遍，那是最容易烂掉的一种重复。
 */
export const SKILLS: SkillManifest[] = [
  {
    name: 'amagi',
    purpose:
      '用 @ikenxuan/amagi v7 写代码或给它提 PR：装包建实例、读 AmagiResult 信封、调四平台接口、启 HTTP 服务、接事件总线，以及贡献者要看的架构与流程',
    directory: 'skills/amagi',
    topics: [
      'start',
      'install',
      'getting-started',
      'sdk',
      'types',
      'http',
      'events',
      'utilities',
      'api-http',
      'sdk-douyin',
      'sdk-bilibili',
      'sdk-kuaishou',
      'sdk-xiaohongshu',
      'architecture',
      'add-api',
      'contributing',
      'ai'
    ]
  },
  {
    name: 'migration-to-v7',
    purpose: '把项目从 amagi v6 升到 v7：四处必改、AmagiResult 信封读法、typeMode 已移除、事件总线改实例级，以及要不要走 /compat',
    directory: 'skills/migration-to-v7',
    topics: ['migration', 'envelope', 'sdk', 'events', 'http', 'v6-baseline', 'v5-to-v6']
  }
]

/** 装技能的命令。skills.sh 按 `owner/repo` 安装，两个技能都在这个仓库里 */
export const INSTALL_COMMAND = 'npx skills add ikenxuan/amagi'

/** 技能装好后可用的子命令（两个技能一致） */
export const SKILL_COMMANDS = [
  { command: 'doctor', description: '探活：Node 版本、站点可达性、索引条数、文档站是否已分版' },
  { command: 'list', description: '每个主题在当下的站点索引里认到了哪一页' },
  { command: 'get <主题|路径>', description: '取一页 Markdown；主题按标题特征认页，也可直接给 /docs/... 路径' },
  { command: 'bundle [主题...]', description: '按顺序取一组页面拼成一份' },
  { command: 'index', description: '打印站点全量页面清单（路径 + 标题）' },
  { command: 'search <关键词>', description: '在索引的标题与路径里找页' }
]

/** 文档站上讲技能用法的那一页（MCP 的 `get_document` 直接可取） */
export const SKILLS_DOC_PATH = 'v7/ai'
