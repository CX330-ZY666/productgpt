import { NextRequest, NextResponse } from "next/server";
import { buildPrompt } from "@/lib/prompts";
import {
  CustomSkill,
  DocumentStyleTemplate,
  GenerateRequest,
  TaskType,
} from "@/lib/types";

const validTaskTypes: TaskType[] = [
  "research",
  "competitor",
  "feedback",
  "prd",
];

const maxInputLength = 12000;
const maxContextLength = 40000;
const modelRequestTimeoutMs = 60000;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest;
    const {
      taskType,
      input,
      context,
      outputMode = "standard",
      customSkill,
      styleTemplate,
    } = body;

    if (!taskType || !validTaskTypes.includes(taskType)) {
      return NextResponse.json(
        { error: "文档类型无效，请刷新页面后重试。" },
        { status: 400 }
      );
    }

    const availableInput = `${input ?? ""}\n${context ?? ""}`.trim();

    if (availableInput.length < 5) {
      return NextResponse.json(
        { error: "输入信息太短，请补充更完整的信息。" },
        { status: 400 }
      );
    }

    if (input && input.length > maxInputLength) {
      return NextResponse.json(
        { error: `其它资料过长，请控制在 ${maxInputLength} 字以内。` },
        { status: 400 }
      );
    }

    if (context && context.length > maxContextLength) {
      return NextResponse.json(
        { error: `其它说明过长，请控制在 ${maxContextLength} 字以内。` },
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

    const prompt = buildPrompt(
      taskType,
      input,
      context,
      outputMode === "template" && isValidCustomSkill(customSkill)
        ? customSkill
        : undefined,
      outputMode === "template" && isValidStyleTemplate(styleTemplate)
        ? styleTemplate
        : undefined
    );

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
              "你是一个资深 AI 产品经理，擅长产品调研、竞品分析、用户反馈分析、PRD 撰写、Prompt 优化和 badcase 分析。请输出结构化、可执行、适合产品经理使用的内容。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 8000,
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Model API request failed:", errorText);

      return NextResponse.json(
        {
          error: "模型请求失败，请检查 API Key 或稍后重试。",
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const finishReason = data.choices?.[0]?.finish_reason;
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      return NextResponse.json(
        { error: "模型返回为空，请稍后重试。" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result:
        finishReason === "length"
          ? `${result}\n\n> 文档可能因为长度限制被截断。建议缩短输入，或分段生成后继续修改。`
          : result,
      taskType,
    });
  } catch (error) {
    console.error("Generate API error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "模型响应超时，请缩短输入信息后重试。" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "服务异常，请稍后重试。" },
      { status: 500 }
    );
  }
}

function isValidCustomSkill(
  skill: GenerateRequest["customSkill"]
): skill is CustomSkill {
  if (!skill || typeof skill !== "object") {
    return false;
  }

  return (
    typeof skill.name === "string" &&
    skill.name.trim().length > 0 &&
    (skill.sourceType === "document_extracted" ||
      skill.sourceType === "skill_imported") &&
    (skill.skillType === "direct_generation" ||
      skill.skillType === "guided_workflow") &&
    typeof skill.parsedRules === "object" &&
    skill.parsedRules !== null
  );
}

function isValidStyleTemplate(
  template: GenerateRequest["styleTemplate"]
): template is DocumentStyleTemplate {
  if (!template || typeof template !== "object") {
    return false;
  }

  return (
    typeof template.name === "string" &&
    template.name.trim().length > 0 &&
    Array.isArray(template.structureRules) &&
    Array.isArray(template.reusableInstructions)
  );
}
