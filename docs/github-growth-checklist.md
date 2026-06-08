# GitHub Growth Checklist

这份清单用于把 ProductGPT 从“代码仓库”包装成更容易被理解、收藏和试用的开源项目。

## Repository About

建议仓库 Description：

```text
AI product manager workspace with built-in PM skills, custom skill import, prompt transparency, local history and document revision.
```

建议 Website：

```text
https://github.com/CX330-ZY666/productgpt
```

## Topics

建议添加：

```text
ai
product-management
product-manager
prd
prompt-engineering
nextjs
deepseek
competitive-analysis
local-first
ai-workspace
```

## README Screenshots

建议补 4 张图：

1. `workspace.png`：工作台，展示生成能力、输入信息、参数配置和结果区。
2. `custom-skill-library.png`：用户 Skill 库，展示按文档类型分类。
3. `prompt-transparency.png`：生成策略 Tab，展示 Skill、参数和 Prompt 预览。
4. `revision-diff.png`：二次修改记录，展示修改前后差异。

建议存放路径：

```text
public/screenshots/
```

## Launch Copy

可以用于朋友圈、即刻、掘金或 V2EX：

```text
我做了一个给产品经理用的 AI 工作台 ProductGPT。

它不是单纯把 Prompt 塞进聊天框，而是把产品调研、竞品分析、用户反馈分析和 PRD 生成整理成固定工作流：

- 内置 PM Skill
- 支持导入自己的 Skill
- 展示本次生成策略和 Prompt 预览
- 支持本地历史记录
- 支持全文修改和选中片段修改

项目目前是本地优先版本，不需要数据库，配置 DeepSeek API Key 就能跑。

GitHub:
https://github.com/CX330-ZY666/productgpt
```

## Good First Issues

可以后续在 GitHub Issues 里拆成这些任务：

- Add README screenshots
- Add Vercel demo deployment guide
- Improve custom Skill editor
- Add more built-in PM Skills
- Add English README
- Add export to DOCX
- Improve web fetching fallback UI

## Do Not Publish

发布前再次确认不要提交：

- `.env.local`
- 真实 API Key
- 本地日志文件
- `.next/`
- `node_modules/`
