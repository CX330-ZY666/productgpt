# PRD Prompt Deep Review

本文件记录 `prd-standard` 的公开 Prompt 深度分析。目标是理解成熟 Prompt 的设计意图，再重写为 ProductGPT 自己的 Runtime Skill。本文只做结构提炼，不复制外部 Prompt 原文。

## Review 边界

- 只分析公开可访问页面。
- 不把外部 Prompt 原文整段复制进 ProductGPT。
- 只保留能力结构、控制点、输出策略和风险判断。
- Runtime Skill 使用 ProductGPT 自己的中文表达，并适配当前工作台的 `taskType`、动态参数、个人风格和 Markdown 输出。

## 来源清单

| Source | 类型 | 可见程度 | 本轮用途 |
|---|---|---|---|
| Productboard PRD Generator | 成熟 PM Prompt / Skill | 页面公开展示较完整 Skill template | 学习上下文检查、输入收集、工程可读 PRD、权衡、非目标、上线和回滚 |
| Engify PRD Generator | 公开 Prompt 模板 | 页面公开展示完整 prompt template | 学习通用 PRD 章节覆盖、设计/UX、技术考虑、Go-to-market、里程碑 |
| 郑奘巍 PRD 撰写 | 中文 Prompt 指南 | 页面公开展示完整中文提示词 | 学习中文工程协作语境、PRD 作为可执行契约、交互/逻辑/验收细化 |
| ClaudSkills To PRD | 公开 Skill 页面 | 页面展示概要和 GitHub 来源 | 学习 agent 场景下“基于已有上下文合成，不反复访谈用户”的原则 |
| PM Prompt | 产品能力结构 | 公开展示能力目录，不展示完整 PRD prompt | 学习 Prompt / Skill / Workflow 分层，以及个性化上下文能力 |

## 逐段能力提炼

### 1. 上下文与输入控制

成熟 PRD Prompt 普遍会在生成前要求补齐产品策略、目标用户、成功指标、当前状态、研究证据、约束和范围。Productboard 的特点是先查 workspace context，再缺什么问什么；Engify 更像通用模板，列出 PRD 应覆盖的问题；PM Prompt 强调“产品上下文只描述一次，后续文档继承上下文”。

ProductGPT 采用方式：

- 不在 Runtime Skill 里停下来反问用户，因为当前工作台是一次生成流程。
- 在输出中显式标注“事实 / 合理推断 / 待验证假设 / 开放问题”。
- 当输入缺失时，给出默认假设和待补充字段，而不是伪造确定信息。

### 2. PRD 定位

公开 Prompt 的共同点是：PRD 不是愿景文档，而是让产品、设计、研发、测试可以协作执行的交付物。中文 PRD Prompt 特别强调 PRD 是“可执行契约”，不仅要说明做什么，还要说明交互、流程、业务逻辑和验收方式。

ProductGPT 采用方式：

- 在 `method` 中强调先写 `why / what`，再写流程、规则、边界和验收。
- 在质量规则中禁止愿景化、营销化、不可测试表达。
- 输出结构中保留功能需求、业务规则、边界条件、验收标准和开放问题。

### 3. 输出结构

Productboard 更强调工程团队信任 PRD：TL;DR、problem、goals、user stories、solution、functional / non-functional requirements、edge cases、open questions、dependencies、launch plan。Engify 覆盖更广：overview、problem、metrics、personas、solution、requirements、design/UX、technical considerations、launch、timeline。中文 Prompt 更强调里程碑、不可发布条件、功能模块下的交互流程、业务逻辑、异常处理、QA 验收计划。

ProductGPT 采用方式：

- 保留目前已验证有效的 `TL;DR / 背景与问题 / 用户场景 / 目标指标 / 范围 / 流程 / 功能需求 / 边界 / NFR / 埋点 / 风险 / 验收 / 开放问题 / 后续迭代`。
- v2 增加 `交付计划与上线策略`，覆盖里程碑、上线方式、回滚条件和上线后观测。
- 不把 PRD 变成技术设计文档，只列技术协作要点和待确认问题。

### 4. 功能需求颗粒度

强 Prompt 不只让模型列功能，还要求每条需求包含用户视角、交互流程、系统反馈、状态变化、业务规则、异常处理和验收方式。这一点是普通“生成 PRD”最容易缺失的地方。

ProductGPT 采用方式：

- 功能需求表不只保留模块和规则，还要求“用户价值、交互/状态、边界/异常、验收标准”。
- 对失败路径、权限、状态、异常输入、数据安全单独要求显式写出。
- 禁止把所有需求写成同等优先级。

### 5. 验收与测试

Productboard、Engify 和中文 PRD Prompt 都强调可测试要求。中文 Prompt 额外强调通过/不通过标准、测试范围、上线前门槛和上线后观察指标。

ProductGPT 采用方式：

- 验收标准使用 `Given / When / Then`。
- 新增 `QA 与上线验收计划`，让 PRD 从“需求说明”进一步接近“可交付计划”。
- 质量规则要求避免“体验好”“足够快”等模糊表达。

### 6. 上线、风险与回滚

Productboard 的 launch plan 和 rollback criteria 很适合产品团队真实协作。中文 Prompt 里的不可发布条件也很有用。

ProductGPT 采用方式：

- 新增上线方式、灰度/全量、监控指标、回滚条件。
- 风险表保留影响、缓解方式和待确认方。
- 不编造团队成员和具体日期；缺失时标为待确认。

## ProductGPT PRD Runtime Skill v2 决策

| 能力点 | 采用方式 |
|---|---|
| 上下文检查 | 不阻塞生成；转成事实/假设/开放问题 |
| 成功指标 | 输出候选指标和验证方式，避免编造当前值 |
| 非目标 / Out of scope | 必须保留，且写原因 |
| 需求颗粒度 | 功能需求必须覆盖用户价值、规则、状态、异常和验收 |
| 交付计划 | 新增里程碑、不可发布条件、上线策略 |
| 上线与回滚 | 新增观测指标和回滚触发条件 |
| 技术考虑 | 只写协作要点和待确认，不写技术设计 |
| 输出格式 | 直接输出 Markdown 正文；禁止寒暄；表格行必须独占一行 |

## 下一步验证样例

| case | input | 重点检查 |
|---|---|---|
| `prd-skill-market` | 为 ProductGPT 的 Skills 市场写一版 PRD：用户可以浏览内置 Skills，查看适用场景，并选择一个 Skill 用于生成。 | 是否有范围、交付计划、选择器边界、默认回退、验收标准、上线观测 |
| `prd-style-library` | 为 ProductGPT 的个人风格库写 PRD：用户可以上传历史文档，提取写作风格，并在生成时使用个人风格。 | 是否有上传限制、提取失败、个人风格开关、生成链路影响、隐私风险 |
| `prd-vague` | 我想做一个 AI 需求助手，让团队写 PRD 更快。 | 是否标注假设，不编造指标，给 MVP 范围和开放问题 |

## 参考链接

- Productboard PRD Generator: https://www.productboard.com/product-management-prompts-library/prd-generator/
- Engify PRD Generator: https://www.engify.ai/prompts/product-requirements-document-prd-generator
- 郑奘巍 PRD 撰写: https://www.zangwei.dev/zh/prompts/product-execution/product-requirements-document-prd-prompt
- ClaudSkills To PRD: https://claudskills.com/skills/to-prd/
- PM Prompt: https://pmprompt.com/
