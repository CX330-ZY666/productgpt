import { NextRequest, NextResponse } from "next/server";
import { buildRevisePrompt } from "@/lib/prompts";
import {
  CustomSkill,
  DocumentStyleTemplate,
  ReviseRequest,
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
const maxCurrentResultLength = 50000;
const maxInstructionLength = 2000;
const maxSelectedTextLength = 10000;
const modelRequestTimeoutMs = 60000;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ReviseRequest;
    const {
      taskType,
      input,
      currentResult,
      instruction,
      context,
      outputMode = "standard",
      revisionMode = "global",
      selectedText,
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
        { error: "原始输入信息太短，请先补充更完整的信息。" },
        { status: 400 }
      );
    }

    if (!currentResult || currentResult.trim().length < 10) {
      return NextResponse.json(
        { error: "请先生成文档后再继续修改。" },
        { status: 400 }
      );
    }

    if (!instruction || instruction.trim().length < 2) {
      return NextResponse.json(
        { error: "请先输入你想怎么修改。" },
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

    if (currentResult.length > maxCurrentResultLength) {
      return NextResponse.json(
        { error: "当前文档过长，请先缩短文档后再继续修改。" },
        { status: 400 }
      );
    }

    if (instruction.length > maxInstructionLength) {
      return NextResponse.json(
        { error: `修改要求过长，请控制在 ${maxInstructionLength} 字以内。` },
        { status: 400 }
      );
    }

    if (revisionMode !== "global" && revisionMode !== "selection") {
      return NextResponse.json(
        { error: "修改模式无效，请刷新页面后重试。" },
        { status: 400 }
      );
    }

    if (revisionMode === "selection" && !selectedText?.trim()) {
      return NextResponse.json(
        { error: "请先在生成结果中选中要修改的内容。" },
        { status: 400 }
      );
    }

    if (selectedText && selectedText.length > maxSelectedTextLength) {
      return NextResponse.json(
        { error: `选中内容过长，请控制在 ${maxSelectedTextLength} 字以内。` },
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

    const prompt = buildRevisePrompt({
      taskType,
      input,
      currentResult,
      instruction,
      context,
      revisionMode,
      selectedText,
      customSkill:
        outputMode === "template" && isValidCustomSkill(customSkill)
          ? customSkill
          : undefined,
      styleTemplate:
        outputMode === "template" && isValidStyleTemplate(styleTemplate)
          ? styleTemplate
          : undefined,
    });

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
              "你是一个资深 AI 产品经理和产品文档编辑，擅长根据反馈精准修订 Markdown 产品文档。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.35,
        max_tokens: 8000,
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Revise model API request failed:", errorText);

      return NextResponse.json(
        { error: "模型请求失败，请检查 API Key 或稍后重试。" },
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
          ? `${result}\n\n> 文档可能因为长度限制被截断。建议缩短修改要求，或分段修改。`
          : result,
      taskType,
    });
  } catch (error) {
    console.error("Revise API error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "模型响应超时，请缩短文档或修改要求后重试。" },
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
  skill: ReviseRequest["customSkill"]
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
  template: ReviseRequest["styleTemplate"]
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
