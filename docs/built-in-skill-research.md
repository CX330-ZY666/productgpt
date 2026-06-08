# Built-In Skill Research

本文记录 ProductGPT 第一版内置 Skill 的来源、采用方式和适配边界。

## 采用原则

- 每个文档类型只内置一个默认 Skill，避免主流程变成复杂的 Skill 市场。
- 不把外部 Skill 原文直接作为运行时 Prompt，而是提炼方法论、输入判断、输出结构和质量规则。
- 交互型 Skill 暂时转成“补充问题、待确认项、验证计划”，不做复杂多轮对话。
- 输出必须适配中文 PM 文档、Markdown 导出、风格模板注入和生成策略透明化。

## 来源

主要参考：

- https://github.com/deanpeters/Product-Manager-Skills

采用的 8 个高相关 Skill：

| Source Skill | 核心价值 | ProductGPT 采用方式 |
|---|---|---|
| `problem-statement` | 先澄清用户问题，避免直接讨论方案 | 融入产品调研、用户反馈分析、PRD 背景与问题 |
| `discovery-interview-prep` | 访谈前明确目标、用户分群、限制和反偏误 | 融入产品调研中的待补充问题与验证建议 |
| `jobs-to-be-done` | 把功能诉求还原成用户任务、痛点和期望结果 | 融入产品调研和用户反馈分析 |
| `pol-probe` | 用轻量、一次性、窄范围实验验证高风险假设 | 融入产品调研的 Proof of Life 验证计划 |
| `user-story` | 把需求转成用户目标和可测试验收标准 | 融入 PRD 功能需求与验收标准 |
| `user-story-splitting` | 将过大的需求拆成可交付故事 | 融入 PRD 需求拆分建议 |
| `epic-breakdown-advisor` | 用拆分模式处理大型 Epic | 融入 PRD 复杂需求拆分建议 |
| `prd-development` | 将问题、用户、方案、指标和交付标准组织成 PRD | 作为 PRD 生成 Skill 的主框架参考 |

## ProductGPT 内置 Skill 映射

| ProductGPT Skill | 参考来源 | 采用重点 |
|---|---|---|
| 产品调研 Skill | `problem-statement`, `jobs-to-be-done`, `discovery-interview-prep`, `pol-probe` | 问题澄清、JTBD、低成本验证 |
| 用户反馈分析 Skill | `problem-statement`, `jobs-to-be-done` | 原始反馈证据、真实任务、主题聚类和优先级 |
| PRD 生成 Skill | `prd-development`, `problem-statement`, `user-story`, `user-story-splitting`, `epic-breakdown-advisor` | PRD 结构、用户故事、验收标准、需求拆分 |
| 竞品分析 Skill | ProductGPT 自研，参考 MECE、SWOT、竞品矩阵 | 竞品维度、差异判断、可借鉴点和不盲目跟进项 |

## 当前不做

- 不内置完整的多轮访谈式交互。
- 不把 8 个外部 Skill 单独做成 8 个入口。
- 不做 Skills 广场的真实安装、评分或分享。
- 不支持商业化授权承诺；当前仅用于非商业学习和作品集展示。
