# ProductGPT Skill Source Review

本文件用于把成熟 Prompt 产品和公开 PM 方法论拆解为 ProductGPT 自己的 Skill 能力结构。当前只评审 `prd-standard`，不改页面、不改 API、不改运行时代码。

## 版权与采用边界

- 不复制外部 Prompt 原文。
- 不复刻外部完整模板表达。
- 只提炼抽象能力结构、输入模式、工作流、输出章节和质量控制点。
- ProductGPT 的 Runtime Skill 必须用自己的语言重写，并适配当前 `taskType`、动态参数、个人风格注入和 Markdown 输出链路。

## Skill: `prd-standard`

| 字段 | 内容 |
|---|---|
| TaskType | `prd` |
| 目标 | 把产品背景、用户问题、目标、范围、规则、流程、风险和验收标准转成工程可协作的 PRD 初稿 |
| 本轮评审目标 | 找出成熟 PRD Prompt 和公开 PRD 方法论中可复用的能力结构 |
| 本轮不做 | 不直接生成 Runtime Prompt；不接入 `/api/generate`；不替换现有 `lib/skills.ts` |

## 来源评审表

| source | sourceType | usableIdeas | inputPattern | workflowPattern | outputPattern | qualityPattern | risks | adoptionDecision |
|---|---|---|---|---|---|---|---|---|
| [Productboard PRD Generator](https://www.productboard.com/product-management-prompts-library/prd-generator/) | Prompt 产品结构参考 | 强调工作区上下文、战略目标、目标用户、OKR、范围、非目标、权衡、依赖、上线和回滚 | 产品/功能、用户问题、目标用户、当前状态、成功指标、why now、研究证据、竞品、 deadline、团队容量、技术约束、范围内/外 | 先做上下文检查，再补齐核心输入，再生成完整 PRD | Executive Summary、problem、goals、metrics、user stories、solution overview、requirements、edge cases、open questions、dependencies、launch plan | 工程可读、权衡明确、非目标明确、边界和错误状态明确 | 公开页面包含完整 Skill 文本，不能复制原文；部分字段偏成熟团队，独立开发者输入可能不足 | 采用结构思想，不采用原文；重点吸收“上下文检查、非目标、边界、依赖、上线/回滚” |
| [PM Prompt](https://pmprompt.com/) | Prompt 产品结构参考 | 提供 PM 工作流分类，PRD、User Story、Feature Breakdown、BRD Validator 等能力可组合 | 通常按产品规划、发现、执行、分析等任务入口选择 Prompt | 以任务类型组织 Prompt，让用户从具体工作流进入 | 输出以对应 PM 交付物为中心，例如 PRD、用户故事、竞品矩阵 | 强调不同 PM 场景的专门化，而不是一个通用 Prompt 解决全部问题 | 页面可见更多是目录和产品定位，不足以支撑详细 PRD 模板 | 采用“PRD + User Story + Feature Breakdown 可组合”的能力拆分思想 |
| [PM Prompts](https://www.pmprompts.net/) | Prompt 产品结构参考 | 强调免费 PM Prompt 库和真实工作场景优化，可作为分类参考 | 用户按 PM 任务选择 Prompt，例如 PRD 写作、需求拆解、沟通等 | 以“常见 PM 工作任务 -> Prompt”组织 | 输出通常是可直接用于 PM 工作的结构化文档 | 强调节省时间和现实可用性 | 可公开信息偏营销描述，不能作为详细模板来源 | 只采用“面向真实 PM 工作场景”的分类思路 |
| [SuperPM](https://www.superpm.app/) | Prompt 产品结构参考 | 覆盖 PRD Generator、Strategy、Stress Test 等产品管理用例 | 用户选择具体 prompt/use case | 以高频 PM 工作为入口，偏工具化 | 输出以交付物为中心 | 使用量信息可作为高频场景信号 | 页面可用细节有限，不能推断其内部 prompt | 采用“PRD 是高频核心用例”的优先级判断 |
| [PM-Skills MCP](https://mcpmarket.com/server/pm-skills) | 能力覆盖参考 | 适合参考 Product Manager skill server 的能力覆盖面，而非具体 Prompt | 可能围绕 PM 专项任务暴露工具/Skill | 以可调用能力而不是单次 prompt 组织 | 输出取决于具体能力 | 提醒 ProductGPT 后续可从 Prompt Library 走向 Skill Library | 来源细节和授权需要进一步核对，不直接搬能力定义 | 只作为能力地图参考，暂不采用具体内容 |
| [Aha PRD Template](https://www.aha.io/roadmapping/guide/requirements-management/what-is-a-good-product-requirements-document-template) | PM 方法论参考 | PRD 应说明在构建什么、为谁构建、为什么构建；不是所有工作都需要完整 PRD | 产品/功能、目标用户、目的、需求细节 | 根据复杂度决定 PRD 详细程度 | 目标、用户、需求、范围等 | 强调对齐团队，细节重要时模板才有价值 | Aha 是工具厂商内容，模板表达不能复制 | 采用“轻重分级”和“what/who/why”原则 |
| [Atlassian User Stories](https://www.atlassian.com/agile/project-management/user-stories) | PM 方法论参考 | User Story 需要表达用户、目标和原因，并通常包含验收标准 | 用户类型、目标、原因、验收标准 | 从用户视角描述价值，再让团队围绕它讨论实现 | As a / I want / so that、验收标准 | 强调用户价值和可测试性 | 标准格式容易被机械套用，导致所有需求都像模板句 | 采用用户价值表达原则，不强制每条需求都必须套固定句式 |
| [Atlassian Acceptance Criteria](https://www.atlassian.com/work-management/project-management/acceptance-criteria) | PM 方法论参考 | 验收标准应清晰、可测、结果导向、可衡量、相互独立 | 用户故事、完成条件、成功标准 | 在规划阶段定义完成条件，减少歧义 | 可测试条件、成功/失败边界、Definition of Done | 强调减少歧义，帮助工程和 QA 判断是否完成 | 如果过度细化，可能把实现方式写死 | 采用“可测试、结果导向、边界清晰”的验收标准规则 |

## ProductGPT `prd-standard` Skill 蓝图

### 输入字段

- 产品/功能名称：用户正在构建什么。
- 用户问题：要解决的痛点，而不是直接写解决方案。
- 目标用户：用户细分、角色、使用场景。
- 当前状态：已有流程、反馈、数据、替代方案或约束。
- 成功标准：可衡量指标、验收目标或业务结果。
- 范围：本版做什么、不做什么。
- 约束：时间、团队、技术、数据、安全、合规、成本。
- 证据：用户研究、反馈、竞品观察、历史决策。
- 协作信息：设计、研发、数据、运营或业务依赖。

### 生成步骤

1. 先识别输入中已有事实、合理推断和缺失信息。
2. 如果关键信息不足，仍生成 PRD 初稿，但必须标注假设和待补充问题。
3. 先写清楚 `why` 和 `what`，再写范围、流程、规则和验收标准。
4. 对每个核心需求补充边界、异常、依赖和验收口径。
5. 将不确定项收敛到开放问题，避免伪装成确定结论。
6. 最后输出适合 PM、研发、设计、测试共同阅读的 Markdown 文档。

### 输出结构

```md
# PRD 初稿

## 1. 文档信息
## 2. TL;DR
## 3. 背景与问题
## 4. 目标用户与场景
## 5. 产品目标与成功指标
## 6. 范围
### 6.1 本版包含
### 6.2 本版不包含
## 7. 用户流程
## 8. 功能需求
## 9. 业务规则与边界条件
## 10. 非功能需求
## 11. 数据埋点与观测指标
## 12. 依赖与风险
## 13. 验收标准
## 14. 开放问题
## 15. 后续迭代建议
```

### 质量规则

- 必须区分事实、推断、假设和待确认问题。
- 必须明确本版做什么和不做什么。
- 功能需求不能只有功能名，必须包含规则、边界和验收口径。
- 验收标准必须可测试，避免“体验好”“足够快”等模糊表达。
- 不提前替研发决定具体实现方案，除非用户输入中已经给出技术约束。
- 涉及权限、状态、失败路径、异常输入、数据安全时必须显式写出。
- 输出必须适合 Markdown 阅读和导出。

### 反模式

- 把 PRD 写成愿景文档或营销文案。
- 只生成章节标题，不填充可执行内容。
- 编造用户研究、指标、竞品事实或团队资源。
- 把所有需求都写成同等优先级。
- 把不确定问题写成确定结论。
- 过度套用 User Story 句式，导致文档冗长但信息密度低。

### 信息不足时的处理方式

- 缺少目标用户：基于输入暂定用户分组，并在开放问题中要求确认。
- 缺少成功指标：先给出 2-3 个候选指标和推荐口径。
- 缺少范围：根据 MVP 原则提出默认范围，并明确标为假设。
- 缺少技术约束：不编造实现细节，只列出研发需要确认的问题。
- 缺少研究证据：用“待验证假设”表达，不写成已验证事实。

### 评测样例

| case | input | expectedChecks |
|---|---|---|
| `prd-style-library` | 为 ProductGPT 的个人风格库写 PRD：用户可以上传历史文档，提取写作风格，并在生成时使用个人风格。 | 包含范围内/外、上传边界、风格提取失败处理、生成链路影响、验收标准、开放问题 |
| `prd-feedback-import` | 做一个用户反馈导入功能，支持粘贴评论和上传 CSV，系统自动分类并生成优先级建议。 | 区分输入格式、异常数据、分类规则、RICE/KANO 可选逻辑、数据埋点、验收标准 |
| `prd-vague-idea` | 我想做一个 AI 需求助手，让团队写 PRD 更快。 | 明确假设、补充问题、候选用户、MVP 范围，不编造具体指标和研究结论 |

## 下一步

下一轮可以把这份蓝图转成 ProductGPT 自己的 `prd-standard` Runtime Skill，放入 `lib/skills.ts` 或独立 Skill runtime 数据结构中。接入时应保留当前默认 PRD 行为的兼容回退，并用以上评测样例检查输出质量。
