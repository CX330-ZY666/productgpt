# ProductGPT

AI Product Manager Workspace for research, competitor analysis, feedback analysis and PRD drafting.

ProductGPT 是一个面向产品经理的本地优先 AI 工作台。它把产品经理常用的文档生成流程沉淀成可复用 Skill，并支持用户导入自己的 Skill、保存本地历史、查看生成策略和进行二次修改。

Repository: https://github.com/CX330-ZY666/productgpt

> 当前项目是个人学习与作品集项目，默认面向本地使用，不依赖账号系统和数据库。

## Why ProductGPT

你当然可以直接用 ChatGPT、Claude 或其它大模型聊天工具写文档。ProductGPT 想解决的是另一类问题：

- 常用 PM 工作流需要被固定下来，而不是每次重新写 Prompt。
- 生成文档需要可追溯，用户要知道本次用了什么 Skill、参数和输入信息。
- 好的 PM Skill 应该可以被用户导入、沉淀、复用，而不是散落在收藏夹里。
- 生成后的文档通常需要持续修改，所以要支持全文修改、局部修改和历史记录。
- 第一版不强依赖云端数据库，适合作为个人本地工具和作品集项目。

## Features

- **Built-in PM Skills**：内置产品调研、竞品分析、用户反馈分析、PRD 生成四类系统默认 Skill。
- **Custom Skill Library**：支持从参考文档提取 Skill，也支持导入现成 Skill 并结构化解析。
- **Unified Input Flow**：按当前 Skill 填写输入信息，可追加资料、网页 URL、其它说明和参数。
- **Prompt Transparency**：展示本次使用的 Skill、参数配置、输入信息和用户可见 Prompt 预览。
- **Document Revision**：支持全文修改和选中片段局部修改，并记录修改前后差异。
- **Local History**：使用浏览器本地存储保存生成记录、修改记录和用户自建 Skill。
- **Local Backup**：支持导出和导入本地数据 JSON。
- **Web Source Fetching**：支持抓取公开网页正文；登录页、强动态页面或反爬页面可能失败。
- **Markdown / PDF**：支持 Markdown 源码、复制、导出 Markdown 和打印为 PDF。

## Who Is It For

适合：

- 产品经理、产品实习生、AI 产品经理
- 独立开发者和需要快速整理产品文档的人
- 想把常用 PM Prompt / Skill 固化成工具的人
- 想研究 AI 文档生成、Prompt 透明化和本地数据工作流的人

暂时不适合：

- 需要团队账号、权限和多人协作的生产环境
- 需要云端数据库和跨设备同步的场景
- 需要抓取登录态网页、企业内部文档或强反爬平台的场景

## Examples

不用运行项目，也可以先看这几个示例了解输出形态：

- [竞品分析：AI 文档工具对比](docs/examples/competitor-analysis-ai-doc-tools.md)
- [PRD：大学生 AI 学习助手](docs/examples/prd-ai-study-assistant.md)
- [用户反馈分析：学习 App 评论整理](docs/examples/feedback-analysis-app-store-reviews.md)

## Screenshots

建议上传 GitHub 后补充 3-5 张截图到 `public/screenshots/`，再在这里展示：

- 工作台：选择 Skill、填写输入信息和参数。
- 用户 Skill 库：按文档类型管理用户自建 Skill。
- 生成策略：展示本次生成使用的 Skill、参数和用户可见 Prompt。
- 二次修改：全文修改、选中片段修改和修改记录。

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn 风格 UI 组件
- DeepSeek Chat API
- IndexedDB / localStorage 本地存储

## Quick Start

安装依赖：

```bash
npm install
```

复制环境变量示例：

```bash
cp .env.example .env.local
```

在 `.env.local` 中配置：

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key
```

启动开发服务：

```bash
npm run dev
```

打开：

```text
http://localhost:3000/workspace
```

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Local Data

ProductGPT 第一版不做登录、数据库和云端同步，以下数据保存在浏览器本地：

- 历史生成记录
- 修改记录
- 用户自建 Skill
- 当前选中的用户 Skill
- 新用户引导关闭状态

清理浏览器数据会导致这些本地数据丢失。可以在工作台的本地设置中导出备份 JSON。

## Web Fetching Limits

网页抓取只处理公开可访问的静态网页或服务端渲染页面。以下类型通常无法稳定抓取：

- 飞书、知乎、小红书、公众号等登录或反爬限制页面
- 需要浏览器执行大量 JavaScript 才能显示正文的页面
- 需要权限、Cookie、企业账号或付费访问的页面

遇到失败时，可以复制网页正文到输入信息中，或整理为 txt/md 后导入用户 Skill 库。

## Project Structure

```text
app/                     Next.js 页面与 API 路由
app/workspace/           产品经理工作台
app/api/                 生成、修改、网页抓取、Skill 解析接口
components/ui/           UI 基础组件
data/                    示例与候选 Skill 数据
docs/                    Skill 研究、评测、badcase 和来源说明
lib/                     Prompt、Skill、存储、Markdown 等核心逻辑
```

## Roadmap

- [ ] 补充 README 截图和短动图
- [ ] 部署可体验 Demo
- [ ] 增加更多高质量系统默认 Skill
- [ ] 增强用户自建 Skill 的编辑体验
- [ ] 增加更多导出格式
- [ ] 探索可选的云端同步和多人协作

## Security

不要提交 `.env.local` 或任何真实 API Key。仓库只提交 `.env.example` 作为配置示例。

当前 `.gitignore` 已忽略：

- `.env.local`
- `.next/`
- `node_modules/`
- 本地日志文件

## Credits

部分内置产品能力参考并改写自 Dean Peters 的公开仓库：

- https://github.com/deanpeters/Product-Manager-Skills

授权与来源说明见 [docs/credits.md](docs/credits.md)。

## License

本项目代码采用 [MIT License](LICENSE)。

注意：部分内置产品能力参考并改写自第三方公开 Skill，来源与授权说明见 [docs/credits.md](docs/credits.md)。如果未来涉及商业化，需要重新审查内置 Skill 来源与授权边界，或重写为完全自研版本。
