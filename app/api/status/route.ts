import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    deepseekApiKeyConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
  });
}
