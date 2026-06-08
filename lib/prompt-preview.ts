import {
  CustomSkill,
  ProductSkill,
  TaskParameter,
  TaskParameterValue,
  TaskType,
  WebSource,
} from "@/lib/types";

export interface PromptPreviewInput {
  taskType: TaskType;
  taskLabel: string;
  skill: ProductSkill;
  parameters: Record<string, TaskParameterValue>;
  parameterConfig: TaskParameter[];
  input: string;
  context?: string;
  externalSources?: WebSource[];
  otherParameters?: string;
  outputMode: "standard" | "template";
  customSkill?: CustomSkill | null;
  skillSupplementAnswers?: Record<string, string>;
}

export interface PromptPreview {
  taskLabel: string;
  generationModeLabel: string;
  skillSummary: string;
  parameters: Array<{ label: string; value: string }>;
  customSkill?: CustomSkill;
  skillSupplementAnswers?: Array<{ label: string; value: string }>;
  userPromptPreview: string;
}

export function buildPromptPreview(input: PromptPreviewInput): PromptPreview {
  const parameters = input.parameterConfig
    .map((parameter) => {
      const rawValue = input.parameters[parameter.key] ?? parameter.defaultValue;
      return {
        label: parameter.label,
        value: Array.isArray(rawValue) ? rawValue.join("、") : rawValue,
      };
    })
    .filter((parameter) => Boolean(parameter.value));

  const otherParameters = input.otherParameters?.trim();
  const sourceParameters = input.externalSources?.length
    ? [
        {
          label: "网页资料",
          value: input.externalSources
            .map((source) => `${source.title}：${source.url}`)
            .join("；"),
        },
      ]
    : [];
  const visibleParameters = otherParameters
    ? [
        ...parameters,
        ...sourceParameters,
        { label: "其它参数", value: otherParameters },
      ]
    : [...parameters, ...sourceParameters];

  const customSkill =
    input.outputMode === "template" ? input.customSkill ?? undefined : undefined;
  const generationModeLabel =
    input.outputMode === "template" ? "用户自建 Skill" : "系统默认 Skill";
  const skillSupplementAnswers = formatSkillSupplementAnswers(
    input.skillSupplementAnswers
  );

  return {
    taskLabel: input.taskLabel,
    generationModeLabel,
    skillSummary: customSkill
      ? buildCustomSkillSummary(input.taskLabel, generationModeLabel, customSkill)
      : [
          `任务：${input.taskLabel}`,
          `生成模式：${generationModeLabel}`,
          `系统默认 Skill：${input.skill.name}`,
          `适用场景：${input.skill.inputGuide}`,
          input.skill.requiredInputs.length
            ? `生成所需信息：${input.skill.requiredInputs.join("；")}`
            : "",
          input.skill.method ? `方法步骤：${input.skill.method}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
    parameters: visibleParameters,
    customSkill,
    skillSupplementAnswers,
    userPromptPreview: buildUserPromptPreview(
      input,
      visibleParameters,
      customSkill,
      skillSupplementAnswers
    ),
  };
}

function buildCustomSkillSummary(
  taskLabel: string,
  generationModeLabel: string,
  customSkill: CustomSkill
) {
  const rules = customSkill.parsedRules;

  return [
    `任务：${taskLabel}`,
    `生成模式：${generationModeLabel}`,
    `Skill 名称：${customSkill.name}`,
    `Skill 来源：${getCustomSkillSourceLabel(customSkill)}`,
    `补充方式：${getCustomSkillSupplementModeLabel(customSkill)}`,
    `Skill 摘要：${customSkill.summary}`,
    rules.requiredInputs.length
      ? `所需输入：${rules.requiredInputs.join("；")}`
      : "",
    rules.analysisSteps.length
      ? `分析步骤：${rules.analysisSteps.join("；")}`
      : "",
    rules.outputStructure.length
      ? `输出结构：${rules.outputStructure.join("；")}`
      : "",
    rules.qualityRules.length
      ? `质量规则：${rules.qualityRules.join("；")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildUserPromptPreview(
  input: PromptPreviewInput,
  parameters: Array<{ label: string; value: string }>,
  customSkill?: CustomSkill,
  skillSupplementAnswers?: Array<{ label: string; value: string }>
) {
  const parameterText = parameters
    .map((parameter) => `- ${parameter.label}：${parameter.value}`)
    .join("\n");
  const supplementText = skillSupplementAnswers?.length
    ? skillSupplementAnswers
        .map((answer) => `- ${answer.label}：${answer.value}`)
        .join("\n")
    : "";
  const skillText = customSkill
    ? [
        `使用用户自建 Skill：${customSkill.name}`,
        `来源：${getCustomSkillSourceLabel(customSkill)}`,
        `补充方式：${getCustomSkillSupplementModeLabel(customSkill)}`,
        `摘要：${customSkill.summary}`,
        customSkill.parsedRules.analysisSteps.length
          ? `分析步骤：${customSkill.parsedRules.analysisSteps.join("；")}`
          : "",
        customSkill.parsedRules.outputStructure.length
          ? `输出结构：${customSkill.parsedRules.outputStructure.join("；")}`
          : "",
        customSkill.parsedRules.qualityRules.length
          ? `质量规则：${customSkill.parsedRules.qualityRules.join("；")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "使用系统默认 Skill，不启用用户自建 Skill。";

  return [
    `请基于以下输入生成${input.taskLabel}。`,
    "",
    `当前生成模式：${input.outputMode === "template" ? "用户自建 Skill" : "系统默认 Skill"}`,
    customSkill
      ? `当前用户自建 Skill：${customSkill.name}`
      : `当前系统默认 Skill：${input.skill.name}`,
    customSkill ? customSkill.summary : input.skill.description,
    "",
    "参数配置：",
    parameterText || "无已选参数",
    "",
    supplementText ? "输入信息：" : "",
    supplementText,
    "",
    "生成约束：",
    skillText,
    "",
    input.externalSources?.length
      ? [
          "网页资料：",
          ...input.externalSources.map(
            (source, index) =>
              `- ${index + 1}. ${source.title}：${source.url}`
          ),
        ].join("\n")
      : "",
    "",
    input.context?.trim() ? `其它说明：${input.context.trim()}` : "",
    "",
    "其它资料：",
    input.input || "无",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function formatSkillSupplementAnswers(answers?: Record<string, string>) {
  if (!answers) return [];

  return Object.entries(answers)
    .map(([label, value]) => ({ label, value: value.trim() }))
    .filter((answer) => Boolean(answer.value));
}

function getCustomSkillSourceLabel(skill: CustomSkill) {
  return skill.sourceType === "skill_imported"
    ? "导入现成 Skill"
    : "从参考文档提取";
}

function getCustomSkillSupplementModeLabel(skill: CustomSkill) {
  if (skill.parsedRules.guidedSteps.length) {
    return "分步补充";
  }

  if (skill.parsedRules.requiredInputs.length) {
    return "建议补充";
  }

  return "可直接使用";
}
