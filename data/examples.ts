import { TaskConfig } from "@/lib/types";

export const taskConfigs: TaskConfig[] = [
  {
    value: "research",
    label: "产品调研",
    description: "输入产品方向，生成目标用户、使用场景、痛点、机会点和 MVP 建议。",
    placeholder:
      "例如：我想做一个面向大学生的 AI 学习助手，帮助他们在复习时发现自己没有真正理解的知识点。",
    outputDescription: "适合在 0-1 产品探索阶段使用。",
  },
  {
    value: "competitor",
    label: "竞品分析",
    description: "输入竞品资料或体验笔记，生成结构化竞品分析报告。",
    placeholder:
      "例如：请分析 Notion AI、飞书妙记和腾讯文档 AI 在知识整理场景下的差异。可以粘贴官网介绍、价格页、体验笔记等资料。",
    outputDescription: "适合做市场调研、功能拆解和产品机会点分析。",
  },
  {
    value: "feedback",
    label: "用户反馈分析",
    description: "输入用户评论、访谈记录或问卷开放题，提炼高频问题和迭代建议。",
    placeholder:
      "例如：粘贴 10 条用户评论：1. 这个功能太难找了；2. 生成结果不够具体；3. 希望可以导出 PDF……",
    outputDescription: "适合做用户反馈整理和需求优先级判断。",
  },
  {
    value: "prd",
    label: "PRD 生成",
    description: "输入产品背景和功能想法，生成 PRD 初稿。",
    placeholder:
      "例如：我要做一个 AI 竞品分析助手，用户输入竞品资料后，系统输出竞品对比表、机会点和 MVP 建议。",
    outputDescription: "适合把想法快速整理成需求文档初稿。",
  },
];
