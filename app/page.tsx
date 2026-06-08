import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileText,
  MessageSquareText,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "产品调研助手",
    description:
      "输入产品方向，生成目标用户、使用场景、用户痛点、机会点和 MVP 建议。",
    icon: Search,
  },
  {
    title: "竞品分析助手",
    description: "输入竞品资料或体验笔记，生成结构化竞品分析和功能对比表。",
    icon: BarChart3,
  },
  {
    title: "用户反馈分析",
    description: "从用户评论、问卷开放题和访谈记录中提炼高频问题和迭代建议。",
    icon: MessageSquareText,
  },
  {
    title: "PRD 初稿生成",
    description: "把产品想法快速整理成背景、目标用户、功能需求和验收标准。",
    icon: FileText,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span>ProductGPT</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              功能
            </a>
            <a
              href="https://github.com/CX330-ZY666/productgpt"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
            <Link href="/workspace" className="hover:text-foreground">
              工作台
            </Link>
          </nav>

          <Button asChild>
            <Link href="/workspace">
              开始使用
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border px-4 py-1 text-sm text-muted-foreground">
            AI Product Manager Workspace
          </div>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            面向产品经理的
            <span className="block">AI 工作台</span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            ProductGPT 帮助产品经理、产品实习生和独立开发者完成产品调研、
            竞品分析、用户反馈分析和 PRD 初稿生成，把零散信息转化为结构化产品文档。
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/workspace">
                进入工作台
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button size="lg" variant="outline" asChild>
              <a
                href="https://github.com/CX330-ZY666/productgpt"
                target="_blank"
                rel="noreferrer"
              >
                查看 GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-10">
          <h2 className="text-2xl font-bold">核心功能</h2>
          <p className="mt-2 text-muted-foreground">
            第一版聚焦产品经理最高频的四类工作流。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="px-0" asChild>
                    <Link href="/workspace">
                      立即体验
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
