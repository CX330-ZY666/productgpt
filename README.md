# ProductGPT

面向产品经理的 AI 工作台。ProductGPT 聚焦产品调研、竞品分析、用户反馈分析和 PRD 初稿生成，支持系统默认 Skill、用户自建 Skill、本地历史记录、网页资料抓取、生成策略透明化和二次修改。

当前项目是个人学习与作品集项目，默认面向本地使用，不依赖账号系统和数据库。

Repository: https://github.com/CX330-ZY666/productgpt

## 功能亮点

- 系统默认 Skill：内置产品调研、竞品分析、用户反馈分析、PRD 生成四类能力。
- 用户自建 Skill：支持从参考文档提取 Skill，也支持导入现成 Skill 并结构化解析。
- 统一输入流程：按当前 Skill 填写输入信息，可补充资料、网页 URL、其它说明和参数。
- 生成策略透明化：展示本次使用的 Skill、参数配置、输入信息和用户可见 Prompt 预览。
- 二次修改：支持全文修改和选中片段局部修改，并记录修改前后差异。
- 本地历史记录：使用浏览器本地存储保存生成记录、修改记录和用户 Skill。
- 本地数据备份：支持导出和导入本地数据 JSON。
- 网页资料抓取：支持抓取公开网页正文；登录页、强动态页面或反爬页面可能失败。
- Markdown / PDF：支持查看 Markdown 源码、复制、导出 Markdown 和打印为 PDF。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn 风格 UI 组件
- DeepSeek Chat API
- IndexedDB / localStorage 本地存储

## 本地运行

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

## 常用命令

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## 数据说明

ProductGPT 第一版不做登录、数据库和云端同步，以下数据保存在浏览器本地：

- 历史生成记录
- 修改记录
- 用户自建 Skill
- 当前选中的用户 Skill
- 新用户引导关闭状态

清理浏览器数据会导致这些本地数据丢失。可以在工作台的本地设置中导出备份 JSON。

## 网页抓取限制

网页抓取只处理公开可访问的静态网页或服务端渲染页面。以下类型通常无法稳定抓取：

- 飞书、知乎、小红书、公众号等登录或反爬限制页面
- 需要浏览器执行大量 JavaScript 才能显示正文的页面
- 需要权限、Cookie、企业账号或付费访问的页面

遇到失败时，可以复制网页正文到输入信息中，或整理为 txt/md 后导入用户 Skill 库。

## 目录结构

```text
app/                     Next.js 页面与 API 路由
app/workspace/           产品经理工作台
app/api/                 生成、修改、网页抓取、Skill 解析接口
components/ui/           UI 基础组件
data/                    示例与候选 Skill 数据
docs/                    Skill 研究、评测、badcase 和来源说明
lib/                     Prompt、Skill、存储、Markdown 等核心逻辑
```

## 发布前检查

```bash
npm run lint
npm run build
```

确认不要提交：

- `.env.local`
- API Key
- `.next/`
- `node_modules/`
- 本地日志文件

## Credits

部分内置产品能力参考并改写自 Dean Peters 的公开仓库：

- https://github.com/deanpeters/Product-Manager-Skills

授权与来源说明见 [docs/credits.md](docs/credits.md)。

## License

当前仓库尚未指定开源许可证。发布前请根据使用目标选择合适许可证；如果未来涉及商业化，需要重新审查内置 Skill 来源与授权边界。
