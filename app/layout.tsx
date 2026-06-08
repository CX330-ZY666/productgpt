import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProductGPT｜AI 产品经理工作台",
  description:
    "面向产品经理、产品实习生和独立开发者的 AI 工作台，支持产品调研、竞品分析、用户反馈分析和 PRD 初稿生成。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
