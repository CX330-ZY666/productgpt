# ProductGPT Skill Intake

本文件用于沉淀 ProductGPT 内置 Skill 的候选池。当前阶段只做候选评估，不直接写入运行时代码。

## Intake 原则

- 不复制外部 Prompt 原文，只参考公开方法论、产品能力结构和常见工作流。
- 优先选择产品经理高频场景，而不是听起来高级但低频的框架。
- 每个 Skill 必须能把输入约束、分析方法、输出结构和质量规则说清楚。
- 每个 Skill 应能被 badcase 或样例集评测，避免只靠主观观感判断效果。
- 同一任务类型下允许多个 Skill，例如 `research` 下可以有通用调研、JTBD、Lean Canvas、北极星指标。

## 评分口径

| 维度 | 说明 | 1 分 | 3 分 | 5 分 |
|---|---|---|---|---|
| 场景高频度 | 用户在 PM 工作台中使用频率 | 偶发使用 | 常见但非核心 | 高频核心任务 |
| 方法论清晰度 | 是否有稳定步骤和判断框架 | 依赖经验 | 有框架但边界一般 | 步骤清晰、可复用 |
| 输入友好度 | 普通用户是否容易提供输入 | 输入门槛高 | 需要一定背景 | 少量信息即可启动 |
| 输出可用度 | 结果能否直接进入产品工作流 | 只能启发 | 需要二次整理 | 可直接推进讨论或交付 |
| 差异化 | 相比普通生成是否明显更强 | 普通提示词即可 | 有一定结构化价值 | 明显体现 PM 方法论 |
| 可评测性 | 是否容易设计评测样例和通过标准 | 难评测 | 可部分评测 | 可用结构和规则评测 |

总分低于 22 分不建议进入首批内置 Skill。

## 首批建议内置

| ID | Skill | TaskType | 分类 | 来源启发 | 高频 | 方法 | 输入 | 输出 | 差异 | 评测 | 总分 | 是否内置 |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `research-general` | 通用产品调研 | `research` | 调研 / 机会识别 | PM Prompt、Prompt Index、通用产品调研工作流 | 5 | 4 | 5 | 5 | 3 | 4 | 27 | 是 |
| `research-jtbd-opportunity` | JTBD 机会发现 | `research` | 调研 / 用户问题 | Jobs To Be Done、Opportunity Solution Tree | 5 | 5 | 4 | 5 | 5 | 5 | 29 | 是 |
| `research-lean-canvas` | Lean Canvas | `research` | 商业模式 / MVP | Lean Canvas | 4 | 5 | 4 | 5 | 4 | 5 | 28 | 是 |
| `research-north-star` | North Star Metric / 北极星指标 | `research` | 指标 / 增长 | North Star Metric、Amplitude 指标框架 | 4 | 5 | 3 | 5 | 5 | 5 | 27 | 是 |
| `competitor-mece-matrix` | MECE 竞品矩阵 | `competitor` | 竞品 / 结构化对比 | MECE、竞品矩阵、产品能力拆解 | 5 | 4 | 4 | 5 | 4 | 5 | 28 | 是 |
| `competitor-swot` | SWOT 竞品分析 | `competitor` | 竞品 / 战略判断 | SWOT | 4 | 4 | 5 | 4 | 3 | 4 | 26 | 是 |
| `feedback-kano` | KANO 反馈分类 | `feedback` | 反馈 / 需求分类 | Kano Model | 4 | 5 | 4 | 5 | 5 | 5 | 29 | 是 |
| `feedback-rice-prioritization` | RICE 优先级排序 | `feedback` | 反馈 / 优先级 | RICE、ICE | 5 | 5 | 4 | 5 | 5 | 5 | 29 | 是 |
| `prd-standard` | 标准 PRD | `prd` | PRD / 需求文档 | Productboard PRD Prompt、Aha PRD 模板、通用 PRD 工作流 | 5 | 4 | 5 | 5 | 4 | 5 | 29 | 是 |
| `prd-user-story-ac` | 敏捷 User Story / Acceptance Criteria | `prd` | 敏捷协作 / 验收标准 | User Story、Acceptance Criteria、Atlassian Agile 文档 | 5 | 5 | 5 | 5 | 5 | 5 | 30 | 是 |

## 候选详情

### 1. 通用产品调研

- `id`: `research-general`
- `taskType`: `research`
- `category`: 调研 / 机会识别
- `sourceInspiredBy`: PM Prompt、Prompt Index、通用产品调研工作流
- `inputGuide`: 输入产品想法、目标用户、业务背景、现有约束或想验证的问题。信息不足时也能先基于假设输出，并标注待补充信息。
- `method`: 先澄清产品方向，再拆解目标用户、使用场景、痛点、替代方案、机会点、MVP 范围、风险和验证方式。
- `outputStructure`: 方向理解、目标用户、核心场景、痛点与替代方案、机会点、MVP 建议、验证计划、风险、待补充问题。
- `qualityRules`:
  - 必须区分用户输入事实、合理推断和待验证假设。
  - MVP 建议必须能落到具体功能和验收标准。
  - 不编造市场规模、竞品数据和用户数量。
- `antiPatterns`:
  - 只给宏观结论，不给证据链。
  - 把调研写成营销文案。
  - 输出一长串无法排优先级的功能清单。
- `exampleInput`: 我想做一个面向独立开发者的 AI 产品经理助手，帮助他们从想法到 PRD。

### 2. JTBD 机会发现

- `id`: `research-jtbd-opportunity`
- `taskType`: `research`
- `category`: 调研 / 用户问题
- `sourceInspiredBy`: Jobs To Be Done、Opportunity Solution Tree
- `inputGuide`: 输入目标用户、场景、用户当前做法、遇到的问题、已有访谈片段或反馈。没有访谈时，先输出访谈问题和机会假设。
- `method`: 用 Job、Context、Struggle、Current Alternative、Desired Outcome 拆解用户任务，再把机会转成可验证的问题树。
- `outputStructure`: 核心 Job、触发场景、用户挣扎、现有替代方案、期望结果、机会树、验证问题、MVP 机会建议。
- `qualityRules`:
  - 需求表达必须从“用户要完成什么任务”出发，而不是从功能出发。
  - 每个机会点必须关联一个用户挣扎或期望结果。
  - 验证问题应能用于访谈、问卷或原型测试。
- `antiPatterns`:
  - 把 JTBD 写成普通用户画像。
  - 直接跳到功能方案，缺少任务和场景。
  - 把单个用户抱怨放大成确定需求。
- `exampleInput`: 内容运营经常用多个工具写选题、排期、生成草稿，希望有一个统一工作台。

### 3. Lean Canvas

- `id`: `research-lean-canvas`
- `taskType`: `research`
- `category`: 商业模式 / MVP
- `sourceInspiredBy`: Lean Canvas
- `inputGuide`: 输入产品方向、目标用户、问题、解决方案假设、商业模式或增长设想。适合早期项目从模糊想法进入可验证计划。
- `method`: 按 Problem、Customer Segments、Unique Value Proposition、Solution、Channels、Revenue Streams、Cost Structure、Key Metrics、Unfair Advantage 梳理。
- `outputStructure`: Lean Canvas 九宫格、关键假设、最高风险假设、验证实验、MVP 范围。
- `qualityRules`:
  - 每一格必须简洁明确，避免塞入长段泛泛描述。
  - 必须标出最高风险假设和优先验证顺序。
  - 关键指标要能被采集和解释。
- `antiPatterns`:
  - 把 Lean Canvas 写成商业计划书。
  - 不区分问题、方案和价值主张。
  - 用空泛词描述竞争优势。
- `exampleInput`: 我想做一个给跨境电商卖家的 AI 客服质检工具。

### 4. North Star Metric / 北极星指标

- `id`: `research-north-star`
- `taskType`: `research`
- `category`: 指标 / 增长
- `sourceInspiredBy`: North Star Metric、Amplitude 指标框架
- `inputGuide`: 输入产品类型、用户价值、核心行为、商业目标、当前阶段和可采集数据。适合定义主指标和配套输入指标。
- `method`: 先识别核心用户价值，再定义北极星指标、输入指标、反指标和阶段性指标，最后给出埋点与看板建议。
- `outputStructure`: 用户价值假设、北极星指标候选、推荐指标、输入指标树、反指标、阶段目标、埋点建议、风险。
- `qualityRules`:
  - 北极星指标必须同时反映用户价值和业务增长。
  - 输入指标必须能解释北极星指标变化。
  - 必须加入反指标，防止只追求数量造成体验损伤。
- `antiPatterns`:
  - 把 DAU、GMV 等通用指标直接当成北极星指标。
  - 只给指标名，不说明计算口径。
  - 忽略产品阶段差异。
- `exampleInput`: 一个 AI 写作工具，目标是提高用户持续创作和付费转化。

### 5. MECE 竞品矩阵

- `id`: `competitor-mece-matrix`
- `taskType`: `competitor`
- `category`: 竞品 / 结构化对比
- `sourceInspiredBy`: MECE、竞品矩阵、产品能力拆解
- `inputGuide`: 输入竞品名称、官网信息、功能截图、体验笔记、价格页或用户评价。信息不足时先搭建维度，不伪造竞品事实。
- `method`: 先定义互斥且尽量穷尽的对比维度，再按产品定位、目标用户、关键流程、功能能力、价格、商业模式、差异化、可借鉴点做矩阵。
- `outputStructure`: 分析目标、竞品概览、MECE 维度定义、竞品矩阵、差异洞察、机会点、不可盲目跟进项。
- `qualityRules`:
  - 对比维度不能重叠混乱。
  - 事实、推断和待验证信息必须分开。
  - 每个机会点都要说明来自哪一类差异。
- `antiPatterns`:
  - 简单罗列竞品功能，不解释差异原因。
  - 维度互相包含，导致重复比较。
  - 把未体验的信息写成确定事实。
- `exampleInput`: 对比 Notion AI、飞书妙记和腾讯文档智能助手，找个人知识管理场景机会。

### 6. SWOT 竞品分析

- `id`: `competitor-swot`
- `taskType`: `competitor`
- `category`: 竞品 / 战略判断
- `sourceInspiredBy`: SWOT
- `inputGuide`: 输入某个竞品或自身产品的背景、目标市场、能力、资源、竞争环境和用户反馈。适合做方向判断和策略讨论。
- `method`: 分别识别 Strengths、Weaknesses、Opportunities、Threats，并进一步给出 SO、WO、ST、WT 策略。
- `outputStructure`: 背景理解、SWOT 四象限、关键证据、策略组合、优先行动、风险。
- `qualityRules`:
  - 内部因素和外部因素必须区分清楚。
  - 每个判断都要有输入依据或说明待验证。
  - 策略建议不能停留在“加强优势”。
- `antiPatterns`:
  - 把所有内容都写成优劣势。
  - 缺少下一步策略组合。
  - 用宏观行业判断替代具体产品判断。
- `exampleInput`: 分析一个面向中小企业的 AI CRM 相比传统 CRM 的机会和风险。

### 7. KANO 反馈分类

- `id`: `feedback-kano`
- `taskType`: `feedback`
- `category`: 反馈 / 需求分类
- `sourceInspiredBy`: Kano Model
- `inputGuide`: 输入用户反馈、访谈记录、工单、评论或功能请求。适合把零散反馈分类成基本型、期望型、魅力型、无差异和反向需求。
- `method`: 基于反馈中的用户期望、满意/不满意触发条件和出现频率，将需求映射到 Kano 分类，并给出处理建议。
- `outputStructure`: 反馈概览、Kano 分类表、证据原文、优先处理建议、需要验证的问题、版本规划建议。
- `qualityRules`:
  - 分类必须引用或概括对应用户反馈证据。
  - 基本型需求不能因为“不新颖”而被低估。
  - 魅力型需求要评估成本和目标用户匹配度。
- `antiPatterns`:
  - 把所有“用户想要”都归为高优先级。
  - 忽略反向需求和无差异需求。
  - 只分类不提出产品动作。
- `exampleInput`: 用户反馈：导出经常失败、希望有 AI 总结、不要再弹推荐广告、希望能批量导入。

### 8. RICE 优先级排序

- `id`: `feedback-rice-prioritization`
- `taskType`: `feedback`
- `category`: 反馈 / 优先级
- `sourceInspiredBy`: RICE、ICE
- `inputGuide`: 输入一组需求、用户反馈、影响范围、预估工作量、信心程度或业务目标。信息不足时先输出待确认字段和粗略评分假设。
- `method`: 按 Reach、Impact、Confidence、Effort 评分，并计算优先级；必要时补充 ICE 或风险调整。
- `outputStructure`: 候选需求、RICE 评分表、评分依据、优先级排序、推荐路线图、待补充数据。
- `qualityRules`:
  - 每个分数必须说明依据。
  - 不能把模型评分当成绝对真理，需要标出低信心项。
  - Effort 必须体现研发、设计、数据、运营等成本。
- `antiPatterns`:
  - 只给排序，不给评分依据。
  - 对所有需求给相近分数，失去决策价值。
  - 忽略战略目标和依赖关系。
- `exampleInput`: 有 8 个用户反馈需求，需要排下个迭代优先级。

### 9. 标准 PRD

- `id`: `prd-standard`
- `taskType`: `prd`
- `category`: PRD / 需求文档
- `sourceInspiredBy`: Productboard PRD Prompt、Aha PRD 模板、通用 PRD 工作流
- `inputGuide`: 输入产品背景、用户问题、目标、方案、流程、约束和已有调研结论。适合生成可协作的 PRD 初稿。
- `method`: 将背景、目标、范围、用户流程、功能需求、非功能需求、埋点、依赖、风险、验收标准组织成工程可读文档。
- `outputStructure`: 文档信息、背景、目标、用户与场景、范围、用户流程、功能需求、非功能需求、数据埋点、边界与异常、风险依赖、验收标准、后续迭代。
- `qualityRules`:
  - 功能需求必须包含规则说明和验收标准。
  - 必须明确本版做什么和不做什么。
  - 涉及状态、权限、异常和边界条件时不能省略。
- `antiPatterns`:
  - 只有功能标题，没有规则和验收口径。
  - 把 PRD 写成愿景文档。
  - 不区分用户需求和系统实现。
- `exampleInput`: 为 ProductGPT 的“个人风格库”写一版 PRD。

### 10. 敏捷 User Story / Acceptance Criteria

- `id`: `prd-user-story-ac`
- `taskType`: `prd`
- `category`: 敏捷协作 / 验收标准
- `sourceInspiredBy`: User Story、Acceptance Criteria、Atlassian Agile 文档
- `inputGuide`: 输入功能想法、目标用户、用户目标、业务规则、边界条件和期望验收方式。适合把 PRD 拆成研发可执行条目。
- `method`: 用 As a / I want / So that 写用户故事，再补充 Given / When / Then 验收标准、优先级、依赖和边界场景。
- `outputStructure`: Epic、用户故事列表、验收标准、边界与异常、非功能要求、埋点建议、开放问题。
- `qualityRules`:
  - 用户故事必须表达用户目标，不只是功能动作。
  - 验收标准必须可测试，避免模糊词。
  - 必须覆盖正常路径、异常路径和权限/状态边界。
- `antiPatterns`:
  - 把任务清单伪装成用户故事。
  - 验收标准写成“体验良好”“响应快速”等不可测试描述。
  - 缺少失败场景。
- `exampleInput`: 用户可以上传历史文档并提取自己的写作风格，用于后续生成。

## 暂不内置候选

| ID | Skill | TaskType | 分类 | 来源启发 | 总分 | 暂缓原因 |
|---|---|---|---|---|---:|---|
| `research-opportunity-solution-tree` | Opportunity Solution Tree | `research` | 机会探索 / 实验设计 | Teresa Torres 连续发现方法 | 25 | 与 JTBD 机会发现重叠，首批可先合并进 JTBD Skill |
| `research-product-strategy-canvas` | Product Strategy Canvas | `research` | 战略 / 定位 | Product Strategy Canvas | 24 | 对早期用户输入要求更高，适合第二批 |
| `research-pre-mortem` | Pre-mortem 风险预演 | `research` | 风险 / 决策 | Pre-mortem | 23 | 很有价值但不是主流程入口，可作为后续增强 |
| `prd-decision-memo` | Decision Memo | `prd` | 决策文档 | RFC / Decision Memo | 23 | 更偏组织协作，当前工作台核心还在生成 PRD 和分析 |
| `competitor-positioning-map` | 定位图分析 | `competitor` | 竞品 / 战略定位 | Positioning Map | 21 | 评测性和输入质量要求较高，低于首批阈值 |

## 后续落地建议

1. 先用本文档稳定候选名称、ID、分类和评分。
2. 新增 `data/skill-candidates.ts`，用结构化数据承载 intake 表，字段可包含 `score`、`included`、`rationale`。
3. 升级 `ProductSkill` 类型，使 `id` 从 `TaskType` 改为 string，并新增 `taskType`、`category`、`sourceInspiredBy`、`method`、`exampleInput`。
4. 将 `getProductSkill(taskType)` 改为 `getProductSkills(taskType)` 和 `getProductSkillById(skillId)`。
5. 让 `/api/generate` 接收 `skillId`，没有传入时回退到该任务的默认 Skill。
6. 工作台中把“内置 Skills”从任务快捷入口改成同一任务下的 Skill 选择器。
7. 为每个首批 Skill 增加 1-2 条 eval 样例，覆盖结构完整性、事实约束和输出可用度。

## 参考来源

- PM Prompt: https://pmprompt.com/
- Productboard PRD Prompt: https://www.productboard.com/product-management-prompts-library/prd-generator/
- SuperPM: https://www.superpm.app/
- Prompt Index: https://promptindex.org/
- PM-Skills MCP: https://mcpmarket.com/server/pm-skills
- Jobs To Be Done: https://jobs-to-be-done.com/
- Lean Canvas: https://leanstack.com/lean-canvas
- North Star Metric: https://amplitude.com/blog/north-star-metric
- RICE Prioritization: https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/
- Kano Model: https://www.productplan.com/glossary/kano-model/
- User Stories: https://www.atlassian.com/agile/project-management/user-stories
- Acceptance Criteria: https://www.atlassian.com/work-management/project-management/acceptance-criteria
- PRD Template: https://www.aha.io/roadmapping/guide/requirements-management/what-is-a-good-product-requirements-document-template
