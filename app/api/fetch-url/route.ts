import dns from "node:dns/promises";
import net from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { FetchUrlRequest, FetchUrlResponse, WebSource } from "@/lib/types";

const requestTimeoutMs = 12000;
const maxResponseBytes = 2 * 1024 * 1024;
const maxExtractedTextLength = 12000;
const maxRedirects = 3;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FetchUrlRequest;
    const rawUrl = body.url?.trim();

    if (!rawUrl) {
      return NextResponse.json(
        { error: "请先输入要抓取的网址。" },
        { status: 400 }
      );
    }

    const url = normalizeUrl(rawUrl);
    const validationError = await validatePublicUrl(url);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { finalUrl, html } = await fetchHtmlWithRedirects(url);
    const extracted = extractReadableText(html);

    if (extracted.text.length < 80) {
      return NextResponse.json(
        {
          error:
            "没有抓取到足够的正文内容。这个网页可能需要登录、依赖动态渲染或禁止抓取，请手动复制正文粘贴到输入框。",
        },
        { status: 422 }
      );
    }

    const source: WebSource = {
      id: crypto.randomUUID(),
      url: finalUrl.toString(),
      title: extracted.title || finalUrl.hostname,
      description: extracted.description,
      text: extracted.text.slice(0, maxExtractedTextLength),
      fetchedAt: new Date().toISOString(),
    };
    const response: FetchUrlResponse = { source };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Fetch URL API error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "网页抓取超时，请稍后重试或手动复制正文。" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "网页抓取失败，请确认网址可公开访问。" },
      { status: 500 }
    );
  }
}

function normalizeUrl(rawUrl: string) {
  const candidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  return new URL(candidate);
}

async function validatePublicUrl(url: URL): Promise<string | null> {
  if (!["http:", "https:"].includes(url.protocol)) {
    return "仅支持 http 或 https 网址。";
  }

  if (!url.hostname || isBlockedHostname(url.hostname)) {
    return "不能抓取本机、内网或保留地址。";
  }

  const addresses = await dns.lookup(url.hostname, { all: true });

  if (!addresses.length || addresses.some((address) => isPrivateIp(address.address))) {
    return "不能抓取解析到内网或保留地址的网址。";
  }

  return null;
}

async function fetchHtmlWithRedirects(initialUrl: URL) {
  let currentUrl = initialUrl;

  for (let index = 0; index <= maxRedirects; index += 1) {
    const validationError = await validatePublicUrl(currentUrl);

    if (validationError) {
      throw new Error(validationError);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

    const response = await fetch(currentUrl, {
      signal: controller.signal,
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5",
        "User-Agent":
          "ProductGPT/0.1 (+https://github.com/productgpt; public page fetch)",
      },
    });
    clearTimeout(timeoutId);

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");

      if (!location) {
        throw new Error("网页重定向缺少目标地址。");
      }

      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (!response.ok) {
      throw new Error(`网页返回状态码 ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      throw new Error("当前链接不是可解析的网页正文。");
    }

    const html = await readLimitedResponse(response);
    return { finalUrl: currentUrl, html };
  }

  throw new Error("网页重定向次数过多。");
}

async function readLimitedResponse(response: Response) {
  const reader = response.body?.getReader();

  if (!reader) {
    return response.text();
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;

    if (totalBytes > maxResponseBytes) {
      throw new Error("网页内容过大，请手动复制关键正文。");
    }

    chunks.push(value);
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(
    concatUint8Arrays(chunks, totalBytes)
  );
}

function concatUint8Arrays(chunks: Uint8Array[], totalBytes: number) {
  const result = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
}

function extractReadableText(html: string) {
  const title = decodeHtml(readTagContent(html, "title"));
  const description = decodeHtml(
    readMetaContent(html, "description") ||
      readMetaContent(html, "og:description")
  );
  const body = readTagContent(html, "body") || html;
  const text = decodeHtml(
    body
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
      .replace(/<(br|p|div|section|article|li|tr|h[1-6])\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t\f\v]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );

  return { title, description, text };
}

function readTagContent(html: string, tagName: string) {
  const match = html.match(
    new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i")
  );

  return match?.[1]?.trim() ?? "";
}

function readMetaContent(html: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta\\b(?=[^>]*(?:name|property)=["']${escapedName}["'])(?=[^>]*content=["']([^"']+)["'])[^>]*>`,
    "i"
  );
  const match = html.match(pattern);

  return match?.[1]?.trim() ?? "";
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .trim();
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "0.0.0.0"
  );
}

function isPrivateIp(address: string) {
  if (address === "169.254.169.254") {
    return true;
  }

  const ipVersion = net.isIP(address);

  if (ipVersion === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  if (ipVersion === 6) {
    const normalized = address.toLowerCase();

    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  return true;
}
