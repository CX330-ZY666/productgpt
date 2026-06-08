import { NextRequest, NextResponse } from "next/server";
import { buildCustomSkillAnalyzePrompt } from "@/lib/prompts";
import {
  AnalyzeCustomSkillRequest,
  AnalyzeCustomSkillResponse,
  CustomSkill,
  CustomSkillParsedRules,
  CustomSkillType,
  DocumentType,
} from "@/lib/types";

const validDocumentTypes: DocumentType[] = [
  "prd",
  "research",
  "competitor",
  "feedback",
  "general",
];

const minSkillTextLength = 80;
const maxSkillTextLength = 40000;
const maxUserRequirementLength = 1000;
const maxSkillNameLength = 80;
const modelRequestTimeoutMs = 60000;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeCustomSkillRequest;
    const skillText = body.skillText?.trim();
    const skillName = body.skillName?.trim();

    if (!skillText || skillText.length < minSkillTextLength) {
      return NextResponse.json(
        { error: `Skill 文本太短，请至少粘贴 ${minSkillTextLength} 字以上的完整内容。` },
        { status: 400 }
      );
    }

    if (skillText.length > maxSkillTextLength) {
      return NextResponse.json(
        { error: `Skill 文本过长，请控制在 ${maxSkillTextLength} 字以内。` },
        { status: 400 }
      );
    }

    if (skillName && skillName.length > maxSkillNameLength) {
      return NextResponse.json(
        { error: `Skill 名称过长，请控制在 ${maxSkillNameLength} 字以内。` },
        { status: 400 }
      );
    }

    if (
      body.userRequirement &&
      body.userRequirement.length > maxUserRequirementLength
    ) {
      return NextResponse.json(
        { error: `补充说明过长，请控制在 ${maxUserRequirementLength} 字以内。` },
        { status: 400 }
      );
    }

    if (!validDocumentTypes.includes(body.documentType)) {
      return NextResponse.json(
        { error: "文档类型无效，请重新选择。" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "缺少 DeepSeek API Key，请先完成配置。" },
        { status: 500 }
      );
    }

    const analyzeRequest: AnalyzeCustomSkillRequest = {
      skillText,
      documentType: body.documentType,
      userRequirement: body.userRequirement?.trim(),
      sourceName: body.sourceName?.trim(),
      skillName,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), modelRequestTimeoutMs);

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "你是一个严谨的 ProductGPT 自定义 Skill 解析器。你只输出合法 JSON。",
          },
          {
            role: "user",
            content: buildCustomSkillAnalyzePrompt(analyzeRequest),
          },
        ],
        temperature: 0.2,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Custom skill analyze request failed:", errorText);

      return NextResponse.json(
        { error: "Skill 解析请求失败，请检查 API Key 或稍后重试。" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "模型返回为空，请稍后重试。" },
        { status: 500 }
      );
    }

    let parsedContent: unknown;

    try {
      parsedContent = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "模型返回的 Skill 解析结果格式异常，请重试。" },
        { status: 502 }
      );
    }

    const now = new Date().toISOString();
    const skill = normalizeCustomSkill(parsedContent, {
      id: crypto.randomUUID(),
      documentType: body.documentType,
      sourceName: analyzeRequest.sourceName,
      originalText: skillText,
      fallbackName: skillName || analyzeRequest.sourceName || "自定义 Skill",
      createdAt: now,
      updatedAt: now,
    });
    const result: AnalyzeCustomSkillResponse = { skill };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Custom skill analyze API error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Skill 解析超时，请缩短文本后重试。" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "服务异常，请稍后重试。" },
      { status: 500 }
    );
  }
}

function normalizeCustomSkill(
  value: unknown,
  meta: {
    id: string;
    documentType: DocumentType;
    sourceName?: string;
    originalText: string;
    fallbackName: string;
    createdAt: string;
    updatedAt: string;
  }
): CustomSkill {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid custom skill payload");
  }

  const source = value as Record<string, unknown>;
  const skillType = readSkillType(source.skillType);
  const parsedRules: CustomSkillParsedRules = {
    requiredInputs: readStringArray(source, "requiredInputs"),
    analysisSteps: readStringArray(source, "analysisSteps"),
    outputStructure: readStringArray(source, "outputStructure"),
    qualityRules: readStringArray(source, "qualityRules"),
    constraints: readStringArray(source, "constraints"),
    structureRules: readStringArray(source, "structureRules"),
    tableRules: readStringArray(source, "tableRules"),
    toneRules: readStringArray(source, "toneRules"),
    detailRules: readStringArray(source, "detailRules"),
    formattingRules: readStringArray(source, "formattingRules"),
    decisionRules: readStringArray(source, "decisionRules"),
    reusableInstructions: readStringArray(source, "reusableInstructions"),
    applicableScenarios: readStringArray(source, "applicableScenarios"),
    antiPatterns: readStringArray(source, "antiPatterns"),
    guidedSteps: readGuidedSteps(source.guidedSteps),
    finalOutputInstruction:
      readString(source, "finalOutputInstruction") ||
      "基于该自定义 Skill 生成结构化产品文档。",
  };

  return {
    id: meta.id,
    name: readString(source, "name") || meta.fallbackName,
    summary:
      readString(source, "summary") ||
      "已解析为 ProductGPT 可使用的用户自建 Skill。",
    sourceType: "skill_imported",
    skillType,
    documentType: meta.documentType,
    sourceName: meta.sourceName,
    originalText: meta.originalText,
    parsedRules,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };
}

function readGuidedSteps(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const source = item as Record<string, unknown>;
      const title = readString(source, "title");
      const questions = readStringArray(source, "questions");

      if (!title || !questions.length) return null;

      return {
        id: `step-${index + 1}`,
        title,
        description: readString(source, "description"),
        questions,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function readSkillType(value: unknown): CustomSkillType {
  return value === "guided_workflow" ? "guided_workflow" : "direct_generation";
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(source: Record<string, unknown>, key: string) {
  const value = source[key];

  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}
