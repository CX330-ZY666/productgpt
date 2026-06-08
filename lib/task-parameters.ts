import {
  TaskParameter,
  TaskParameterValue,
  TaskType,
} from "./types";

export const commonOutputParameters: TaskParameter[] = [
  {
    type: "select",
    key: "outputLanguage",
    label: "输出语言",
    defaultValue: "",
    options: ["中文", "英文"],
  },
  {
    type: "select",
    key: "detailLevel",
    label: "输出详细度",
    defaultValue: "",
    options: ["简洁", "标准", "详细"],
  },
];

export const taskParameterConfigs: Record<TaskType, TaskParameter[]> = {
  research: [
    {
      type: "select",
      key: "industry",
      label: "行业 / 领域",
      defaultValue: "",
      options: ["SaaS / 企业服务", "教育", "消费产品", "AI 工具"],
    },
    {
      type: "select",
      key: "targetUser",
      label: "目标用户",
      defaultValue: "",
      options: ["中小企业", "产品经理", "大学生", "开发团队"],
    },
    {
      type: "select",
      key: "productStage",
      label: "产品阶段",
      defaultValue: "",
      options: ["想法验证", "MVP", "增长优化"],
    },
    {
      type: "select",
      key: "outputFormat",
      label: "输出格式",
      defaultValue: "",
      options: ["结构化报告", "机会点清单", "MVP 建议"],
    },
    {
      type: "tags",
      key: "focusTags",
      label: "关注重点",
      defaultValue: [],
      options: ["市场规模", "用户场景", "痛点", "MVP", "风险"],
    },
    ...commonOutputParameters,
  ],
  competitor: [
    {
      type: "select",
      key: "competitorCount",
      label: "分析对象数量",
      defaultValue: "",
      options: ["2 个", "3 个", "多个"],
    },
    {
      type: "select",
      key: "analysisDepth",
      label: "分析深度",
      defaultValue: "",
      options: ["快速对比", "深度拆解", "机会点导向"],
    },
    {
      type: "select",
      key: "outputFormat",
      label: "输出格式",
      defaultValue: "",
      options: ["竞品对比表", "分析报告", "决策建议"],
    },
    {
      type: "tags",
      key: "analysisDimensions",
      label: "分析维度",
      defaultValue: [],
      options: ["功能", "定位", "价格", "商业模式", "AI 能力", "用户体验"],
    },
    ...commonOutputParameters,
  ],
  feedback: [
    {
      type: "select",
      key: "feedbackSource",
      label: "反馈来源",
      defaultValue: "",
      options: ["App 评论", "用户访谈", "问卷", "社群反馈", "工单"],
    },
    {
      type: "select",
      key: "analysisMethod",
      label: "分析方法",
      defaultValue: "",
      options: ["问题聚类", "情绪分析", "KANO", "优先级排序"],
    },
    {
      type: "select",
      key: "outputFormat",
      label: "输出格式",
      defaultValue: "",
      options: ["反馈分析报告", "需求池", "迭代建议"],
    },
    {
      type: "tags",
      key: "focusTags",
      label: "关注重点",
      defaultValue: [],
      options: ["高频问题", "负面反馈", "需求机会", "迭代建议"],
    },
    ...commonOutputParameters,
  ],
  prd: [
    {
      type: "select",
      key: "productStage",
      label: "产品阶段",
      defaultValue: "",
      options: ["MVP", "V1", "迭代优化"],
    },
    {
      type: "select",
      key: "collaborationDetail",
      label: "研发协作粒度",
      defaultValue: "",
      options: ["概要", "标准", "详细"],
    },
    {
      type: "select",
      key: "outputFormat",
      label: "输出格式",
      defaultValue: "",
      options: ["完整 PRD", "功能需求说明", "研发评审稿"],
    },
    {
      type: "tags",
      key: "includedSections",
      label: "包含内容",
      defaultValue: [],
      options: [
        "用户故事",
        "流程",
        "验收标准",
        "埋点",
        "非功能需求",
        "风险依赖",
      ],
    },
    ...commonOutputParameters,
  ],
};

export function getDefaultTaskParameters(
  taskType: TaskType
): Record<string, TaskParameterValue> {
  return Object.fromEntries(
    taskParameterConfigs[taskType].map((parameter) => [
      parameter.key,
      parameter.defaultValue,
    ])
  );
}
