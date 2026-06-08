import { NextRequest, NextResponse } from "next/server";
import { buildStyleAnalyzePrompt } from "@/lib/prompts";
import {
  AnalyzeStyleRequest,
  AnalyzeStyleResponse,
  DocumentStyleTemplate,
  DocumentType,
  SourceType,
} from "@/lib/types";

const validSourceTypes: SourceType[] = ["personal", "collected", "company"];
const validDocumentTypes: DocumentType[] = [
  "prd",
  "research",
  "competitor",
  "feedback",
  "general",
];

const minDocumentTextLength = 200;
const maxDocumentTextLength = 40000;
const maxTemplateNameLength = 80;
const maxUserRequirementLength = 1000;
const modelRequestTimeoutMs = 60000;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeStyleRequest;
    const documentText = body.documentText?.trim();
    const templateName = body.templateName?.trim();

    if (!templateName) {
      return NextResponse.json(
        { error: "请先填写 Skill 名称。" },
        { status: 400 }
      );
    }

    if (!documentText || documentText.length < minDocumentTextLength) {
      return NextResponse.json(
        { error: `参考文档内容太短，请至少粘贴 ${minDocumentTextLength} 字以上的完整文档。` },
        { status: 400 }
      );
    }

    if (documentText.length > maxDocumentTextLength) {
      return NextResponse.json(
        { error: `参考文档内容过长，请控制在 ${maxDocumentTextLength} 字以内。` },
        { status: 400 }
      );
    }

    if (templateName.length > maxTemplateNameLength) {
      return NextResponse.json(
        { error: `Skill 名称过长，请控制在 ${maxTemplateNameLength} 字以内。` },
        { status: 400 }
      );
    }

    if (
      body.userRequirement &&
      body.userRequirement.length > maxUserRequirementLength
    ) {
      return NextResponse.json(
        { error: `补充要求过长，请控制在 ${maxUserRequirementLength} 字以内。` },
        { status: 400 }
      );
    }

    if (!validSourceTypes.includes(body.sourceType)) {
      return NextResponse.json(
        { error: "来源类型无效，请重新选择。" },
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

    const analyzeRequest: AnalyzeStyleRequest = {
      documentText,
      sourceType: body.sourceType,
      documentType: body.documentType,
      userRequirement: body.userRequirement?.trim(),
      templateName,
      sourceName: body.sourceName?.trim(),
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
              "你是一个严谨的产品文档模板规则提取助手。你只输出合法 JSON。",
          },
          {
            role: "user",
            content: buildStyleAnalyzePrompt(analyzeRequest),
          },
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Style analyze request failed:", errorText);

      return NextResponse.json(
        {
          error: "模板提取请求失败，请检查 API Key 或稍后重试。",
        },
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
        { error: "模型返回的用户自建 Skill 规则格式异常，请重试。" },
        { status: 502 }
      );
    }

    const now = new Date().toISOString();
    const template = normalizeTemplateRules(parsedContent, {
      id: crypto.randomUUID(),
      name: templateName,
      sourceType: body.sourceType,
      documentType: body.documentType,
      sourceName: analyzeRequest.sourceName,
      createdAt: now,
      updatedAt: now,
    });
    const result: AnalyzeStyleResponse = { template };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Style analyze API error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "模板提取超时，请缩短参考文档后重试。" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "服务异常，请稍后重试。" },
      { status: 500 }
    );
  }
}

function normalizeTemplateRules(
  value: unknown,
  meta: Pick<
    DocumentStyleTemplate,
    | "id"
    | "name"
    | "sourceType"
    | "documentType"
    | "sourceName"
    | "createdAt"
    | "updatedAt"
  >
): DocumentStyleTemplate {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid style template payload");
  }

  const source = value as Record<string, unknown>;

  return {
    ...meta,
    summary: readString(source, "summary", "样本有限，已提取可复用写作规则。"),
    structureRules: readStringArray(source, "structureRules"),
    tableRules: readStringArray(source, "tableRules"),
    toneRules: readStringArray(source, "toneRules"),
    detailRules: readStringArray(source, "detailRules"),
    formattingRules: readStringArray(source, "formattingRules"),
    decisionRules: readStringArray(source, "decisionRules"),
    reusableInstructions: readStringArray(source, "reusableInstructions"),
    applicableScenarios: readStringArray(source, "applicableScenarios"),
    antiPatterns: readStringArray(source, "antiPatterns"),
  };
}

function readString(
  source: Record<string, unknown>,
  key: string,
  fallback: string
) {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readStringArray(source: Record<string, unknown>, key: string) {
  const value = source[key];

  if (Array.isArray(value)) {
    const items = value
      .filter((item): item is string => typeof item === "string")
      .map(sanitizeRule)
      .filter((item): item is string => Boolean(item));

    if (items.length) return items;
  }

  return ["样本不足，建议补充更多参考文档后重新提取。"];
}

function sanitizeRule(value: string) {
  const rule = value.trim().replace(/\s+/g, " ");

  if (!rule) return "";
  if (rule.length > 160) return "";
  if (containsLikelyBusinessFact(rule)) return "";

  return rule;
}

function containsLikelyBusinessFact(value: string) {
  return [
    /\d+(\.\d+)?\s*(%|％|元|万|亿|人|天|周|月|年|ms|s|秒|分钟|小时)/i,
    /\b\d{4}[-/年]\d{1,2}/,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /https?:\/\//i,
    /\b[a-z][a-z0-9_]*_id\b/i,
    /\b(uid|uuid|token|secret|apikey|api_key)\b/i,
  ].some((pattern) => pattern.test(value));
}
