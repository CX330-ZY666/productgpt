"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BarChart3,
  CheckCircle2,
  Clipboard,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Globe2,
  HeartHandshake,
  History,
  Loader2,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import { taskConfigs } from "@/data/examples";
import { productSkills } from "@/lib/skills";
import {
  getDefaultTaskParameters,
  taskParameterConfigs,
} from "@/lib/task-parameters";
import {
  addCustomSkill,
  deleteCustomSkill,
  getCustomSkills,
  getSelectedCustomSkillId,
  saveCustomSkills,
  setSelectedCustomSkillId,
  templateToCustomSkill,
  updateCustomSkill,
} from "@/lib/custom-skill/storage";
import {
  clearHistoryItems,
  deleteHistoryItem,
  getHistoryItems,
  saveHistoryItems,
  saveHistoryItem,
} from "@/lib/history/storage";
import { buildPromptPreview, PromptPreview } from "@/lib/prompt-preview";
import { normalizeMarkdownTables } from "@/lib/markdown";
import {
  AnalyzeStyleResponse,
  AnalyzeCustomSkillResponse,
  CustomSkill,
  DocumentHistoryItem,
  DocumentStyleTemplate,
  FetchUrlResponse,
  DocumentType,
  GenerateResponse,
  OutputMode,
  RevisionItem,
  ReviseResponse,
  SourceType,
  TaskParameter,
  TaskParameterValue,
  TaskType,
  WebSource,
} from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ActiveView =
  | TaskType
  | "style"
  | "style-create"
  | "skill-import"
  | "style-detail"
  | "skills"
  | "skills-market"
  | "history";

const taskIcons: Record<TaskType, typeof Sparkles> = {
  research: Sparkles,
  competitor: BarChart3,
  feedback: HeartHandshake,
  prd: FileText,
};

const sourceTypeOptions: Array<{ label: string; value: SourceType }> = [
  { label: "个人历史文档", value: "personal" },
  { label: "收藏优秀模板", value: "collected" },
  { label: "公司规范", value: "company" },
];

const documentTypeOptions: Array<{ label: string; value: DocumentType }> = [
  { label: "PRD", value: "prd" },
  { label: "产品调研", value: "research" },
  { label: "竞品分析", value: "competitor" },
  { label: "用户反馈", value: "feedback" },
  { label: "通用文档", value: "general" },
];

const maxStyleFileSizeBytes = 1024 * 1024;
const maxInputLength = 12000;
const maxExternalSourceCount = 5;
const newUserGuideDismissedKey = "productgpt:new-user-guide-dismissed";
const supportedStyleFileExtensions = [".txt", ".md", ".markdown"];

type FetchUrlStatusItem = {
  url: string;
  status: "success" | "failed";
  message: string;
};

type TopPanel = "status" | "settings" | null;

type ProductGptLocalBackup = {
  version: 1;
  exportedAt: string;
  historyItems: DocumentHistoryItem[];
  styleTemplates: DocumentStyleTemplate[];
  selectedTemplateId: string;
  customSkills?: CustomSkill[];
  selectedCustomSkillId?: string;
};

type RevisionSubmitOptions = {
  instruction: string;
  revisionMode: "global" | "selection";
  selectedText?: string;
};

type MarkdownHeading = {
  id: string;
  level: 1 | 2 | 3;
  text: string;
};

type SkillSupplementGroup = {
  id: string;
  title: string;
  description: string;
  badge: string;
  questions: Array<{
    key: string;
    label: string;
  }>;
};

const templateRuleSections: Array<{
  key: keyof Pick<
    CustomSkill["parsedRules"],
    | "structureRules"
    | "tableRules"
    | "toneRules"
    | "detailRules"
    | "formattingRules"
    | "decisionRules"
    | "reusableInstructions"
    | "applicableScenarios"
    | "antiPatterns"
  >;
  label: string;
}> = [
  { key: "structureRules", label: "结构规则" },
  { key: "tableRules", label: "表格规则" },
  { key: "toneRules", label: "语气规则" },
  { key: "detailRules", label: "颗粒度规则" },
  { key: "formattingRules", label: "格式规则" },
  { key: "decisionRules", label: "判断规则" },
  { key: "reusableInstructions", label: "可复用指令" },
  { key: "applicableScenarios", label: "适用场景" },
  { key: "antiPatterns", label: "反模式" },
];

const importedSkillRuleSections: Array<{
  key: keyof Pick<
    CustomSkill["parsedRules"],
    | "requiredInputs"
    | "analysisSteps"
    | "outputStructure"
    | "qualityRules"
    | "constraints"
  >;
  label: string;
}> = [
  { key: "requiredInputs", label: "所需输入" },
  { key: "analysisSteps", label: "分析步骤" },
  { key: "outputStructure", label: "输出结构" },
  { key: "qualityRules", label: "质量规则" },
  { key: "constraints", label: "约束规则" },
];

const navItems = [
  { label: "产品调研助手", value: "research" as TaskType },
  { label: "竞品分析助手", value: "competitor" as TaskType },
  { label: "用户反馈分析", value: "feedback" as TaskType },
  { label: "PRD 生成助手", value: "prd" as TaskType },
];

export default function WorkspacePage() {
  const [activeView, setActiveView] = useState<ActiveView>("research");
  const [taskType, setTaskType] = useState<TaskType>("research");
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [otherParameters, setOtherParameters] = useState("");
  const [sourceUrlInput, setSourceUrlInput] = useState("");
  const [externalSources, setExternalSources] = useState<WebSource[]>([]);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchUrlStatusItems, setFetchUrlStatusItems] = useState<
    FetchUrlStatusItem[]
  >([]);
  const [taskParameters, setTaskParameters] = useState<
    Record<string, TaskParameterValue>
  >(getDefaultTaskParameters("research"));
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [revisionHistory, setRevisionHistory] = useState<RevisionItem[]>([]);
  const [isRevising, setIsRevising] = useState(false);
  const [revisionErrorMsg, setRevisionErrorMsg] = useState("");
  const [lastPromptPreview, setLastPromptPreview] =
    useState<PromptPreview | null>(null);
  const [historyItems, setHistoryItems] = useState<DocumentHistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState("");
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyErrorMsg, setHistoryErrorMsg] = useState("");
  const [topPanel, setTopPanel] = useState<TopPanel>(null);
  const [deepseekApiKeyConfigured, setDeepseekApiKeyConfigured] = useState<
    boolean | null
  >(null);
  const [localSettingsMsg, setLocalSettingsMsg] = useState("");
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  const [customSkills, setCustomSkills] = useState<CustomSkill[]>([]);
  const [selectedCustomSkillId, setSelectedCustomSkillIdState] = useState("");
  const [skillDetailId, setSkillDetailId] = useState("");
  const [outputMode, setOutputMode] = useState<OutputMode>("standard");

  const [templateName, setTemplateName] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType | "">("");
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
  const [userRequirement, setUserRequirement] = useState("");
  const [styleDocument, setStyleDocument] = useState("");
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [styleErrorMsg, setStyleErrorMsg] = useState("");
  const [importSkillName, setImportSkillName] = useState("");
  const [importSkillSourceName, setImportSkillSourceName] = useState("");
  const [importSkillDocumentType, setImportSkillDocumentType] =
    useState<DocumentType | "">("");
  const [importSkillRequirement, setImportSkillRequirement] = useState("");
  const [importSkillText, setImportSkillText] = useState("");
  const [importSkillPreview, setImportSkillPreview] =
    useState<CustomSkill | null>(null);
  const [isAnalyzingImportSkill, setIsAnalyzingImportSkill] = useState(false);
  const [importSkillErrorMsg, setImportSkillErrorMsg] = useState("");
  const [skillSupplementAnswers, setSkillSupplementAnswers] = useState<
    Record<string, string>
  >({});
  const [showNewUserGuide, setShowNewUserGuide] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const savedSkills = getCustomSkills();
      const savedSelectedId = getSelectedCustomSkillId();
      const savedSelectedSkillExists = savedSkills.some(
        (skill) => skill.id === savedSelectedId
      );
      const fallbackSelectedId = savedSkills[0]?.id ?? "";

      setCustomSkills(savedSkills);
      setSelectedCustomSkillIdState(
        savedSelectedSkillExists ? savedSelectedId : fallbackSelectedId
      );
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setShowNewUserGuide(
        window.localStorage.getItem(newUserGuideDismissedKey) !== "true"
      );
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    getHistoryItems()
      .then((items) => {
        if (!isMounted) return;
        setHistoryItems(items);
        setHistoryErrorMsg("");
      })
      .catch((error) => {
        if (!isMounted) return;
        setHistoryErrorMsg(getErrorMessage(error, "读取历史记录失败。"));
      })
      .finally(() => {
        if (isMounted) {
          setIsHistoryLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/status")
      .then((response) => response.json())
      .then((data: { deepseekApiKeyConfigured?: boolean }) => {
        if (!isMounted) return;
        setDeepseekApiKeyConfigured(Boolean(data.deepseekApiKeyConfigured));
      })
      .catch(() => {
        if (isMounted) {
          setDeepseekApiKeyConfigured(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentTask = useMemo(() => {
    return taskConfigs.find((task) => task.value === taskType)!;
  }, [taskType]);

  const currentSkill = useMemo(() => {
    return productSkills.find((skill) => skill.id === taskType)!;
  }, [taskType]);

  const currentParameterConfig = useMemo(() => {
    return taskParameterConfigs[taskType];
  }, [taskType]);

  const selectedCustomSkill = useMemo(() => {
    return (
      customSkills.find((skill) => skill.id === selectedCustomSkillId) ?? null
    );
  }, [selectedCustomSkillId, customSkills]);
  const skillDetail = useMemo(() => {
    return (
      customSkills.find((skill) => skill.id === skillDetailId) ?? null
    );
  }, [skillDetailId, customSkills]);
  const compatibleCustomSkills = useMemo(
    () =>
      customSkills.filter((skill) =>
        isCustomSkillCompatibleWithTask(skill, taskType)
      ),
    [taskType, customSkills]
  );
  const selectedCustomSkillForCurrentTask = useMemo(() => {
    if (!selectedCustomSkill) return null;
    return isCustomSkillCompatibleWithTask(selectedCustomSkill, taskType)
      ? selectedCustomSkill
      : null;
  }, [selectedCustomSkill, taskType]);
  const activeSkillSupplementGroups = useMemo(
    () =>
      getActiveSkillSupplementGroups({
        currentSkill,
        outputMode,
        selectedTemplate: selectedCustomSkillForCurrentTask,
      }),
    [currentSkill, outputMode, selectedCustomSkillForCurrentTask]
  );
  const activeSkillSupplementAnswers = useMemo(
    () =>
      filterSkillSupplementAnswers(
        skillSupplementAnswers,
        activeSkillSupplementGroups
      ),
    [activeSkillSupplementGroups, skillSupplementAnswers]
  );

  const promptPreview = useMemo(() => {
    return buildPromptPreview({
      taskType,
      taskLabel: currentTask.label,
      skill: currentSkill,
      parameters: taskParameters,
      parameterConfig: currentParameterConfig,
      input,
      context,
      externalSources,
      otherParameters,
      outputMode,
      customSkill: selectedCustomSkillForCurrentTask,
      skillSupplementAnswers: activeSkillSupplementAnswers,
    });
  }, [
    activeSkillSupplementAnswers,
    context,
    currentParameterConfig,
    currentSkill,
    currentTask.label,
    externalSources,
    input,
    otherParameters,
    outputMode,
    selectedCustomSkillForCurrentTask,
    taskParameters,
    taskType,
  ]);

  function handleTaskChange(nextTaskType: TaskType) {
    const canKeepCustomSkillMode =
      outputMode === "template" &&
      selectedCustomSkill &&
      isCustomSkillCompatibleWithTask(selectedCustomSkill, nextTaskType);

    setActiveView(nextTaskType);
    setTaskType(nextTaskType);
    setInput("");
    setContext("");
    setOtherParameters("");
    setSourceUrlInput("");
    setExternalSources([]);
    setFetchUrlStatusItems([]);
    setTaskParameters(getDefaultTaskParameters(nextTaskType));
    setResult("");
    setErrorMsg("");
    setRevisionInstruction("");
    setRevisionHistory([]);
    setRevisionErrorMsg("");
    setLastPromptPreview(null);
    setCurrentHistoryId("");
    setSkillSupplementAnswers({});

    if (!canKeepCustomSkillMode) {
      setOutputMode("standard");
    }
  }

  function handleSelectCustomSkill(skillId: string) {
    setSelectedCustomSkillIdState(skillId);
    setSelectedCustomSkillId(skillId);
    setSkillSupplementAnswers({});
  }

  function handleOpenSkillDetail(skillId: string) {
    setSkillDetailId(skillId);
    setActiveView("style-detail");
  }

  function updateTaskParameter(key: string, value: TaskParameterValue) {
    setTaskParameters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleTemplateTextFieldChange(
    key: "name" | "summary",
    value: string
  ) {
    if (!skillDetail) return;

    const nextSkill = {
      ...skillDetail,
      [key]: value,
      updatedAt: new Date().toISOString(),
    };
    setCustomSkills(updateCustomSkill(nextSkill));
  }

  function handleTemplateRuleChange(
    key: keyof Pick<
      CustomSkill["parsedRules"],
      | "structureRules"
      | "tableRules"
      | "toneRules"
      | "detailRules"
      | "formattingRules"
      | "decisionRules"
      | "reusableInstructions"
      | "applicableScenarios"
      | "antiPatterns"
      | "requiredInputs"
      | "analysisSteps"
      | "outputStructure"
      | "qualityRules"
      | "constraints"
    >,
    value: string
  ) {
    if (!skillDetail) return;

    const nextSkill = {
      ...skillDetail,
      parsedRules: {
        ...skillDetail.parsedRules,
        [key]: splitLines(value),
      },
      updatedAt: new Date().toISOString(),
    };
    setCustomSkills(updateCustomSkill(nextSkill));
  }

  async function handleStyleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerFileName = file.name.toLowerCase();
    const isSupportedFile = supportedStyleFileExtensions.some((extension) =>
      lowerFileName.endsWith(extension)
    );

    if (!isSupportedFile) {
      setStyleErrorMsg("仅支持上传 .txt / .md / .markdown 文本文件。");
      event.target.value = "";
      return;
    }

    if (file.size > maxStyleFileSizeBytes) {
      setStyleErrorMsg("参考文档文件过大，请控制在 1MB 以内。");
      event.target.value = "";
      return;
    }

    const text = await file.text();
    setStyleDocument(text);
    setSourceName(file.name);
    setTemplateName(file.name.replace(/\.[^.]+$/, ""));
    setStyleErrorMsg("");
  }

  async function handleImportSkillFileUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerFileName = file.name.toLowerCase();
    const isSupportedFile = supportedStyleFileExtensions.some((extension) =>
      lowerFileName.endsWith(extension)
    );

    if (!isSupportedFile) {
      setImportSkillErrorMsg("仅支持上传 .txt / .md / .markdown 文本文件。");
      event.target.value = "";
      return;
    }

    if (file.size > maxStyleFileSizeBytes) {
      setImportSkillErrorMsg("Skill 文件过大，请控制在 1MB 以内。");
      event.target.value = "";
      return;
    }

    const text = await file.text();
    setImportSkillText(text);
    setImportSkillSourceName(file.name);
    setImportSkillName(file.name.replace(/\.[^.]+$/, ""));
    setImportSkillPreview(null);
    setImportSkillErrorMsg("");
  }

  async function handleAnalyzeImportedSkill() {
    if (!importSkillText.trim()) {
      setImportSkillErrorMsg("请先粘贴或上传 Skill 文本。");
      return;
    }

    if (!importSkillDocumentType) {
      setImportSkillErrorMsg("请先选择适用文档类型。");
      return;
    }

    try {
      setIsAnalyzingImportSkill(true);
      setImportSkillErrorMsg("");
      setImportSkillPreview(null);

      const response = await fetch("/api/custom-skills/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skillText: importSkillText,
          documentType: importSkillDocumentType,
          userRequirement: importSkillRequirement,
          skillName: importSkillName,
          sourceName: importSkillSourceName,
        }),
      });

      const data = (await response.json()) as
        | AnalyzeCustomSkillResponse
        | { error?: string };

      if (!response.ok || !("skill" in data)) {
        throw new Error(getApiErrorMessage(data, "Skill 解析失败，请稍后重试。"));
      }

      setImportSkillPreview(data.skill);
    } catch (error) {
      setImportSkillErrorMsg(getErrorMessage(error, "Skill 解析失败，请稍后重试。"));
    } finally {
      setIsAnalyzingImportSkill(false);
    }
  }

  function handleSaveImportedSkill() {
    if (!importSkillPreview) {
      setImportSkillErrorMsg("请先解析 Skill，再确认保存。");
      return;
    }

    const nextSkills = addCustomSkill(importSkillPreview);
    setCustomSkills(nextSkills);
    setSkillDetailId(importSkillPreview.id);
    setActiveView("style-detail");

    if (isCustomSkillCompatibleWithTask(importSkillPreview, taskType)) {
      setSelectedCustomSkillIdState(importSkillPreview.id);
      setSelectedCustomSkillId(importSkillPreview.id);
      setOutputMode("template");
    }

    setImportSkillName("");
    setImportSkillSourceName("");
    setImportSkillDocumentType("");
    setImportSkillRequirement("");
    setImportSkillText("");
    setImportSkillPreview(null);
    setImportSkillErrorMsg("");
  }

  async function handleAnalyzeStyle() {
    if (!templateName.trim()) {
      setStyleErrorMsg("请先填写 Skill 名称。");
      return;
    }

    if (!styleDocument.trim()) {
      setStyleErrorMsg("请先粘贴或上传参考文档。");
      return;
    }

    if (!sourceType) {
      setStyleErrorMsg("请先选择来源类型。");
      return;
    }

    if (!documentType) {
      setStyleErrorMsg("请先选择文档类型。");
      return;
    }

    try {
      setIsAnalyzingStyle(true);
      setStyleErrorMsg("");

      const response = await fetch("/api/style/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentText: styleDocument,
          sourceType,
          documentType,
          userRequirement,
          templateName,
          sourceName,
        }),
      });

      const data = (await response.json()) as
        | AnalyzeStyleResponse
        | { error?: string };

      if (!response.ok || !("template" in data)) {
        throw new Error(getApiErrorMessage(data, "用户自建 Skill 提取失败，请稍后重试。"));
      }

      const nextSkill = {
        ...templateToCustomSkill(data.template),
        originalText: styleDocument,
      };
      const nextSkills = addCustomSkill(nextSkill);
      setCustomSkills(nextSkills);
      setSkillDetailId(nextSkill.id);
      setActiveView("style-detail");

      if (isCustomSkillCompatibleWithTask(nextSkill, taskType)) {
        setSelectedCustomSkillIdState(nextSkill.id);
        setSelectedCustomSkillId(nextSkill.id);
        setOutputMode("template");
      }

      setTemplateName("");
      setSourceName("");
      setSourceType("");
      setDocumentType("");
      setUserRequirement("");
      setStyleDocument("");
    } catch (error) {
      if (error instanceof Error) {
        setStyleErrorMsg(error.message);
      } else {
        setStyleErrorMsg("用户自建 Skill 提取失败，请稍后重试。");
      }
    } finally {
      setIsAnalyzingStyle(false);
    }
  }

  function handleDeleteCustomSkill(skillId: string) {
    const nextSkills = deleteCustomSkill(skillId);
    setCustomSkills(nextSkills);
    if (skillDetailId === skillId) {
      setSkillDetailId("");
      setActiveView("style");
    }

    const nextSelectedId = getSelectedCustomSkillId();
    setSelectedCustomSkillIdState(nextSelectedId);

    if (!nextSelectedId) {
      setOutputMode("standard");
    }
  }

  async function persistHistoryItem(item: DocumentHistoryItem) {
    try {
      const nextItems = await saveHistoryItem(item);
      setHistoryItems(nextItems);
      setHistoryErrorMsg("");
    } catch (error) {
      setHistoryErrorMsg(getErrorMessage(error, "历史记录保存失败。"));
    }
  }

  function buildHistoryItem({
    id,
    resultMarkdown,
    revisions,
    createdAt,
    title,
    updatedAt,
    strategySnapshot,
  }: {
    id?: string;
    resultMarkdown: string;
    revisions: RevisionItem[];
    createdAt?: string;
    title?: string;
    updatedAt?: string;
    strategySnapshot: PromptPreview;
  }): DocumentHistoryItem {
    const now = new Date().toISOString();
    const activeCustomSkill =
      outputMode === "template" ? selectedCustomSkillForCurrentTask : null;

    return {
      id: id || crypto.randomUUID(),
      title: title || createHistoryTitle(input, currentTask.label),
      taskType,
      input,
      context,
      otherParameters,
      externalSources,
      taskParameters,
      outputMode,
      skillName: activeCustomSkill?.name ?? currentSkill.name,
      templateId: activeCustomSkill?.id,
      templateName: activeCustomSkill?.name,
      strategySnapshot,
      resultMarkdown,
      revisions,
      createdAt: createdAt || now,
      updatedAt: updatedAt || now,
    };
  }

  function handleOpenHistoryItem(item: DocumentHistoryItem) {
    const customSkillStillExists =
      item.templateId &&
      customSkills.some(
        (skill) =>
          skill.id === item.templateId &&
          isCustomSkillCompatibleWithTask(skill, item.taskType)
      );

    setTaskType(item.taskType);
    setActiveView(item.taskType);
    setInput(item.input);
    setContext(item.context);
    setOtherParameters(item.otherParameters ?? "");
    setSourceUrlInput("");
    setExternalSources(item.externalSources ?? []);
    setFetchUrlStatusItems([]);
    setTaskParameters({
      ...getDefaultTaskParameters(item.taskType),
      ...item.taskParameters,
    });
    setOutputMode(
      item.outputMode === "template" && customSkillStillExists
        ? "template"
        : "standard"
    );
    if (customSkillStillExists && item.templateId) {
      setSelectedCustomSkillIdState(item.templateId);
      setSelectedCustomSkillId(item.templateId);
    }
    setResult(item.resultMarkdown);
    setRevisionInstruction("");
    setRevisionHistory(item.revisions ?? []);
    setErrorMsg("");
    setRevisionErrorMsg("");
    setSkillSupplementAnswers({});
    setCurrentHistoryId(item.id);
    setLastPromptPreview(
      isPromptPreview(item.strategySnapshot) ? item.strategySnapshot : null
    );
  }

  async function handleDeleteHistoryItem(id: string) {
    try {
      const nextItems = await deleteHistoryItem(id);
      setHistoryItems(nextItems);
      setHistoryErrorMsg("");

      if (currentHistoryId === id) {
        setCurrentHistoryId("");
      }
    } catch (error) {
      setHistoryErrorMsg(getErrorMessage(error, "删除历史记录失败。"));
    }
  }

  async function handleRenameHistoryItem(id: string, title: string) {
    const nextTitle = title.trim();

    if (!nextTitle) {
      setHistoryErrorMsg("历史记录标题不能为空。");
      return;
    }

    const targetItem = historyItems.find((item) => item.id === id);

    if (!targetItem) {
      setHistoryErrorMsg("没有找到这条历史记录。");
      return;
    }

    const nextItem = {
      ...targetItem,
      title: nextTitle,
      updatedAt: new Date().toISOString(),
    };

    try {
      const nextItems = await saveHistoryItem(nextItem);
      setHistoryItems(nextItems);
      setHistoryErrorMsg("");
    } catch (error) {
      setHistoryErrorMsg(getErrorMessage(error, "重命名历史记录失败。"));
    }
  }

  async function handleClearHistoryItems() {
    try {
      const nextItems = await clearHistoryItems();
      setHistoryItems(nextItems);
      setCurrentHistoryId("");
      setHistoryErrorMsg("");
    } catch (error) {
      setHistoryErrorMsg(getErrorMessage(error, "清空历史记录失败。"));
    }
  }

  function handleExportLocalBackup() {
    const backup: ProductGptLocalBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      historyItems,
      styleTemplates: [],
      selectedTemplateId: selectedCustomSkillId,
      customSkills,
      selectedCustomSkillId,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `productgpt-backup-${formatBackupTimestamp(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setLocalSettingsMsg("本地数据已导出。");
  }

  async function handleImportLocalBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const backup = normalizeLocalBackup(parsed);

      if (!backup) {
        setLocalSettingsMsg("导入失败：备份文件格式不正确。");
        return;
      }

      const nextHistoryItems = mergeById(historyItems, backup.historyItems);
      const incomingSkills = backup.customSkills?.length
        ? backup.customSkills
        : backup.styleTemplates.map(templateToCustomSkill);
      const nextCustomSkills = mergeById(customSkills, incomingSkills);
      const backupSelectedSkillId =
        backup.selectedCustomSkillId || backup.selectedTemplateId;
      const nextSelectedSkillId = nextCustomSkills.some(
        (skill) => skill.id === backupSelectedSkillId
      )
        ? backupSelectedSkillId
        : selectedCustomSkillId;

      const savedHistoryItems = await saveHistoryItems(nextHistoryItems);
      saveCustomSkills(nextCustomSkills);
      setHistoryItems(savedHistoryItems);
      setCustomSkills(nextCustomSkills);
      setSelectedCustomSkillIdState(nextSelectedSkillId);
      setSelectedCustomSkillId(nextSelectedSkillId);
      setLocalSettingsMsg(
        `导入完成：历史记录 ${backup.historyItems.length} 条，用户自建 Skill ${incomingSkills.length} 个。`
      );
    } catch (error) {
      setLocalSettingsMsg(getErrorMessage(error, "导入失败：无法读取备份文件。"));
    }
  }

  async function handleFetchUrl() {
    const urls = extractUrls(`${sourceUrlInput}\n${input}`);
    const existingUrls = new Set(externalSources.map((source) => source.url));
    const remainingSlots = maxExternalSourceCount - externalSources.length;
    const pendingUrls = urls
      .filter((url) => !existingUrls.has(url))
      .slice(0, Math.max(remainingSlots, 0));

    if (!urls.length) {
      setFetchUrlStatusItems([
        {
          url: "",
          status: "failed",
          message: "请先输入或粘贴一个公开网页网址。",
        },
      ]);
      return;
    }

    if (remainingSlots <= 0) {
      setFetchUrlStatusItems([
        {
          url: "",
          status: "failed",
          message: `最多保留 ${maxExternalSourceCount} 个网页资料，请先移除不需要的来源。`,
        },
      ]);
      return;
    }

    if (!pendingUrls.length) {
      setFetchUrlStatusItems([
        {
          url: "",
          status: "failed",
          message: "这些网址已经抓取过了。",
        },
      ]);
      return;
    }

    try {
      setIsFetchingUrl(true);
      setFetchUrlStatusItems([]);

      const settledResults = await Promise.all(
        pendingUrls.map((url) => fetchExternalSource(url))
      );
      const successfulSources = settledResults
        .filter((result): result is { url: string; source: WebSource } =>
          Boolean("source" in result)
        )
        .map((result) => result.source);
      const statusItems: FetchUrlStatusItem[] = settledResults.map((result) =>
        "source" in result
          ? {
              url: result.url,
              status: "success",
              message: `已抓取：${result.source.title}`,
            }
          : {
              url: result.url,
              status: "failed",
              message: result.error,
            }
      );

      setExternalSources((current) =>
        [...successfulSources, ...current].slice(0, maxExternalSourceCount)
      );
      setFetchUrlStatusItems(statusItems);
      if (successfulSources.length) {
        setSourceUrlInput("");
      }
    } finally {
      setIsFetchingUrl(false);
    }
  }

  async function fetchExternalSource(url: string): Promise<
    | { url: string; source: WebSource }
    | { url: string; error: string }
  > {
    try {
      const response = await fetch("/api/fetch-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as FetchUrlResponse | { error?: string };

      if (!response.ok || !("source" in data)) {
        throw new Error(getApiErrorMessage(data, "网页抓取失败，请稍后重试。"));
      }

      return { url, source: data.source };
    } catch (error) {
      return {
        url,
        error: getFetchFailureMessage(
          url,
          getErrorMessage(error, "网页抓取失败，请稍后重试。")
        ),
      };
    }
  }

  function handleRemoveExternalSource(sourceId: string) {
    setExternalSources((current) =>
      current.filter((source) => source.id !== sourceId)
    );
  }

  async function handleGenerate() {
    const hasInputInfo =
      Boolean(input.trim()) ||
      Boolean(context.trim()) ||
      Boolean(otherParameters.trim()) ||
      Boolean(externalSources.length) ||
      Object.keys(activeSkillSupplementAnswers).length > 0;

    if (!hasInputInfo) {
      setErrorMsg("请先填写输入信息，或粘贴资料、抓取网页、补充说明后再生成。");
      return;
    }

    if (input.length > maxInputLength) {
      setErrorMsg(`其它资料过长，请控制在 ${maxInputLength} 字以内。`);
      return;
    }

    if (outputMode === "template" && !selectedCustomSkillForCurrentTask) {
      setErrorMsg(
        `当前${currentTask.label}没有可用的用户自建 Skill。请先使用系统默认 Skill，或前往用户 Skill 库创建匹配的用户自建 Skill。`
      );
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg("");
      setResult("");
      setRevisionInstruction("");
      setRevisionHistory([]);
      setRevisionErrorMsg("");
      setLastPromptPreview(promptPreview);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskType,
          input,
          outputMode,
          context: buildGenerationContext({
            context,
            externalSources,
            otherParameters,
            parameterConfig: currentParameterConfig,
            parameters: taskParameters,
            customSkill:
              outputMode === "template"
                ? selectedCustomSkillForCurrentTask
                : undefined,
            skillSupplementAnswers: activeSkillSupplementAnswers,
          }),
          customSkill:
            outputMode === "template"
              ? selectedCustomSkillForCurrentTask ?? undefined
              : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "生成失败，请稍后重试。"));
      }

      const resultData = data as GenerateResponse;
      const nextResult = normalizeMarkdownTables(resultData.result);
      const existingHistoryItem = historyItems.find(
        (item) => item.id === currentHistoryId
      );
      const nextHistoryItem = buildHistoryItem({
        id: existingHistoryItem?.id ?? currentHistoryId,
        resultMarkdown: nextResult,
        revisions: [],
        createdAt: existingHistoryItem?.createdAt,
        title: existingHistoryItem?.title,
        strategySnapshot: promptPreview,
      });

      setResult(nextResult);
      setCurrentHistoryId(nextHistoryItem.id);
      await persistHistoryItem(nextHistoryItem);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("生成失败，请稍后重试。");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRevise(options?: RevisionSubmitOptions) {
    if (!result.trim()) {
      setRevisionErrorMsg("请先生成文档后再继续修改。");
      return;
    }

    const nextInstruction = options?.instruction ?? revisionInstruction;
    const revisionMode = options?.revisionMode ?? "global";

    if (!nextInstruction.trim()) {
      setRevisionErrorMsg("请先输入你想怎么修改。");
      return;
    }

    if (revisionMode === "selection" && !options?.selectedText?.trim()) {
      setRevisionErrorMsg("请先在生成结果中选中要修改的内容。");
      return;
    }

    try {
      setIsRevising(true);
      setRevisionErrorMsg("");

      const before = result;
      const response = await fetch("/api/revise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskType,
          input,
          currentResult: before,
          instruction: nextInstruction,
          revisionMode,
          selectedText: options?.selectedText,
          outputMode,
          context: buildGenerationContext({
            context,
            externalSources,
            otherParameters,
            parameterConfig: currentParameterConfig,
            parameters: taskParameters,
            customSkill:
              outputMode === "template"
                ? selectedCustomSkillForCurrentTask
                : undefined,
            skillSupplementAnswers: activeSkillSupplementAnswers,
          }),
          customSkill:
            outputMode === "template"
              ? selectedCustomSkillForCurrentTask ?? undefined
              : undefined,
        }),
      });

      const data = (await response.json()) as ReviseResponse | { error?: string };

      if (!response.ok || !("result" in data)) {
        throw new Error(getApiErrorMessage(data, "修改失败，请稍后重试。"));
      }

      const after = normalizeMarkdownTables(data.result);
      const revision: RevisionItem = {
        id: crypto.randomUUID(),
        type: revisionMode === "selection" ? "local" : "global",
        instruction: nextInstruction.trim(),
        before,
        after,
        createdAt: new Date().toISOString(),
      };
      const nextRevisionHistory = [revision, ...revisionHistory].slice(0, 5);
      const existingHistoryItem = historyItems.find(
        (item) => item.id === currentHistoryId
      );
      const nextHistoryItem = buildHistoryItem({
        id: existingHistoryItem?.id ?? currentHistoryId,
        resultMarkdown: after,
        revisions: nextRevisionHistory,
        createdAt: existingHistoryItem?.createdAt,
        title: existingHistoryItem?.title,
        strategySnapshot: lastPromptPreview ?? promptPreview,
      });

      setResult(after);
      setRevisionHistory(nextRevisionHistory);
      if (revisionMode === "global") {
        setRevisionInstruction("");
      }
      setCurrentHistoryId(nextHistoryItem.id);
      await persistHistoryItem(nextHistoryItem);
    } catch (error) {
      if (error instanceof Error) {
        setRevisionErrorMsg(error.message);
      } else {
        setRevisionErrorMsg("修改失败，请稍后重试。");
      }
    } finally {
      setIsRevising(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
  }

  function handleExportMarkdown() {
    if (!result) return;

    const blob = new Blob([result], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentTask.label}-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handlePrintPdf() {
    window.print();
  }

  return (
    <main className="app-shell min-h-[100dvh] bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="grid min-h-16 grid-cols-[240px_minmax(0,1fr)_auto] items-center gap-4 px-5">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span>ProductGPT</span>
          </Link>

          <div />

          <div className="relative flex items-center justify-end gap-2">
            <Button
              variant={topPanel === "status" ? "secondary" : "ghost"}
              size="sm"
              onClick={() =>
                setTopPanel((current) =>
                  current === "status" ? null : "status"
                )
              }
            >
              <Gauge className="mr-2 h-4 w-4" />
              状态
            </Button>
            <Button
              variant={topPanel === "settings" ? "secondary" : "ghost"}
              size="sm"
              onClick={() =>
                setTopPanel((current) =>
                  current === "settings" ? null : "settings"
                )
              }
            >
              <Settings className="mr-2 h-4 w-4" />
              本地设置
            </Button>

            {topPanel ? (
              <TopUtilityPanel
                activePanel={topPanel}
                backupFileInputRef={backupFileInputRef}
                deepseekApiKeyConfigured={deepseekApiKeyConfigured}
                externalSourceCount={externalSources.length}
                handleClearHistoryItems={handleClearHistoryItems}
                handleExportLocalBackup={handleExportLocalBackup}
                handleImportLocalBackup={handleImportLocalBackup}
                historyCount={historyItems.length}
                localSettingsMsg={localSettingsMsg}
                setActiveView={setActiveView}
                setTopPanel={setTopPanel}
                templateCount={customSkills.length}
              />
            ) : null}
          </div>
        </div>
      </header>

      <ScrollQuickActions />

      <div className="grid min-h-[calc(100dvh-65px)] grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-r bg-background px-4 py-5">
          <div className="px-3 pb-2 text-xs font-medium text-muted-foreground">
            工作台
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = taskIcons[item.value];
              const isActive = activeView === item.value;

              return (
                <button
                  key={item.value}
                  onClick={() => handleTaskChange(item.value)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition active:translate-y-px ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="my-6 h-px bg-border" />

          <nav className="space-y-1">
            {[
              { label: "用户 Skill 库", value: "style" as ActiveView, icon: Star },
              {
                label: "内置能力说明",
                value: "skills" as ActiveView,
                icon: Sparkles,
              },
              {
                label: "Skills 广场",
                value: "skills-market" as ActiveView,
                icon: Gauge,
              },
              {
                label: "历史记录",
                value: "history" as ActiveView,
                icon: History,
              },
              { label: "设置", value: "settings" as const, icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive =
                activeView === item.value ||
                (item.value === "style" &&
                  (activeView === "style-create" ||
                    activeView === "skill-import" ||
                    activeView === "style-detail"));

              return (
                <button
                  key={item.label}
                  onClick={() =>
                    item.value !== "settings" && setActiveView(item.value)
                  }
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition active:translate-y-px ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {isTaskView(activeView) ? (
          <ToolWorkspace
            context={context}
            currentSkill={currentSkill}
            currentParameterConfig={currentParameterConfig}
            currentTask={currentTask}
            errorMsg={errorMsg}
            externalSources={externalSources}
            fetchUrlStatusItems={fetchUrlStatusItems}
            handleCopy={handleCopy}
            handleExportMarkdown={handleExportMarkdown}
            handleFetchUrl={handleFetchUrl}
            handleGenerate={handleGenerate}
            handlePrintPdf={handlePrintPdf}
            handleRemoveExternalSource={handleRemoveExternalSource}
            handleRevise={handleRevise}
            handleSelectTemplate={handleSelectCustomSkill}
            hideNewUserGuide={() => {
              window.localStorage.setItem(newUserGuideDismissedKey, "true");
              setShowNewUserGuide(false);
            }}
            input={input}
            isFetchingUrl={isFetchingUrl}
            isLoading={isLoading}
            isRevising={isRevising}
            outputMode={outputMode}
            otherParameters={otherParameters}
            result={result}
            revisionErrorMsg={revisionErrorMsg}
            revisionHistory={revisionHistory}
            revisionInstruction={revisionInstruction}
            strategyPreview={lastPromptPreview ?? promptPreview}
            selectedTemplate={selectedCustomSkillForCurrentTask}
            setActiveView={setActiveView}
            setContext={setContext}
            setInput={setInput}
            setOutputMode={setOutputMode}
            setOtherParameters={setOtherParameters}
            setRevisionInstruction={setRevisionInstruction}
            setSourceUrlInput={setSourceUrlInput}
            setSkillSupplementAnswers={setSkillSupplementAnswers}
            sourceUrlInput={sourceUrlInput}
            taskParameters={taskParameters}
            templates={compatibleCustomSkills}
            skillSupplementAnswers={skillSupplementAnswers}
            showNewUserGuide={showNewUserGuide}
            updateTaskParameter={updateTaskParameter}
          />
        ) : activeView === "style" ? (
          <StyleTemplateLibrary
            handleDeleteTemplate={handleDeleteCustomSkill}
            handleOpenTemplateDetail={handleOpenSkillDetail}
            handleSelectTemplate={handleSelectCustomSkill}
            selectedTemplateId={selectedCustomSkillId}
            setActiveView={setActiveView}
            setOutputMode={setOutputMode}
            taskType={taskType}
            templates={customSkills}
          />
        ) : activeView === "style-create" ? (
          <StyleTemplateCreateView
            documentType={documentType}
            handleAnalyzeStyle={handleAnalyzeStyle}
            handleStyleFileUpload={handleStyleFileUpload}
            isAnalyzingStyle={isAnalyzingStyle}
            setActiveView={setActiveView}
            setDocumentType={setDocumentType}
            setSourceName={setSourceName}
            setSourceType={setSourceType}
            setStyleDocument={setStyleDocument}
            setTemplateName={setTemplateName}
            setUserRequirement={setUserRequirement}
            sourceName={sourceName}
            sourceType={sourceType}
            styleDocument={styleDocument}
            styleErrorMsg={styleErrorMsg}
            templateName={templateName}
            userRequirement={userRequirement}
          />
        ) : activeView === "style-detail" ? (
          <StyleTemplateDetailView
            handleDeleteTemplate={handleDeleteCustomSkill}
            handleSelectTemplate={handleSelectCustomSkill}
            handleTemplateRuleChange={handleTemplateRuleChange}
            handleTemplateTextFieldChange={handleTemplateTextFieldChange}
            selectedTemplateId={selectedCustomSkillId}
            setActiveView={setActiveView}
            setOutputMode={setOutputMode}
            taskType={taskType}
            template={skillDetail}
          />
        ) : activeView === "skill-import" ? (
          <ImportCustomSkillView
            documentType={importSkillDocumentType}
            handleAnalyzeImportedSkill={handleAnalyzeImportedSkill}
            handleImportSkillFileUpload={handleImportSkillFileUpload}
            handleSaveImportedSkill={handleSaveImportedSkill}
            importSkillErrorMsg={importSkillErrorMsg}
            importSkillPreview={importSkillPreview}
            importSkillRequirement={importSkillRequirement}
            importSkillSourceName={importSkillSourceName}
            importSkillText={importSkillText}
            isAnalyzingImportSkill={isAnalyzingImportSkill}
            setActiveView={setActiveView}
            setDocumentType={setImportSkillDocumentType}
            setImportSkillName={setImportSkillName}
            setImportSkillRequirement={setImportSkillRequirement}
            setImportSkillSourceName={setImportSkillSourceName}
            setImportSkillText={setImportSkillText}
            skillName={importSkillName}
          />
        ) : activeView === "skills" ? (
          <BuiltInCapabilityView
            handleTaskChange={handleTaskChange}
            taskType={taskType}
          />
        ) : activeView === "skills-market" ? (
          <SkillsMarketView />
        ) : (
          <HistoryView
            currentHistoryId={currentHistoryId}
            handleClearHistoryItems={handleClearHistoryItems}
            handleDeleteHistoryItem={handleDeleteHistoryItem}
            handleOpenHistoryItem={handleOpenHistoryItem}
            handleRenameHistoryItem={handleRenameHistoryItem}
            historyErrorMsg={historyErrorMsg}
            historyItems={historyItems}
            isHistoryLoading={isHistoryLoading}
          />
        )}
      </div>
      {result ? (
        <PrintableResultDocument result={result} taskTitle={currentTask.label} />
      ) : null}
    </main>
  );
}

function TopUtilityPanel({
  activePanel,
  backupFileInputRef,
  deepseekApiKeyConfigured,
  externalSourceCount,
  handleClearHistoryItems,
  handleExportLocalBackup,
  handleImportLocalBackup,
  historyCount,
  localSettingsMsg,
  setActiveView,
  setTopPanel,
  templateCount,
}: {
  activePanel: Exclude<TopPanel, null>;
  backupFileInputRef: RefObject<HTMLInputElement | null>;
  deepseekApiKeyConfigured: boolean | null;
  externalSourceCount: number;
  handleClearHistoryItems: () => Promise<void>;
  handleExportLocalBackup: () => void;
  handleImportLocalBackup: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  historyCount: number;
  localSettingsMsg: string;
  setActiveView: (view: ActiveView) => void;
  setTopPanel: (panel: TopPanel) => void;
  templateCount: number;
}) {
  function openView(view: ActiveView) {
    setActiveView(view);
    setTopPanel(null);
  }

  if (activePanel === "status") {
    return (
      <div className="absolute right-0 top-12 w-[360px] rounded-lg border bg-background p-4 shadow-lg">
        <div>
          <div className="text-sm font-semibold">运行状态</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            当前版本使用本地浏览器数据保存历史和用户自建 Skill，不依赖账号系统。
          </p>
        </div>
        <div className="mt-4 grid gap-2">
          <StatusRow
            label="DeepSeek API Key"
            value={
              deepseekApiKeyConfigured === null
                ? "检测中"
                : deepseekApiKeyConfigured
                  ? "已配置"
                  : "未配置"
            }
            tone={deepseekApiKeyConfigured ? "success" : "muted"}
          />
          <StatusRow label="本地历史记录" value={`${historyCount} 条`} />
          <StatusRow label="用户自建 Skill" value={`${templateCount} 个`} />
          <StatusRow label="当前网页资料" value={`${externalSourceCount} 个`} />
          <StatusRow label="数据保存方式" value="浏览器本地" />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-12 w-[380px] rounded-lg border bg-background p-4 shadow-lg">
      <div>
        <div className="text-sm font-semibold">本地设置</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          这里放当前版本真实可用的本地数据入口。API Key 通过项目环境变量配置，不在浏览器里保存。
        </p>
      </div>

      <div className="mt-4 grid gap-2">
        <Button
          variant="outline"
          className="justify-start"
          onClick={handleExportLocalBackup}
        >
          <Download className="mr-2 h-4 w-4" />
          导出本地数据
        </Button>
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => backupFileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          导入本地数据
        </Button>
        <Input
          ref={backupFileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportLocalBackup}
          className="sr-only"
        />
        <Button variant="outline" className="justify-start" onClick={() => openView("history")}>
          <History className="mr-2 h-4 w-4" />
          查看历史记录
        </Button>
        <Button variant="outline" className="justify-start" onClick={() => openView("style")}>
          <Star className="mr-2 h-4 w-4" />
          管理用户 Skill 库
        </Button>
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => openView("skills")}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          查看内置能力说明
        </Button>
        <Button
          variant="outline"
          className="justify-start"
          disabled={!historyCount}
          onClick={async () => {
            await handleClearHistoryItems();
            setTopPanel(null);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          清空历史记录
        </Button>
      </div>

      {localSettingsMsg ? (
        <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
          {localSettingsMsg}
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
        清理浏览器数据会导致本地历史记录和用户自建 Skill 丢失。上传 GitHub 或部署前，不要提交
        <span className="font-medium text-foreground"> .env.local </span>
        或任何 API Key。
      </div>
    </div>
  );
}

function ScrollQuickActions() {
  function getScrollTarget() {
    return document.querySelector<HTMLElement>("[data-result-scroll-area]");
  }

  function scrollToPosition(position: "top" | "bottom") {
    const target = getScrollTarget();

    if (target) {
      target.scrollTo({
        top: position === "top" ? 0 : target.scrollHeight,
        behavior: "smooth",
      });
      return;
    }

    window.scrollTo({
      top: position === "top" ? 0 : document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }

  return (
    <div className="fixed bottom-5 right-5 z-30 flex flex-col gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        className="bg-background shadow-sm"
        onClick={() => scrollToPosition("top")}
      >
        顶部
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="bg-background shadow-sm"
        onClick={() => scrollToPosition("bottom")}
      >
        底部
      </Button>
    </div>
  );
}

function StatusRow({
  label,
  tone = "muted",
  value,
}: {
  label: string;
  tone?: "muted" | "success";
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          tone === "success" ? "font-medium text-foreground" : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}

function NewUserGuide({
  currentTaskLabel,
  onDismiss,
  onOpenSkillLibrary,
}: {
  currentTaskLabel: string;
  onDismiss: () => void;
  onOpenSkillLibrary: () => void;
}) {
  const guideItems = [
    {
      title: "先选生成能力",
      description: `直接使用系统默认 Skill 生成${currentTaskLabel}，或切到用户自建 Skill。`,
    },
    {
      title: "再填输入信息",
      description: "按 Skill 问题填写关键信息；资料、网页和其它说明都是可选补充。",
    },
    {
      title: "生成后继续改",
      description: "结果页支持全文修改、选中片段修改、Markdown 查看和本地历史保存。",
    },
  ];

  return (
    <section className="rounded-xl border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">第一次使用建议</div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            不确定怎么开始时，按下面三步走；不需要先准备完整文档。
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="关闭新用户引导"
          onClick={onDismiss}
          className="-mr-2 -mt-2 h-8 w-8 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 grid gap-2">
        {guideItems.map((item) => (
          <div
            key={item.title}
            className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-lg border bg-background px-3 py-2"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-medium">{item.title}</div>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onOpenSkillLibrary}>
          查看用户 Skill 库
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          我知道了
        </Button>
      </div>
    </section>
  );
}

function ToolWorkspace({
  context,
  currentSkill,
  currentParameterConfig,
  currentTask,
  errorMsg,
  externalSources,
  fetchUrlStatusItems,
  handleCopy,
  handleExportMarkdown,
  handleFetchUrl,
  handleGenerate,
  handlePrintPdf,
  handleRemoveExternalSource,
  handleRevise,
  handleSelectTemplate,
  hideNewUserGuide,
  input,
  isFetchingUrl,
  isLoading,
  isRevising,
  outputMode,
  otherParameters,
  result,
  revisionErrorMsg,
  revisionHistory,
  revisionInstruction,
  selectedTemplate,
  setActiveView,
  setContext,
  setInput,
  setOutputMode,
  setOtherParameters,
  setRevisionInstruction,
  setSourceUrlInput,
  setSkillSupplementAnswers,
  skillSupplementAnswers,
  showNewUserGuide,
  sourceUrlInput,
  strategyPreview,
  taskParameters,
  templates,
  updateTaskParameter,
}: {
  context: string;
  currentSkill: (typeof productSkills)[number];
  currentParameterConfig: TaskParameter[];
  currentTask: (typeof taskConfigs)[number];
  errorMsg: string;
  externalSources: WebSource[];
  fetchUrlStatusItems: FetchUrlStatusItem[];
  handleCopy: () => Promise<void>;
  handleExportMarkdown: () => void;
  handleFetchUrl: () => Promise<void>;
  handleGenerate: () => Promise<void>;
  handlePrintPdf: () => void;
  handleRemoveExternalSource: (sourceId: string) => void;
  handleRevise: (options?: RevisionSubmitOptions) => Promise<void>;
  handleSelectTemplate: (templateId: string) => void;
  hideNewUserGuide: () => void;
  input: string;
  isFetchingUrl: boolean;
  isLoading: boolean;
  isRevising: boolean;
  outputMode: OutputMode;
  otherParameters: string;
  result: string;
  revisionErrorMsg: string;
  revisionHistory: RevisionItem[];
  revisionInstruction: string;
  selectedTemplate: CustomSkill | null;
  setActiveView: (view: ActiveView) => void;
  setContext: (value: string) => void;
  setInput: (value: string) => void;
  setOutputMode: (value: OutputMode) => void;
  setOtherParameters: (value: string) => void;
  setRevisionInstruction: (value: string) => void;
  setSourceUrlInput: (value: string) => void;
  setSkillSupplementAnswers: (value: Record<string, string>) => void;
  skillSupplementAnswers: Record<string, string>;
  showNewUserGuide: boolean;
  sourceUrlInput: string;
  strategyPreview: PromptPreview;
  taskParameters: Record<string, TaskParameterValue>;
  templates: CustomSkill[];
  updateTaskParameter: (key: string, value: TaskParameterValue) => void;
}) {
  const detectedInputUrls = extractUrls(input);
  const urlCandidates = extractUrls(`${sourceUrlInput}\n${input}`);
  const canFetchUrl =
    Boolean(urlCandidates.length) &&
    externalSources.length < maxExternalSourceCount;
  const activeSkillSupplementGroups = getActiveSkillSupplementGroups({
    currentSkill,
    outputMode,
    selectedTemplate,
  });

  return (
    <section className="grid h-[calc(100dvh-65px)] min-h-0 gap-4 overflow-hidden p-4 xl:grid-cols-[minmax(520px,0.82fr)_minmax(680px,1.18fr)]">
      <div className="min-h-0 space-y-4 overflow-y-auto pr-2">
        {showNewUserGuide ? (
          <NewUserGuide
            currentTaskLabel={currentTask.label.replace("生成", "")}
            onDismiss={hideNewUserGuide}
            onOpenSkillLibrary={() => setActiveView("style")}
          />
        ) : null}
        <div className="flex flex-col gap-4">
          <Card className="order-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-xs">
                  2
                </span>
                输入信息
              </CardTitle>
              <CardDescription>
                请填写当前 Skill 生成文档所需的信息。没有的信息可以留空，系统会标为待确认。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeSkillSupplementGroups.length ? (
                <SkillSupplementFields
                  groups={activeSkillSupplementGroups}
                  answers={skillSupplementAnswers}
                  setAnswers={setSkillSupplementAnswers}
                />
              ) : null}
              <div>
                <label className="mb-2 block text-xs font-medium">
                  其它资料，可选
                </label>
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                  placeholder="粘贴用户反馈、竞品资料、老板原话、会议记录、调研摘录或其它大段材料。"
                className="min-h-[160px] resize-none bg-background"
              />
              <div className="mt-2 text-right text-xs text-muted-foreground">
                {input.length} / {maxInputLength}
              </div>
              </div>
              <div className="mt-3 rounded-lg border bg-muted/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Globe2 className="h-4 w-4" />
                      网页资料，可选
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      支持一次粘贴多个公开网页 URL，最多保留 {maxExternalSourceCount} 个资料来源。飞书、知乎、登录页和强动态页面可能失败。
                    </p>
                  </div>
                  {detectedInputUrls.length ? (
                    <Badge variant="outline">
                      检测到 {detectedInputUrls.length} 个网址
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Textarea
                    value={sourceUrlInput}
                    onChange={(event) => setSourceUrlInput(event.target.value)}
                    placeholder={
                      detectedInputUrls.length
                        ? "已从其它资料中检测到网址，也可以继续补充其它 URL"
                        : "粘贴公开网页 URL，可一行一个，例如竞品官网、价格页、文档页"
                    }
                    className="min-h-[72px] resize-none bg-background text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={handleFetchUrl}
                    disabled={isFetchingUrl || !canFetchUrl}
                  >
                    {isFetchingUrl ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        抓取中
                      </>
                    ) : (
                      <>
                        <Globe2 className="mr-2 h-4 w-4" />
                        批量抓取
                      </>
                    )}
                  </Button>
                </div>
                {fetchUrlStatusItems.length ? (
                  <div className="mt-3 space-y-1.5">
                    {fetchUrlStatusItems.map((item, index) => (
                      <div
                        key={`${item.url}-${index}`}
                        className={`rounded-md border px-2.5 py-2 text-xs leading-5 ${
                          item.status === "success"
                            ? "bg-primary/5 text-foreground"
                            : "bg-destructive/5 text-destructive"
                        }`}
                      >
                        {item.url ? (
                          <span className="mr-1 text-muted-foreground">
                            {item.url}
                          </span>
                        ) : null}
                        {item.message}
                      </div>
                    ))}
                  </div>
                ) : null}
                {externalSources.length ? (
                  <div className="mt-3 space-y-2">
                    {externalSources.map((source) => (
                      <div
                        key={source.id}
                        className="rounded-lg border bg-background p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {source.title}
                            </div>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">{source.url}</span>
                            </a>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="移除网页资料"
                            onClick={() => handleRemoveExternalSource(source.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {source.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="mt-3">
                <label className="mb-2 block text-xs font-medium">
                  其它说明，可选
                </label>
                <Textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="例如：第一版 2 周内完成；不做登录；需要偏研发协作口径。"
                  className="min-h-[72px] resize-none bg-background text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="order-1">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-xs">
                      1
                    </span>
                    生成能力
                  </CardTitle>
                  <CardDescription>
                    本次报告只会使用一种能力：系统默认 Skill 或用户自建 Skill。
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {outputMode === "template" ? "用户自建 Skill" : "系统默认 Skill"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={outputMode === "standard" ? "default" : "outline"}
                  onClick={() => {
                    setOutputMode("standard");
                    setSkillSupplementAnswers({});
                  }}
                >
                  系统默认 Skill
                </Button>
                <Button
                  variant={outputMode === "template" ? "default" : "outline"}
                  onClick={() => {
                    setSkillSupplementAnswers({});
                    if (templates.length) {
                      setOutputMode("template");
                    } else {
                      setActiveView("style");
                    }
                  }}
                >
                  用户自建 Skill
                </Button>
              </div>

              {outputMode === "template" ? (
                <div className="space-y-3">
                  {templates.length ? (
                    <div>
                      <label className="mb-2 block text-xs font-medium">
                        选择用户自建 Skill
                      </label>
                      <Select
                        value={selectedTemplate?.id || undefined}
                        onValueChange={(templateId) => {
                          handleSelectTemplate(templateId);
                          setOutputMode("template");
                        }}
                      >
                        <SelectTrigger className="w-full bg-background">
                          <SelectValue placeholder="请选择用户自建 Skill" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {selectedTemplate ? (
                    <>
                      <div className="rounded-lg border bg-background p-3">
                        <div className="text-sm font-medium">
                          {selectedTemplate.name}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {selectedTemplate.summary}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {[
                          ...selectedTemplate.parsedRules.analysisSteps.slice(0, 2),
                          ...selectedTemplate.parsedRules.reusableInstructions.slice(
                            0,
                            2
                          ),
                        ].map((rule) => (
                          <div
                            key={rule}
                            className="flex gap-2 rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span>{rule}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setActiveView("style")}
                      >
                        管理用户 Skill 库
                      </Button>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                      当前{currentTask.label}没有可用的用户自建 Skill。可以先使用系统默认 Skill，或前往用户 Skill 库创建匹配的用户自建 Skill。
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-background p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {(() => {
                          const Icon = taskIcons[currentSkill.id];
                          return <Icon className="h-5 w-5" />;
                        })()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {currentSkill.name}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {currentSkill.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {currentSkill.qualityRules.slice(0, 3).map((rule) => (
                      <div
                        key={rule}
                        className="flex gap-2 rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setActiveView("skills")}
                  >
                    查看系统能力说明
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-xs">
                3
              </span>
              参数配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {currentParameterConfig
                .filter((parameter) => parameter.type === "select")
                .map((parameter) => (
                <ParameterControl
                  key={parameter.key}
                  parameter={parameter}
                  value={taskParameters[parameter.key] ?? parameter.defaultValue}
                  onChange={(value) => updateTaskParameter(parameter.key, value)}
                />
              ))}
            </div>
            {currentParameterConfig.some(
              (parameter) => parameter.type === "tags"
            ) ? (
              <div className="grid gap-4 md:grid-cols-2">
                {currentParameterConfig
                  .filter((parameter) => parameter.type === "tags")
                  .map((parameter) => (
                    <ParameterControl
                      key={parameter.key}
                      parameter={parameter}
                      value={
                        taskParameters[parameter.key] ?? parameter.defaultValue
                      }
                      onChange={(value) =>
                        updateTaskParameter(parameter.key, value)
                      }
                    />
                  ))}
              </div>
            ) : null}
            <div className="rounded-lg border bg-muted/20 p-3">
              <label className="mb-2 block text-xs font-medium">其它参数</label>
              <Textarea
                value={otherParameters}
                onChange={(event) => setOtherParameters(event.target.value)}
                className="min-h-[84px] resize-none bg-background text-sm"
                placeholder="这里填写选项里没有覆盖的要求，例如：行业是医疗器械 SaaS；目标用户是一线销售主管；输出要偏投资人汇报口径。"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                如果上方某项选择了“其它”，请在这里写清楚具体内容。
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {errorMsg ? (
            <Alert variant="destructive">
              <AlertTitle>生成失败</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={isLoading}
            className="h-12 w-full text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                生成{currentTask.label.replace("生成", "")}
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            AI 将基于当前生成能力、输入信息和参数配置生成结构化文档
          </p>
        </div>
      </div>

      <Card className="flex min-h-0 overflow-hidden">
        <Tabs defaultValue="result" className="flex h-full min-h-0 w-full flex-col gap-0">
          <CardHeader className="shrink-0 border-b pb-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList variant="line">
                <TabsTrigger value="result">分析结果</TabsTrigger>
                <TabsTrigger value="markdown">
                  <Code2 className="h-4 w-4" />
                  Markdown 源码
                </TabsTrigger>
                <TabsTrigger value="strategy">生成策略</TabsTrigger>
              </TabsList>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!result}
                >
                  <Clipboard className="mr-2 h-4 w-4" />
                  复制
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportMarkdown}
                  disabled={!result}
                >
                  <Download className="mr-2 h-4 w-4" />
                  导出 Markdown
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintPdf}
                  disabled={!result}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  导出 PDF
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
            <TabsContent value="result" className="m-0 h-full overflow-hidden">
              <ResultPanel
                handleRevise={handleRevise}
                result={result}
                isLoading={isLoading}
                isRevising={isRevising}
                revisionErrorMsg={revisionErrorMsg}
                revisionHistory={revisionHistory}
                revisionInstruction={revisionInstruction}
                setRevisionInstruction={setRevisionInstruction}
                taskTitle={currentTask.label}
                useStyleTemplate={outputMode === "template" && Boolean(selectedTemplate)}
              />
            </TabsContent>

            <TabsContent value="markdown" className="m-0 h-full overflow-y-auto">
              <div className="min-h-full bg-background p-5">
                {result ? (
                  <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-6">
                    {result}
                  </pre>
                ) : (
                  <EmptyResult />
                )}
              </div>
            </TabsContent>

            <TabsContent value="strategy" className="m-0 h-full overflow-y-auto">
              <PromptStrategyPanel promptPreview={strategyPreview} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

    </section>
  );
}

function SkillSupplementFields({
  answers,
  groups,
  setAnswers,
}: {
  answers: Record<string, string>;
  groups: SkillSupplementGroup[];
  setAnswers: (value: Record<string, string>) => void;
}) {
  if (!groups.length) return null;

  return (
    <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">{group.title}</div>
              <Badge variant="outline">{group.badge}</Badge>
            </div>
            {group.description ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {group.description}
              </p>
            ) : null}
            <div className="mt-3 space-y-3">
              {group.questions.map((question) => {
                return (
                  <div key={question.key}>
                    <label className="mb-2 block text-xs font-medium">
                      {question.label}
                    </label>
                    <Textarea
                      value={answers[question.key] ?? ""}
                      onChange={(event) =>
                        setAnswers({
                          ...answers,
                          [question.key]: event.target.value,
                        })
                      }
                      className="min-h-[72px] resize-none bg-background text-sm"
                      placeholder="可选，但填写越完整，生成越稳定。"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}

function getActiveSkillSupplementGroups({
  currentSkill,
  outputMode,
  selectedTemplate,
}: {
  currentSkill: (typeof productSkills)[number];
  outputMode: OutputMode;
  selectedTemplate: CustomSkill | null;
}) {
  if (outputMode === "template" && selectedTemplate) {
    return getCustomSkillSupplementGroups(selectedTemplate);
  }

  return getSystemSkillSupplementGroups(currentSkill);
}

function filterSkillSupplementAnswers(
  answers: Record<string, string>,
  groups: SkillSupplementGroup[]
) {
  const validKeys = new Set(
    groups.flatMap((group) => group.questions.map((question) => question.key))
  );

  return Object.fromEntries(
    Object.entries(answers).filter(
      ([key, value]) => validKeys.has(key) && Boolean(value.trim())
    )
  );
}

function getSystemSkillSupplementGroups(
  skill: (typeof productSkills)[number]
): SkillSupplementGroup[] {
  if (!skill.requiredInputs.length) return [];

  return [
    {
      id: `system-${skill.id}-required-inputs`,
      title: "建议补充",
      description:
        "这些信息来自当前系统默认 Skill。可以不填，但填写后能减少泛化和待确认内容。",
      badge: "建议补充",
      questions: skill.requiredInputs.map((input) => ({
        key: `${skill.id} - ${input}`,
        label: input,
      })),
    },
  ];
}

function getCustomSkillSupplementGroups(skill: CustomSkill): SkillSupplementGroup[] {
  if (skill.parsedRules.guidedSteps.length) {
    const stepGroups = skill.parsedRules.guidedSteps
      .map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        badge: "分步补充",
        questions: step.questions.map((question) => ({
          key: `${step.title} - ${question}`,
          label: question,
        })),
      }))
      .filter((group) => group.questions.length > 0);
    const stepQuestionSet = new Set(
      stepGroups
        .flatMap((group) => group.questions.map((question) => question.label))
        .map(normalizeQuestionText)
    );
    const remainingRequiredInputs = skill.parsedRules.requiredInputs.filter(
      (input) => !stepQuestionSet.has(normalizeQuestionText(input))
    );

    if (!remainingRequiredInputs.length) {
      return stepGroups;
    }

    return [
      ...stepGroups,
      {
        id: "remaining-required-inputs",
        title: "其它建议补充",
        description:
          "这些信息来自该 Skill 的所需输入，但没有被归入具体步骤。",
        badge: "建议补充",
        questions: remainingRequiredInputs.map((input) => ({
          key: `其它建议补充 - ${input}`,
          label: input,
        })),
      },
    ];
  }

  if (skill.parsedRules.requiredInputs.length) {
    return [
      {
        id: "required-inputs",
        title: "建议补充",
        description:
          "这些信息来自该 Skill 的所需输入。可以不填，但填写后能减少泛化和待确认内容。",
        badge: "建议补充",
        questions: skill.parsedRules.requiredInputs.map((input) => ({
          key: `建议补充 - ${input}`,
          label: input,
        })),
      },
    ];
  }

  return [];
}

function normalizeQuestionText(value: string) {
  return value.replace(/\s+/g, "").replace(/[？?：:。.,，]/g, "");
}

function StyleTemplateLibrary({
  handleDeleteTemplate,
  handleOpenTemplateDetail,
  handleSelectTemplate,
  selectedTemplateId,
  setActiveView,
  setOutputMode,
  taskType,
  templates,
}: {
  handleDeleteTemplate: (templateId: string) => void;
  handleOpenTemplateDetail: (templateId: string) => void;
  handleSelectTemplate: (templateId: string) => void;
  selectedTemplateId: string;
  setActiveView: (view: ActiveView) => void;
  setOutputMode: (value: OutputMode) => void;
  taskType: TaskType;
  templates: CustomSkill[];
}) {
  const [skillSearch, setSkillSearch] = useState("");
  const filteredTemplates = useMemo(() => {
    const keyword = skillSearch.trim().toLowerCase();

    if (!keyword) return templates;

    return templates.filter((template) =>
      [
        template.name,
        template.summary,
        template.sourceName,
        template.originalText,
        getDocumentTypeLabelFromOptions(template.documentType),
        getCustomSkillSourceLabel(template),
        getCustomSkillSupplementModeLabel(template),
        ...template.parsedRules.requiredInputs,
        ...template.parsedRules.analysisSteps,
        ...template.parsedRules.outputStructure,
        ...template.parsedRules.qualityRules,
        ...template.parsedRules.constraints,
        ...template.parsedRules.structureRules,
        ...template.parsedRules.tableRules,
        ...template.parsedRules.toneRules,
        ...template.parsedRules.detailRules,
        ...template.parsedRules.formattingRules,
        ...template.parsedRules.decisionRules,
        ...template.parsedRules.reusableInstructions,
        ...template.parsedRules.applicableScenarios,
        ...template.parsedRules.antiPatterns,
        ...template.parsedRules.guidedSteps.flatMap((step) => [
          step.title,
          step.description,
          ...step.questions,
        ]),
      ]
        .filter(Boolean)
        .join("\n")
        .toLowerCase()
        .includes(keyword)
    );
  }, [skillSearch, templates]);
  const groupedTemplates = documentTypeOptions
    .map((option) => ({
      ...option,
      templates: filteredTemplates.filter(
        (template) => template.documentType === option.value
      ),
    }))
    .filter((group) => group.templates.length > 0);

  return (
    <section className="p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">用户 Skill 库</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              管理用户自建 Skill：可以从参考文档提取，也可以导入自己常用的现成 Skill。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setActiveView("style-create")}>
              <Plus className="mr-2 h-4 w-4" />
              从参考文档提取
            </Button>
            <Button onClick={() => setActiveView("skill-import")}>
              <Upload className="mr-2 h-4 w-4" />
              导入现成 Skill
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">用户自建 Skill 分类</CardTitle>
            <CardDescription>
              按文档类型归档。点击某个 Skill，进入规则详情页。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium">
                搜索用户 Skill
              </label>
              <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={skillSearch}
                  onChange={(event) => setSkillSearch(event.target.value)}
                  className="h-7 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  placeholder="搜索名称、摘要、规则、来源或原始文本"
                />
              </div>
            </div>
            {groupedTemplates.length ? (
              groupedTemplates.map((group) => (
                <section key={group.value} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{group.label}</div>
                    <Badge variant="secondary">{group.templates.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {group.templates.map((template) => (
                      <TemplateListCard
                        key={template.id}
                        handleDeleteTemplate={handleDeleteTemplate}
                        handleOpenTemplateDetail={handleOpenTemplateDetail}
                        handleSelectTemplate={handleSelectTemplate}
                        isCompatible={isCustomSkillCompatibleWithTask(
                          template,
                          taskType
                        )}
                        isSelected={selectedTemplateId === template.id}
                        setOutputMode={setOutputMode}
                        template={template}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-6 text-center">
                <div>
                  <div className="text-base font-medium">
                    {templates.length ? "没有匹配的用户 Skill" : "还没有用户自建 Skill"}
                  </div>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    {templates.length
                      ? "换个关键词试试，或清空搜索查看全部 Skill。"
                      : "可以先从参考文档提取，也可以导入自己平时使用的 Skill。"}
                  </p>
                </div>
                {templates.length ? (
                  <Button variant="outline" onClick={() => setSkillSearch("")}>
                    清空搜索
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setActiveView("style-create")}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      从参考文档提取
                    </Button>
                    <Button onClick={() => setActiveView("skill-import")}>
                      <Upload className="mr-2 h-4 w-4" />
                      导入现成 Skill
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function TemplateListCard({
  handleDeleteTemplate,
  handleOpenTemplateDetail,
  handleSelectTemplate,
  isCompatible,
  isSelected,
  setOutputMode,
  template,
}: {
  handleDeleteTemplate: (templateId: string) => void;
  handleOpenTemplateDetail: (templateId: string) => void;
  handleSelectTemplate: (templateId: string) => void;
  isCompatible: boolean;
  isSelected: boolean;
  setOutputMode: (value: OutputMode) => void;
  template: CustomSkill;
}) {
  return (
    <div
      className={`rounded-lg border bg-background p-3 ${
        isSelected && isCompatible ? "border-primary bg-primary/5" : ""
      }`}
    >
                        <button
                          onClick={() => handleOpenTemplateDetail(template.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium">{template.name}</div>
            {isSelected && isCompatible ? (
                              <Badge variant="outline">已启用</Badge>
            ) : isSelected ? (
              <Badge variant="outline">当前助手不匹配</Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                            {template.summary}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline">
                              {getCustomSkillSourceLabel(template)}
                            </Badge>
                            <Badge variant="outline">
                              {getCustomSkillSupplementModeLabel(template)}
                            </Badge>
                          </div>
                        </button>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenTemplateDetail(template.id)}
                          >
                            查看规则
                          </Button>
                          <Button
                            size="sm"
              disabled={!isCompatible}
                            onClick={() => {
                              handleSelectTemplate(template.id);
                              setOutputMode("template");
                            }}
                          >
              {isCompatible ? "启用" : "不可启用"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </Button>
                        </div>
    </div>
  );
}

function StyleTemplateCreateView({
  documentType,
  handleAnalyzeStyle,
  handleStyleFileUpload,
  isAnalyzingStyle,
  setActiveView,
  setDocumentType,
  setSourceName,
  setSourceType,
  setStyleDocument,
  setTemplateName,
  setUserRequirement,
  sourceName,
  sourceType,
  styleDocument,
  styleErrorMsg,
  templateName,
  userRequirement,
}: {
  documentType: DocumentType | "";
  handleAnalyzeStyle: () => Promise<void>;
  handleStyleFileUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  isAnalyzingStyle: boolean;
  setActiveView: (view: ActiveView) => void;
  setDocumentType: (value: DocumentType | "") => void;
  setSourceName: (value: string) => void;
  setSourceType: (value: SourceType | "") => void;
  setStyleDocument: (value: string) => void;
  setTemplateName: (value: string) => void;
  setUserRequirement: (value: string) => void;
  sourceName: string;
  sourceType: SourceType | "";
  styleDocument: string;
  styleErrorMsg: string;
  templateName: string;
  userRequirement: string;
}) {
  return (
    <section className="p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <Button
            variant="ghost"
            className="mb-2 px-0"
            onClick={() => setActiveView("style")}
          >
            返回用户 Skill 库
          </Button>
          <h1 className="text-xl font-semibold">从参考文档提取 Skill</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            粘贴优秀文档、个人历史文档或公司规范，提取可复用的生成规则。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">参考文档</CardTitle>
            <CardDescription>
              第一版支持文本粘贴和 .txt / .md / .markdown 上传。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label="Skill 名称"
                value={templateName}
                placeholder="例如：团队 PRD Skill、竞品分析报告 Skill"
                onChange={setTemplateName}
              />
              <TextField
                label="来源名称"
                value={sourceName}
                placeholder="例如：公司规范、收藏模板、历史文档名称"
                onChange={setSourceName}
              />
              <OptionSelect
                label="来源类型"
                value={sourceType}
                options={sourceTypeOptions}
                onChange={setSourceType}
              />
              <OptionSelect
                label="文档类型"
                value={documentType}
                options={documentTypeOptions}
                onChange={setDocumentType}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium">
                补充提取要求
              </label>
              <Textarea
                value={userRequirement}
                onChange={(event) => setUserRequirement(event.target.value)}
                className="min-h-[72px] resize-none bg-background text-sm"
                placeholder="可选：说明你希望重点提取哪些规则，例如结构、表格、语气、验收标准。"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed bg-background p-4 text-sm transition hover:bg-muted active:translate-y-px">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span>
                上传文本版参考文档
                <span className="mt-1 block text-xs text-muted-foreground">
                  支持 .md / .txt；PDF 和 Word 请先复制正文粘贴
                </span>
              </span>
              <Input
                type="file"
                accept=".txt,.md,.markdown"
                onChange={handleStyleFileUpload}
                className="sr-only"
              />
            </label>

            <Textarea
              value={styleDocument}
              onChange={(event) => setStyleDocument(event.target.value)}
              className="min-h-[360px] resize-none bg-background"
              placeholder="粘贴参考文档正文"
            />

            {styleErrorMsg ? (
              <Alert variant="destructive">
                <AlertTitle>用户自建 Skill 提取失败</AlertTitle>
                <AlertDescription>{styleErrorMsg}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              onClick={handleAnalyzeStyle}
              disabled={isAnalyzingStyle}
              className="w-full"
            >
              {isAnalyzingStyle ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在提取用户自建 Skill...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  提取用户自建 Skill
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ImportCustomSkillView({
  documentType,
  handleAnalyzeImportedSkill,
  handleImportSkillFileUpload,
  handleSaveImportedSkill,
  importSkillErrorMsg,
  importSkillPreview,
  importSkillRequirement,
  importSkillSourceName,
  importSkillText,
  isAnalyzingImportSkill,
  setActiveView,
  setDocumentType,
  setImportSkillName,
  setImportSkillRequirement,
  setImportSkillSourceName,
  setImportSkillText,
  skillName,
}: {
  documentType: DocumentType | "";
  handleAnalyzeImportedSkill: () => Promise<void>;
  handleImportSkillFileUpload: (
    event: ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  handleSaveImportedSkill: () => void;
  importSkillErrorMsg: string;
  importSkillPreview: CustomSkill | null;
  importSkillRequirement: string;
  importSkillSourceName: string;
  importSkillText: string;
  isAnalyzingImportSkill: boolean;
  setActiveView: (view: ActiveView) => void;
  setDocumentType: (value: DocumentType | "") => void;
  setImportSkillName: (value: string) => void;
  setImportSkillRequirement: (value: string) => void;
  setImportSkillSourceName: (value: string) => void;
  setImportSkillText: (value: string) => void;
  skillName: string;
}) {
  return (
    <section className="p-4">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,0.7fr)]">
        <div className="space-y-4">
          <div>
            <Button
              variant="ghost"
              className="mb-2 px-0"
              onClick={() => setActiveView("style")}
            >
              返回用户 Skill 库
            </Button>
            <h1 className="text-xl font-semibold">导入现成 Skill</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              上传你自己常用的 Skill / Prompt / 方法论，系统会解析为 ProductGPT 可使用的用户自建 Skill。
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skill 原文</CardTitle>
              <CardDescription>
                第一版支持文本粘贴和 .txt / .md / .markdown 上传，解析后需要你确认再保存。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <TextField
                  label="Skill 名称，可选"
                  value={skillName}
                  placeholder="例如：PRD Development、POL Probe"
                  onChange={setImportSkillName}
                />
                <TextField
                  label="来源名称，可选"
                  value={importSkillSourceName}
                  placeholder="例如：自己常用 Prompt、GitHub Skill 文件名"
                  onChange={setImportSkillSourceName}
                />
                <OptionSelect
                  label="适用文档类型"
                  value={documentType}
                  options={documentTypeOptions}
                  onChange={setDocumentType}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium">
                  补充说明，可选
                </label>
                <Textarea
                  value={importSkillRequirement}
                  onChange={(event) =>
                    setImportSkillRequirement(event.target.value)
                  }
                  className="min-h-[72px] resize-none bg-background text-sm"
                  placeholder="例如：这个 Skill 更偏引导流程；请保留其中的验收标准和反模式。"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed bg-background p-4 text-sm transition hover:bg-muted active:translate-y-px">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span>
                  上传 Skill 文本
                  <span className="mt-1 block text-xs text-muted-foreground">
                    支持 .md / .txt / .markdown
                  </span>
                </span>
                <Input
                  type="file"
                  accept=".txt,.md,.markdown"
                  onChange={handleImportSkillFileUpload}
                  className="sr-only"
                />
              </label>

              <Textarea
                value={importSkillText}
                onChange={(event) => setImportSkillText(event.target.value)}
                className="min-h-[360px] resize-none bg-background"
                placeholder="粘贴 Skill / Prompt / 方法论原文"
              />

              {importSkillErrorMsg ? (
                <Alert variant="destructive">
                  <AlertTitle>Skill 解析失败</AlertTitle>
                  <AlertDescription>{importSkillErrorMsg}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                onClick={handleAnalyzeImportedSkill}
                disabled={isAnalyzingImportSkill}
                className="w-full"
              >
                {isAnalyzingImportSkill ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在解析 Skill...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    解析 Skill
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">解析预览</CardTitle>
            <CardDescription>
              确认识别结果合理后再保存到用户 Skill 库。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {importSkillPreview ? (
              <>
                <div>
                  <div className="text-base font-medium">
                    {importSkillPreview.name}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {importSkillPreview.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {getDocumentTypeLabelFromOptions(
                        importSkillPreview.documentType
                      )}
                    </Badge>
                    <Badge variant="outline">
                      {getCustomSkillSupplementModeLabel(importSkillPreview)}
                    </Badge>
                  </div>
                </div>
                <PreviewRuleList
                  title="所需输入"
                  items={importSkillPreview.parsedRules.requiredInputs}
                />
                <PreviewRuleList
                  title="分析步骤"
                  items={importSkillPreview.parsedRules.analysisSteps}
                />
                <PreviewRuleList
                  title="输出结构"
                  items={importSkillPreview.parsedRules.outputStructure}
                />
                <PreviewRuleList
                  title="质量规则"
                  items={importSkillPreview.parsedRules.qualityRules}
                />
                {importSkillPreview.parsedRules.guidedSteps.length ? (
                  <div>
                    <div className="mb-2 text-xs font-medium">引导步骤</div>
                    <div className="space-y-2">
                      {importSkillPreview.parsedRules.guidedSteps.map((step) => (
                        <div key={step.id} className="rounded-lg border p-3">
                          <div className="text-sm font-medium">
                            {step.title}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {step.questions.join("；")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <Button onClick={handleSaveImportedSkill} className="w-full">
                  确认保存到用户 Skill 库
                </Button>
              </>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm leading-6 text-muted-foreground">
                解析完成后会在这里展示类型、所需输入、分析步骤、输出结构和引导步骤。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function PreviewRuleList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <div>
      <div className="mb-2 text-xs font-medium">{title}</div>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function CompactRulePanel({ title, items }: { title: string; items: string[] }) {
  const visibleItems = items.slice(0, 5);
  const hiddenCount = Math.max(items.length - visibleItems.length, 0);

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-medium">{title}</div>
        {items.length ? <Badge variant="secondary">{items.length}</Badge> : null}
      </div>
      {visibleItems.length ? (
        <ul className="space-y-1.5 text-sm leading-6 text-muted-foreground">
          {visibleItems.map((item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">暂无内容</p>
      )}
      {hiddenCount ? (
        <p className="mt-2 text-xs text-muted-foreground">
          还有 {hiddenCount} 条，可在编辑区查看。
        </p>
      ) : null}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div>{label}</div>
      <div className="mt-1 truncate font-medium text-foreground" title={value}>
        {value}
      </div>
    </div>
  );
}

function StyleTemplateDetailView({
  handleDeleteTemplate,
  handleSelectTemplate,
  handleTemplateRuleChange,
  handleTemplateTextFieldChange,
  selectedTemplateId,
  setActiveView,
  setOutputMode,
  taskType,
  template,
}: {
  handleDeleteTemplate: (templateId: string) => void;
  handleSelectTemplate: (templateId: string) => void;
  handleTemplateRuleChange: (
    key:
      | (typeof templateRuleSections)[number]["key"]
      | (typeof importedSkillRuleSections)[number]["key"],
    value: string
  ) => void;
  handleTemplateTextFieldChange: (
    key: "name" | "summary",
    value: string
  ) => void;
  selectedTemplateId: string;
  setActiveView: (view: ActiveView) => void;
  setOutputMode: (value: OutputMode) => void;
  taskType: TaskType;
  template: CustomSkill | null;
}) {
  if (!template) {
    return (
      <section className="p-4">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="text-base font-medium">没有找到这个用户自建 Skill</div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                它可能已经被删除。返回用户 Skill 库后可以重新选择其他 Skill。
              </p>
              <Button onClick={() => setActiveView("style")}>返回用户 Skill 库</Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  const isEnabled = selectedTemplateId === template.id;
  const isCompatible = isCustomSkillCompatibleWithTask(template, taskType);

  return (
    <section className="p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button
              variant="ghost"
              className="mb-2 px-0"
              onClick={() => setActiveView("style")}
            >
              返回用户 Skill 库
            </Button>
            <h1 className="text-xl font-semibold">{template.name}</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {getDocumentTypeLabelFromOptions(template.documentType)} ·{" "}
              {getCustomSkillSourceLabel(template)} · {getCustomSkillSupplementModeLabel(template)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isEnabled && isCompatible ? (
              <Badge variant="outline">已启用</Badge>
            ) : isEnabled ? (
              <Badge variant="outline">当前助手不匹配</Badge>
            ) : null}
            <Button
              disabled={!isCompatible}
              onClick={() => {
                handleSelectTemplate(template.id);
                setOutputMode("template");
              }}
            >
              {isCompatible ? "启用该 Skill" : "当前助手不可启用"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDeleteTemplate(template.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Skill 概览</CardTitle>
                <CardDescription>
                  默认展示核心规则。需要微调时，在下方展开编辑区。
                </CardDescription>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Badge variant="outline">
                  {getDocumentTypeLabelFromOptions(template.documentType)}
                </Badge>
                <Badge variant="outline">{getCustomSkillSourceLabel(template)}</Badge>
                <Badge variant="outline">
                  {getCustomSkillSupplementModeLabel(template)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
              {template.summary}
            </p>
            <div className="grid gap-2 rounded-lg border bg-background p-3 text-xs text-muted-foreground md:grid-cols-3">
              <MetaItem label="创建时间" value={formatDateTime(template.createdAt)} />
              <MetaItem label="更新时间" value={formatDateTime(template.updatedAt)} />
              {template.sourceName ? (
                <MetaItem label="来源名称" value={template.sourceName} />
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <CompactRulePanel
                title="所需输入"
                items={template.parsedRules.requiredInputs}
              />
              <CompactRulePanel
                title="分析步骤"
                items={template.parsedRules.analysisSteps}
              />
              <CompactRulePanel
                title="输出结构"
                items={template.parsedRules.outputStructure}
              />
              <CompactRulePanel
                title="质量规则"
                items={template.parsedRules.qualityRules}
              />
              <CompactRulePanel
                title="表格规则"
                items={template.parsedRules.tableRules}
              />
              <CompactRulePanel
                title="反模式"
                items={template.parsedRules.antiPatterns}
              />
            </div>
          </CardContent>
        </Card>

        <details className="rounded-lg border bg-background">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium transition hover:bg-muted active:translate-y-px">
            编辑 Skill 规则
          </summary>
          <div className="space-y-4 border-t p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label="Skill 名称"
                value={template.name}
                onChange={(value) =>
                  handleTemplateTextFieldChange("name", value)
                }
              />
              <div>
                <label className="mb-2 block text-xs font-medium">
                  Skill 摘要
                </label>
                <Textarea
                  value={template.summary}
                  onChange={(event) =>
                    handleTemplateTextFieldChange("summary", event.target.value)
                  }
                  className="min-h-[72px] resize-none bg-background text-sm"
                />
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {[...importedSkillRuleSections, ...templateRuleSections].map(
                (section) => (
                  <div key={section.key}>
                    <label className="mb-2 block text-xs font-medium">
                      {section.label}
                    </label>
                    <Textarea
                      value={template.parsedRules[section.key].join("\n")}
                      onChange={(event) =>
                        handleTemplateRuleChange(section.key, event.target.value)
                      }
                      className="min-h-[112px] resize-none bg-background text-sm"
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </details>

        {template.originalText ? (
          <details className="rounded-lg border bg-background">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium transition hover:bg-muted active:translate-y-px">
              查看原始 Skill / 参考文档
            </summary>
            <div className="border-t p-4">
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted/30 p-4 text-sm leading-6">
                {template.originalText}
              </pre>
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function BuiltInCapabilityView({
  handleTaskChange,
  taskType,
}: {
  handleTaskChange: (taskType: TaskType) => void;
  taskType: TaskType;
}) {
  return (
    <section className="p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold">内置能力说明</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            第一版每类文档内置一个系统 Skill。这里透明展示系统会使用的分析方法、输出结构和质量规则。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {productSkills.map((skill) => {
            const Icon = taskIcons[skill.id];
            const isActive = taskType === skill.id;

            return (
              <Card key={skill.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{skill.name}</CardTitle>
                        <CardDescription>{skill.description}</CardDescription>
                      </div>
                    </div>
                    {isActive ? <Badge variant="outline">当前使用</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-2 text-xs font-medium">适用输入</div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {skill.inputGuide}
                    </p>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-medium">生成所需信息</div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {skill.requiredInputs.slice(0, 6).map((item) => (
                        <div key={item} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {skill.sourceInspiredBy ? (
                    <div>
                      <div className="mb-2 text-xs font-medium">参考来源</div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {skill.sourceInspiredBy}
                      </p>
                    </div>
                  ) : null}
                  {skill.method ? (
                    <div>
                      <div className="mb-2 text-xs font-medium">方法步骤</div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {skill.method}
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <div className="mb-2 text-xs font-medium">质量规则</div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {skill.qualityRules.slice(0, 5).map((rule) => (
                        <div key={rule} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant={isActive ? "outline" : "default"}
                    onClick={() => handleTaskChange(skill.id)}
                  >
                    {isActive ? "回到工作台" : "切换到该文档类型"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

      </div>
    </section>
  );
}

function SkillsMarketView() {
  return (
    <section className="p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Skills 广场</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            后续会开放更多专业方法论、社区精选 Skills 和团队私有 Skills，第一版先保留独立入口。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">规划中的能力方向</CardTitle>
            <CardDescription>
              这里后续会承载可安装、可评测、可分类浏览的扩展能力。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "更多产品方法论",
                  description:
                    "后续支持 JTBD、RICE、KANO、SWOT、MECE 等更细分的分析 Skill。",
                },
                {
                  title: "团队私有 Skills",
                  description:
                    "未来可把公司内部规范沉淀为团队专属生成能力。",
                },
                {
                  title: "社区精选 Skills",
                  description:
                    "后续可引入经过评测的公开 Skills，按质量和场景分类展示。",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-dashed bg-muted/30 p-4"
                >
                  <div className="font-medium">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function HistoryView({
  currentHistoryId,
  handleClearHistoryItems,
  handleDeleteHistoryItem,
  handleOpenHistoryItem,
  handleRenameHistoryItem,
  historyErrorMsg,
  historyItems,
  isHistoryLoading,
}: {
  currentHistoryId: string;
  handleClearHistoryItems: () => Promise<void>;
  handleDeleteHistoryItem: (id: string) => Promise<void>;
  handleOpenHistoryItem: (item: DocumentHistoryItem) => void;
  handleRenameHistoryItem: (id: string, title: string) => Promise<void>;
  historyErrorMsg: string;
  historyItems: DocumentHistoryItem[];
  isHistoryLoading: boolean;
}) {
  const [historySearch, setHistorySearch] = useState("");
  const [historyTaskFilter, setHistoryTaskFilter] = useState<TaskType | "all">(
    "all"
  );
  const filteredItems = useMemo(() => {
    const keyword = historySearch.trim().toLowerCase();

    return historyItems.filter((item) => {
      const matchesTask =
        historyTaskFilter === "all" || item.taskType === historyTaskFilter;
      const searchableText = [
        item.title,
        item.input,
        item.context,
        item.otherParameters,
        ...(item.externalSources ?? []).flatMap((source) => [
          source.title,
          source.url,
          source.text,
        ]),
        item.resultMarkdown,
        item.skillName,
        item.templateName,
      ]
        .filter(Boolean)
        .join("\n")
        .toLowerCase();

      return matchesTask && (!keyword || searchableText.includes(keyword));
    });
  }, [historyItems, historySearch, historyTaskFilter]);

  return (
    <section className="p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">历史记录</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              本地保存生成文档、参数、生成策略和修改版本。数据保存在当前浏览器。
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleClearHistoryItems}
            disabled={!historyItems.length}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            清空历史
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <label className="mb-2 block text-xs font-medium">搜索历史</label>
                <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                    className="h-7 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                    placeholder="搜索标题、输入信息、结果或 Skill"
                  />
                </div>
              </div>
              <OptionSelect
                label="文档类型"
                value={historyTaskFilter}
                options={[
                  { label: "全部", value: "all" },
                  ...taskConfigs.map((task) => ({
                    label: task.label,
                    value: task.value,
                  })),
                ]}
                onChange={setHistoryTaskFilter}
              />
            </div>

            {historyErrorMsg ? (
              <Alert variant="destructive">
                <AlertTitle>历史记录异常</AlertTitle>
                <AlertDescription>{historyErrorMsg}</AlertDescription>
              </Alert>
            ) : null}

            {isHistoryLoading ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
                正在读取本地历史记录...
              </div>
            ) : filteredItems.length ? (
              <div className="divide-y rounded-lg border">
                {filteredItems.map((item) => (
                  <HistoryListItem
                    key={item.id}
                    handleDeleteHistoryItem={handleDeleteHistoryItem}
                    handleOpenHistoryItem={handleOpenHistoryItem}
                    handleRenameHistoryItem={handleRenameHistoryItem}
                    isActive={currentHistoryId === item.id}
                    item={item}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 p-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-medium">
                    {historyItems.length ? "没有匹配的历史记录" : "还没有历史记录"}
                  </div>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    生成成功后会自动保存到这里。打开历史记录后可以继续修改、复制或导出。
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function HistoryListItem({
  handleDeleteHistoryItem,
  handleOpenHistoryItem,
  handleRenameHistoryItem,
  isActive,
  item,
}: {
  handleDeleteHistoryItem: (id: string) => Promise<void>;
  handleOpenHistoryItem: (item: DocumentHistoryItem) => void;
  handleRenameHistoryItem: (id: string, title: string) => Promise<void>;
  isActive: boolean;
  item: DocumentHistoryItem;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(item.title);

  async function saveTitle() {
    if (!draftTitle.trim()) return;
    await handleRenameHistoryItem(item.id, draftTitle);
    setIsEditingTitle(false);
  }

  return (
    <div
      className={`grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] ${
        isActive ? "bg-primary/5" : "bg-background"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {isEditingTitle ? (
            <div className="flex min-w-[260px] flex-1 items-center gap-2">
              <Input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                className="h-8 bg-background text-sm"
              />
              <Button size="sm" onClick={saveTitle} disabled={!draftTitle.trim()}>
                保存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraftTitle(item.title);
                  setIsEditingTitle(false);
                }}
              >
                取消
              </Button>
            </div>
          ) : (
            <button
              className="min-w-0 text-left"
              onClick={() => handleOpenHistoryItem(item)}
            >
              <h2 className="truncate text-sm font-semibold">{item.title}</h2>
            </button>
          )}
          <Badge variant="secondary">{getTaskLabel(item.taskType)}</Badge>
          <Badge variant={item.outputMode === "template" ? "default" : "outline"}>
            {item.outputMode === "template" ? "用户自建 Skill" : "系统默认 Skill"}
          </Badge>
          {isActive ? <Badge>当前打开</Badge> : null}
        </div>
        <button
          className="mt-2 block w-full text-left"
          onClick={() => handleOpenHistoryItem(item)}
        >
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {item.resultMarkdown || item.input}
          </p>
        </button>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{formatDateTime(item.updatedAt)}</span>
          <span>{item.skillName}</span>
          {item.revisions.length ? <span>{item.revisions.length} 次修改</span> : null}
        </div>
      </div>

      <div className="flex items-center gap-2 md:justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDraftTitle(item.title);
            setIsEditingTitle(true);
          }}
        >
          重命名
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenHistoryItem(item)}
        >
          打开
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="删除历史记录"
          onClick={() => handleDeleteHistoryItem(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium">{label}</label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="bg-background"
      />
    </div>
  );
}

function OptionSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "";
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium">{label}</label>
      <Select
        value={value || undefined}
        onValueChange={(nextValue) => onChange(nextValue as T)}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder={`请选择${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-xs font-medium">{label}</label>
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
      >
        <SelectTrigger className="h-10 w-full bg-background">
          <SelectValue placeholder={`请选择${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.filter((option) => option !== "其它").map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          <SelectItem value="其它">其它</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function ParameterControl({
  parameter,
  value,
  onChange,
}: {
  parameter: TaskParameter;
  value: TaskParameterValue;
  onChange: (value: TaskParameterValue) => void;
}) {
  if (parameter.type === "select") {
    return (
      <SelectField
        label={parameter.label}
        value={typeof value === "string" ? value : parameter.defaultValue}
        onValueChange={onChange}
        options={parameter.options}
      />
    );
  }

  return (
    <TagParameterControl
      label={parameter.label}
      options={parameter.options}
      value={Array.isArray(value) ? value : parameter.defaultValue}
      onChange={onChange}
    />
  );
}

function TagParameterControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: TaskParameterValue) => void;
}) {
  const selectedValues = value;
  const visibleOptions = [
    ...options,
    "其它",
    ...selectedValues.filter(
      (item) => !options.includes(item) && item !== "其它"
    ),
  ];

  return (
    <div className="min-w-0">
      <label className="mb-2 block text-xs font-medium">{label}</label>
      <div className="flex min-h-10 flex-wrap items-start gap-2 rounded-lg border bg-muted/10 p-2">
        {visibleOptions.map((option) => {
          const isSelected = selectedValues.includes(option);
          const isCustom = !options.includes(option) && option !== "其它";

          return (
            <button
              key={option}
              onClick={() =>
                onChange(
                  isSelected
                    ? selectedValues.filter((item) => item !== option)
                    : [...selectedValues, option]
                )
              }
              className={`rounded-lg border px-2.5 py-1.5 text-xs transition active:translate-y-px ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {option}
              {isCustom ? " ×" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultPanel({
  handleRevise,
  result,
  isLoading,
  isRevising,
  revisionErrorMsg,
  revisionHistory,
  revisionInstruction,
  setRevisionInstruction,
  taskTitle,
  useStyleTemplate,
}: {
  handleRevise: (options?: RevisionSubmitOptions) => Promise<void>;
  result: string;
  isLoading: boolean;
  isRevising: boolean;
  revisionErrorMsg: string;
  revisionHistory: RevisionItem[];
  revisionInstruction: string;
  setRevisionInstruction: (value: string) => void;
  taskTitle: string;
  useStyleTemplate: boolean;
}) {
  const [openRevisionId, setOpenRevisionId] = useState("");
  const [selectedResultText, setSelectedResultText] = useState("");
  const [selectionInstruction, setSelectionInstruction] = useState("");
  const resultPanelRef = useRef<HTMLDivElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const headings = useMemo(() => parseMarkdownHeadings(result), [result]);
  const markdownComponents = createMarkdownComponents();

  function handleResultSelection() {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? "";

    if (!selection || !selectedText || !articleRef.current) {
      return;
    }

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;

    if (
      anchorNode &&
      focusNode &&
      articleRef.current.contains(anchorNode) &&
      articleRef.current.contains(focusNode)
    ) {
      setSelectedResultText(selectedText.slice(0, 10000));
    }
  }

  function scrollToHeading(headingId: string) {
    const target = articleRef.current?.querySelector<HTMLElement>(
      `[id="${CSS.escape(headingId)}"]`
    );
    const container = resultPanelRef.current;

    if (!target || !container) return;

    const targetTop =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      12;

    container.scrollTo({ top: Math.max(targetTop, 0), behavior: "smooth" });
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-5">
        <div className="space-y-3 rounded-lg border bg-background p-4">
          <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="grid gap-3 md:grid-cols-4">
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-5">
        <EmptyResult />
      </div>
    );
  }

  return (
    <div
      ref={resultPanelRef}
      className="h-full overflow-y-auto bg-background p-5"
      data-result-scroll-area
    >
      {headings.length ? (
        <div className="mb-4 rounded-lg border bg-muted/20 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            大纲
          </div>
          <div className="flex flex-wrap gap-2">
            {headings.map((heading) => (
              <button
                key={heading.id}
                onClick={() => scrollToHeading(heading.id)}
                className={`rounded-lg border bg-background px-2.5 py-1.5 text-xs transition hover:bg-muted active:translate-y-px ${
                  heading.level === 1
                    ? "font-medium"
                    : heading.level === 2
                      ? "text-muted-foreground"
                      : "text-muted-foreground/80"
                }`}
              >
                {heading.text}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <article ref={articleRef} onMouseUp={handleResultSelection}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{taskTitle}</h1>
              <p className="text-xs text-muted-foreground">
                生成时间：刚刚 · 输出格式：Markdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {useStyleTemplate ? <Badge variant="outline">用户自建 Skill</Badge> : null}
            <Badge variant="secondary">
              <CheckCircle2 className="h-3 w-3" />
              结构稳定
            </Badge>
          </div>
        </div>

        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
            {result}
          </ReactMarkdown>
        </div>
      </article>

      <section className="mt-6 space-y-3 rounded-lg border bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">局部修改</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              先在上方结果正文中选中一段内容，再针对这段提出修改要求。系统会返回修订后的完整 Markdown。
            </p>
          </div>
          {selectedResultText ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedResultText("");
                setSelectionInstruction("");
              }}
            >
              取消选区
            </Button>
          ) : null}
        </div>

        {selectedResultText ? (
          <div className="max-h-28 overflow-auto rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground">
            {selectedResultText}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-background p-3 text-xs leading-5 text-muted-foreground">
            当前未选中内容。请在上方报告正文中拖拽选择一段文字，选中后这里会显示片段预览。
          </div>
        )}

        <Textarea
          value={selectionInstruction}
          onChange={(event) => setSelectionInstruction(event.target.value)}
          disabled={!selectedResultText}
          className="min-h-[76px] resize-none bg-background text-sm"
          placeholder={
            selectedResultText
              ? "说明这段要怎么改，例如：压缩成一句结论；补充价格依据；删除这条未验证信息。"
              : "先选中报告正文中的一段内容，再填写局部修改要求。"
          }
        />
        <div className="flex justify-end">
          <Button
            disabled={isRevising || !selectedResultText || !selectionInstruction.trim()}
            onClick={async () => {
              await handleRevise({
                instruction: selectionInstruction,
                revisionMode: "selection",
                selectedText: selectedResultText,
              });
              setSelectedResultText("");
              setSelectionInstruction("");
            }}
          >
            {isRevising ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                修改中...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                应用局部修改
              </>
            )}
          </Button>
        </div>
      </section>

      <section className="mt-6 space-y-3 border-t pt-5">
        <div>
          <div className="text-sm font-medium">继续修改</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            告诉 AI 你想怎么改，它会基于当前文档直接输出修订后的完整版本。
          </p>
        </div>

        <Textarea
          value={revisionInstruction}
          onChange={(event) => setRevisionInstruction(event.target.value)}
          className="min-h-[88px] resize-none bg-background text-sm"
          placeholder="例如：机会点太泛了，改成面向中小团队 SaaS 的机会点；把竞品对比表写得更细；删除价格分析，增加商业模式对比。"
        />

        {revisionErrorMsg ? (
          <Alert variant="destructive">
            <AlertTitle>修改失败</AlertTitle>
            <AlertDescription>{revisionErrorMsg}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            可以整篇修改，也可以先在结果正文中选中一段后做局部修改。
          </p>
          <Button
            onClick={() => handleRevise()}
            disabled={isRevising || !revisionInstruction.trim()}
          >
            {isRevising ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                修改中...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                应用修改
              </>
            )}
          </Button>
        </div>

        {revisionHistory.length ? (
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="text-xs font-medium text-muted-foreground">
              最近修改记录
            </div>
            {revisionHistory.map((revision, index) => (
              <RevisionHistoryCard
                key={revision.id}
                isOpen={openRevisionId === revision.id}
                onToggle={() =>
                  setOpenRevisionId((current) =>
                    current === revision.id ? "" : revision.id
                  )
                }
                revision={revision}
                versionLabel={`v${revisionHistory.length - index}`}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function RevisionHistoryCard({
  isOpen,
  onToggle,
  revision,
  versionLabel,
}: {
  isOpen: boolean;
  onToggle: () => void;
  revision: RevisionItem;
  versionLabel: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3 text-sm">
      <button
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
        onClick={onToggle}
      >
        <span className="font-medium">{versionLabel}</span>
        <span className="text-xs text-muted-foreground">
          {formatTime(revision.createdAt)}
        </span>
      </button>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {revision.instruction}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
        >
          {isOpen ? "收起版本内容" : "查看修改前后"}
        </Button>
      </div>

      {isOpen ? (
        <RevisionDiffView after={revision.after} before={revision.before} />
      ) : null}
    </div>
  );
}

function RevisionDiffView({
  after,
  before,
}: {
  after: string;
  before: string;
}) {
  const diffLines = buildLineDiff(before, after);

  return (
    <div className="mt-3 rounded-lg border bg-muted/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground">修改差异</div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-red-500/70" />
            删除
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-green-500/70" />
            新增
          </span>
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto bg-background">
        {diffLines.map((line, index) => (
          <div
            key={`${line.type}-${index}-${line.text.slice(0, 24)}`}
            className={`grid grid-cols-[36px_24px_minmax(0,1fr)] gap-2 border-b border-border/40 px-3 py-1.5 font-mono text-xs leading-5 ${
              line.type === "added"
                ? "bg-green-500/10"
                : line.type === "removed"
                  ? "bg-red-500/10"
                  : "bg-background"
            }`}
          >
            <span className="select-none text-right text-muted-foreground">
              {index + 1}
            </span>
            <span
              className={`select-none font-semibold ${
                line.type === "added"
                  ? "text-green-700"
                  : line.type === "removed"
                    ? "text-red-700"
                    : "text-muted-foreground"
              }`}
            >
              {line.type === "added" ? "+" : line.type === "removed" ? "-" : ""}
            </span>
            <span className="whitespace-pre-wrap break-words">
              {line.text || " "}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintableResultDocument({
  result,
  taskTitle,
}: {
  result: string;
  taskTitle: string;
}) {
  const markdownComponents = createMarkdownComponents();

  return (
    <article className="print-document print-only">
      <header className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-semibold">{taskTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ProductGPT 生成结果
        </p>
      </header>
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
          {result}
        </ReactMarkdown>
      </div>
    </article>
  );
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }

  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const slugCounts = new Map<string, number>();

  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{1,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const text = match[2].replace(/#+$/, "").trim();
      const baseSlug = createHeadingSlug(text);
      const count = slugCounts.get(baseSlug) ?? 0;
      slugCounts.set(baseSlug, count + 1);

      return {
        id: count ? `${baseSlug}-${count + 1}` : baseSlug,
        level: match[1].length as 1 | 2 | 3,
        text,
      };
    });
}

function createMarkdownComponents(): Components {
  const slugCounts = new Map<string, number>();

  function createHeadingId(children: ReactNode) {
    const text = getNodeText(children);
    const baseSlug = createHeadingSlug(text);
    const count = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, count + 1);

    return count ? `${baseSlug}-${count + 1}` : baseSlug;
  }

  return {
    h1: ({ children }) => <h1 id={createHeadingId(children)}>{children}</h1>,
    h2: ({ children }) => <h2 id={createHeadingId(children)}>{children}</h2>,
    h3: ({ children }) => <h3 id={createHeadingId(children)}>{children}</h3>,
    p: ({ children }) => <p>{renderTextBreaks(children)}</p>,
    li: ({ children }) => <li>{renderTextBreaks(children)}</li>,
    td: ({ children }) => <td>{renderTextBreaks(children)}</td>,
    th: ({ children }) => <th>{renderTextBreaks(children)}</th>,
  };
}

function renderTextBreaks(node: ReactNode): ReactNode {
  if (typeof node === "string") {
    const parts = node.split(/<br\s*\/?>/gi);

    if (parts.length === 1) {
      return node;
    }

    return parts.map((part, index) => (
      <span key={`${part}-${index}`}>
        {index > 0 ? <br /> : null}
        {part}
      </span>
    ));
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <span key={index}>{renderTextBreaks(child)}</span>
    ));
  }

  return node;
}

function createHeadingSlug(text: string) {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "section";
}

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join("");
  }

  if (node && typeof node === "object" && "props" in node) {
    const props = node.props as { children?: ReactNode };
    return getNodeText(props.children);
  }

  return "";
}

type DiffLine = {
  text: string;
  type: "added" | "removed" | "unchanged";
};

function buildLineDiff(before: string, after: string): DiffLine[] {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const matrix = Array.from({ length: beforeLines.length + 1 }, () =>
    Array(afterLines.length + 1).fill(0) as number[]
  );

  for (
    let beforeIndex = beforeLines.length - 1;
    beforeIndex >= 0;
    beforeIndex -= 1
  ) {
    for (
      let afterIndex = afterLines.length - 1;
      afterIndex >= 0;
      afterIndex -= 1
    ) {
      matrix[beforeIndex][afterIndex] =
        beforeLines[beforeIndex] === afterLines[afterIndex]
          ? matrix[beforeIndex + 1][afterIndex + 1] + 1
          : Math.max(
              matrix[beforeIndex + 1][afterIndex],
              matrix[beforeIndex][afterIndex + 1]
            );
    }
  }

  const diffLines: DiffLine[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < beforeLines.length && afterIndex < afterLines.length) {
    if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
      diffLines.push({ text: beforeLines[beforeIndex], type: "unchanged" });
      beforeIndex += 1;
      afterIndex += 1;
    } else if (
      matrix[beforeIndex + 1][afterIndex] >= matrix[beforeIndex][afterIndex + 1]
    ) {
      diffLines.push({ text: beforeLines[beforeIndex], type: "removed" });
      beforeIndex += 1;
    } else {
      diffLines.push({ text: afterLines[afterIndex], type: "added" });
      afterIndex += 1;
    }
  }

  while (beforeIndex < beforeLines.length) {
    diffLines.push({ text: beforeLines[beforeIndex], type: "removed" });
    beforeIndex += 1;
  }

  while (afterIndex < afterLines.length) {
    diffLines.push({ text: afterLines[afterIndex], type: "added" });
    afterIndex += 1;
  }

  return diffLines;
}

function PromptStrategyPanel({
  promptPreview,
}: {
  promptPreview: PromptPreview;
}) {
  return (
    <div className="space-y-4 bg-background p-5">
      <StrategyBlock title="当前任务">
        <p>{promptPreview.taskLabel}</p>
      </StrategyBlock>

      <StrategyBlock title={`当前生成能力：${promptPreview.generationModeLabel}`}>
        <pre className="whitespace-pre-wrap text-sm leading-6">
          {promptPreview.skillSummary}
        </pre>
      </StrategyBlock>

      <StrategyBlock title="当前参数配置">
        {promptPreview.parameters.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {promptPreview.parameters.map((parameter) => (
              <div key={parameter.label} className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  {parameter.label}
                </div>
                <div className="mt-1 text-sm font-medium">
                  {parameter.value}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            未选择额外参数，系统仅根据输入信息和当前生成能力生成。
          </p>
        )}
      </StrategyBlock>

      <StrategyBlock title="当前用户自建 Skill 规则">
        {promptPreview.customSkill ? (
          <div className="space-y-3 text-sm leading-6">
            <p className="font-medium">{promptPreview.customSkill.name}</p>
            <p className="text-muted-foreground">
              {promptPreview.customSkill.summary}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {getCustomSkillSourceLabel(promptPreview.customSkill)}
              </Badge>
              <Badge variant="outline">
                {getCustomSkillSupplementModeLabel(promptPreview.customSkill)}
              </Badge>
            </div>
            <RuleList
              title="所需输入"
              items={promptPreview.customSkill.parsedRules.requiredInputs}
            />
            <RuleList
              title="分析步骤"
              items={promptPreview.customSkill.parsedRules.analysisSteps}
            />
            <RuleList
              title="结构规则"
              items={promptPreview.customSkill.parsedRules.structureRules}
            />
            <RuleList
              title="表格规则"
              items={promptPreview.customSkill.parsedRules.tableRules}
            />
            <RuleList
              title="反模式"
              items={promptPreview.customSkill.parsedRules.antiPatterns}
            />
            {promptPreview.skillSupplementAnswers?.length ? (
              <RuleList
                title="输入信息"
                items={promptPreview.skillSupplementAnswers.map(
                  (answer) => `${answer.label}：${answer.value}`
                )}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            当前使用系统默认 Skill，未启用用户自建 Skill。
          </p>
        )}
      </StrategyBlock>

      <StrategyBlock title="用户可见 Prompt 预览">
        <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-6">
          {promptPreview.userPromptPreview}
        </pre>
      </StrategyBlock>
    </div>
  );
}

function StrategyBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-background p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function RuleList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        {title}
      </div>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function EmptyResult() {
  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <div>
        <Sparkles className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">还没有生成结果</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          输入资料、选择生成能力和参数后点击生成。结果会在这里展示，也可以查看
          Markdown 源码和生成策略。
        </p>
      </div>
    </div>
  );
}

function buildGenerationContext({
  context,
  externalSources,
  otherParameters,
  parameterConfig,
  parameters,
  customSkill,
  skillSupplementAnswers,
}: {
  context: string;
  externalSources: WebSource[];
  otherParameters: string;
  parameterConfig: TaskParameter[];
  parameters: Record<string, TaskParameterValue>;
  customSkill?: CustomSkill | null;
  skillSupplementAnswers?: Record<string, string>;
}) {
  const parameterLines = parameterConfig.map((parameter) => {
    const value = parameters[parameter.key] ?? parameter.defaultValue;
    const formattedValue = Array.isArray(value) ? value.join("、") : value;

    return formattedValue ? `- ${parameter.label}：${formattedValue}` : "";
  }).filter(Boolean);
  const parameterInstructionLines = parameterConfig
    .map((parameter) => {
      const value = parameters[parameter.key] ?? parameter.defaultValue;
      const values = Array.isArray(value) ? value : value ? [value] : [];

      return buildParameterInstruction(parameter, values);
    })
    .filter(Boolean);
  const outputFormatValue = parameters.outputFormat;
  const outputFormat =
    typeof outputFormatValue === "string" ? outputFormatValue : "";
  const outputShape = buildOutputShapeInstruction(outputFormat);
  const externalSourceText = formatExternalSourcesForPrompt(externalSources);
  const skillSupplementText = formatSkillSupplementForPrompt(
    skillSupplementAnswers
  );

  return [
    context.trim() ? context.trim() : "",
    externalSourceText,
    parameterLines.length ? `参数配置：\n${parameterLines.join("\n")}` : "",
    otherParameters.trim() ? `其它参数：${otherParameters.trim()}` : "",
    skillSupplementText,
    outputShape ? `最终输出形态（最高优先级）：\n${outputShape}` : "",
    parameterInstructionLines.length
      ? `参数执行要求（必须影响最终文档，不要只展示参数）：\n${parameterInstructionLines.join("\n")}`
      : "",
    customSkill ? `启用用户自建 Skill：${customSkill.name}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatSkillSupplementForPrompt(answers?: Record<string, string>) {
  if (!answers) return "";

  const lines = Object.entries(answers)
    .map(([label, value]) =>
      value.trim() ? `- ${label}：${value.trim()}` : ""
    )
    .filter(Boolean);

  return lines.length ? `输入信息：\n${lines.join("\n")}` : "";
}

function buildParameterInstruction(parameter: TaskParameter, values: string[]) {
  const cleanValues = values
    .map((value) => value.trim())
    .filter(Boolean);

  if (!cleanValues.length) {
    return "";
  }

  const valueText = cleanValues.join("、");

  switch (parameter.key) {
    case "outputFormat":
      return `- 输出格式必须按“${valueText}”组织。如果它不是完整报告，不要套用默认完整报告章节。`;
    case "detailLevel":
      return `- 输出详细度按“${valueText}”控制：简洁版压缩章节和解释，详细版补充规则、边界、表格和待确认问题。`;
    case "outputLanguage":
      return `- 全文输出语言必须为“${valueText}”。`;
    case "industry":
      return `- 行业/领域必须围绕“${valueText}”展开，场景、风险、机会点和术语要贴合该领域。`;
    case "targetUser":
      return `- 目标用户必须聚焦“${valueText}”，用户问题、场景和需求优先级都要围绕该人群判断。`;
    case "productStage":
      return `- 产品阶段必须按“${valueText}”收敛范围，避免写出不符合当前阶段的重功能、大平台或长期规划。`;
    case "focusTags":
      return `- 关注重点必须覆盖“${valueText}”，并在对应章节或表格字段中体现。`;
    case "competitorCount":
      return `- 竞品数量按“${valueText}”处理；如果输入信息不足，明确标注待补充，不要编造额外竞品。`;
    case "analysisDepth":
      return `- 分析深度按“${valueText}”展开，快速对比要收敛，深度拆解要补足依据、差异原因和风险。`;
    case "analysisDimensions":
      return `- 竞品分析维度必须优先覆盖“${valueText}”，对比表字段要随这些维度调整。`;
    case "feedbackSource":
      return `- 反馈来源按“${valueText}”理解，证据呈现和分析口径要匹配该来源。`;
    case "analysisMethod":
      return `- 反馈分析方法必须使用“${valueText}”，不要仍按通用总结方式输出。`;
    case "collaborationDetail":
      return `- 研发协作粒度按“${valueText}”控制，详细粒度必须补充规则、异常路径和验收标准。`;
    case "includedSections":
      return `- PRD 必须包含或重点展开“${valueText}”，没有信息时也要列出待确认项。`;
    default:
      return `- ${parameter.label}已选择“${valueText}”，最终文档必须体现这个选择。`;
  }
}

function buildOutputShapeInstruction(outputFormat: string) {
  switch (outputFormat) {
    case "机会点清单":
      return [
        "- 本次最终文档必须是机会点清单，不是完整产品调研报告。",
        "- 只输出这些一级章节：# 机会点清单、## 筛选口径、## 机会点列表、## 优先级建议、## 待验证问题。",
        "- 不要输出方向理解、问题陈述、JTBD、目标用户与场景、MVP 建议、风险与限制等完整报告章节，除非它们被压缩成机会点表格字段。",
        "- 机会点列表必须用表格呈现，字段包含：机会点、对应用户/场景、痛点或触发因素、用户价值、证据/依据、优先级、最小验证方式、待确认信息。",
      ].join("\n");
    case "MVP 建议":
      return [
        "- 本次最终文档必须是 MVP 建议，不是完整产品调研报告。",
        "- 只输出这些一级章节：# MVP 建议、## MVP 目标、## P0 范围、## 暂不包含、## 最小验证路径、## 风险与待确认。",
        "- 功能、范围和验证路径必须围绕当前产品阶段收敛，不要扩写成完整平台规划。",
      ].join("\n");
    case "竞品对比表":
      return [
        "- 本次最终文档必须以竞品对比表为主体，不是完整竞品分析报告。",
        "- 只输出这些一级章节：# 竞品对比表、## 对比口径、## 对比矩阵、## 差异结论、## 可借鉴点、## 待验证信息。",
        "- 对比矩阵必须是主内容，避免大段通用分析。",
      ].join("\n");
    case "决策建议":
      return [
        "- 本次最终文档必须是决策建议，不是完整竞品分析报告。",
        "- 只输出这些一级章节：# 决策建议、## 推荐结论、## 判断依据、## 可选方案对比、## 风险、## 下一步动作。",
      ].join("\n");
    case "需求池":
      return [
        "- 本次最终文档必须是需求池，不是完整用户反馈分析报告。",
        "- 只输出这些一级章节：# 需求池、## 需求分组、## 需求列表、## 优先级、## 暂不处理、## 待验证问题。",
        "- 需求列表必须用表格呈现，字段包含：需求、来源证据、用户场景、问题类型、影响、优先级、建议动作。",
      ].join("\n");
    case "迭代建议":
      return [
        "- 本次最终文档必须是迭代建议，不是完整用户反馈分析报告。",
        "- 只输出这些一级章节：# 迭代建议、## 主要问题、## 建议改动、## 优先级、## 验证方式、## 风险。",
      ].join("\n");
    case "功能需求说明":
      return [
        "- 本次最终文档必须是功能需求说明，不是完整 PRD。",
        "- 只输出这些一级章节：# 功能需求说明、## 功能目标、## 用户故事、## 功能规则、## 边界与异常、## 验收标准、## 待确认问题。",
      ].join("\n");
    case "研发评审稿":
      return [
        "- 本次最终文档必须是研发评审稿，不是完整 PRD。",
        "- 只输出这些一级章节：# 研发评审稿、## 评审目标、## 本次范围、## 关键流程、## 规则与异常、## 依赖风险、## 验收口径、## 需要研发确认的问题。",
      ].join("\n");
    default:
      return "";
  }
}

function formatExternalSourcesForPrompt(sources: WebSource[]) {
  if (!sources.length) {
    return "";
  }

  return [
    "外部网页资料（来自用户主动抓取的公开网页，必须作为资料来源使用）：",
    ...sources.map((source, index) =>
      [
        `\n### 网页资料 ${index + 1}`,
        `来源 URL：${source.url}`,
        `标题：${source.title}`,
        source.description ? `描述：${source.description}` : "",
        "正文摘录：",
        source.text.slice(0, 6000),
      ]
        .filter(Boolean)
        .join("\n")
    ),
    "\n使用要求：引用网页信息时要基于上述正文，不要编造网页中没有的事实；如果网页信息不足，请标注待确认。",
  ].join("\n");
}

function extractUrls(value: string) {
  const matches =
    value.match(/https?:\/\/[^\s，。！？；、)）\]}>"']+/gi) ?? [];
  const normalizedUrls = matches.map((url) =>
    url.replace(/[.,，。;；:：!?！？]+$/g, "")
  );

  return Array.from(new Set(normalizedUrls));
}

function getFetchFailureMessage(url: string, baseMessage: string) {
  const hostname = safeHostname(url);
  const platformHint =
    hostname.includes("feishu") || hostname.includes("larksuite")
      ? "飞书页面通常需要登录、权限或动态渲染，当前公开网页抓取无法读取。"
      : hostname.includes("zhihu")
        ? "知乎页面通常有反爬限制，当前公开网页抓取可能无法读取完整正文。"
        : hostname.includes("mp.weixin")
          ? "公众号文章通常有访问限制，当前公开网页抓取可能无法读取完整正文。"
          : hostname.includes("xiaohongshu")
            ? "小红书页面通常需要登录或有反爬限制，当前公开网页抓取无法稳定读取。"
            : "该网页可能需要登录、动态渲染或禁止抓取。";

  return `${baseMessage} ${platformHint} 可以复制网页正文粘贴到输入框，或整理成 txt/md 后上传到用户 Skill 库。`;
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function createHistoryTitle(input: string, fallback: string) {
  const firstLine = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return fallback;
  }

  return firstLine.length > 36 ? `${firstLine.slice(0, 36)}...` : firstLine;
}

function getTaskLabel(taskType: TaskType) {
  return taskConfigs.find((task) => task.value === taskType)?.label ?? taskType;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isPromptPreview(value: unknown): value is PromptPreview {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "taskLabel" in value &&
    "generationModeLabel" in value &&
    "skillSummary" in value &&
    "parameters" in value &&
    "userPromptPreview" in value
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatBackupTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const map = new Map<string, T>();

  current.forEach((item) => map.set(item.id, item));
  incoming.forEach((item) => map.set(item.id, item));

  return Array.from(map.values());
}

function normalizeLocalBackup(value: unknown): ProductGptLocalBackup | null {
  if (!isRecord(value)) {
    return null;
  }

  const historyItems = Array.isArray(value.historyItems)
    ? value.historyItems.filter(isDocumentHistoryItem)
    : [];
  const styleTemplates = Array.isArray(value.styleTemplates)
    ? value.styleTemplates.filter(isDocumentStyleTemplate)
    : [];
  const customSkills = Array.isArray(value.customSkills)
    ? value.customSkills.filter(isCustomSkill)
    : [];

  return {
    version: 1,
    exportedAt:
      typeof value.exportedAt === "string"
        ? value.exportedAt
        : new Date().toISOString(),
    historyItems,
    styleTemplates,
    selectedTemplateId:
      typeof value.selectedTemplateId === "string" ? value.selectedTemplateId : "",
    customSkills,
    selectedCustomSkillId:
      typeof value.selectedCustomSkillId === "string"
        ? value.selectedCustomSkillId
        : "",
  };
}

function isDocumentHistoryItem(value: unknown): value is DocumentHistoryItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isTaskType(value.taskType) &&
    typeof value.input === "string" &&
    typeof value.resultMarkdown === "string" &&
    Array.isArray(value.revisions) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isDocumentStyleTemplate(value: unknown): value is DocumentStyleTemplate {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.summary === "string" &&
    isSourceType(value.sourceType) &&
    isDocumentType(value.documentType) &&
    Array.isArray(value.structureRules) &&
    Array.isArray(value.reusableInstructions)
  );
}

function isCustomSkill(value: unknown): value is CustomSkill {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.summary === "string" &&
    (value.sourceType === "document_extracted" ||
      value.sourceType === "skill_imported") &&
    (value.skillType === "direct_generation" ||
      value.skillType === "guided_workflow") &&
    isDocumentType(value.documentType) &&
    isRecord(value.parsedRules)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isTaskType(value: unknown): value is TaskType {
  return (
    value === "research" ||
    value === "competitor" ||
    value === "feedback" ||
    value === "prd"
  );
}

function isSourceType(value: unknown): value is SourceType {
  return value === "personal" || value === "collected" || value === "company";
}

function isDocumentType(value: unknown): value is DocumentType {
  return (
    value === "prd" ||
    value === "research" ||
    value === "competitor" ||
    value === "feedback" ||
    value === "general"
  );
}

function getApiErrorMessage(value: unknown, fallback: string): string {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return fallback;
}

function getDocumentTypeLabelFromOptions(value: DocumentType) {
  return (
    documentTypeOptions.find((option) => option.value === value)?.label ?? value
  );
}

function isCustomSkillCompatibleWithTask(
  skill: CustomSkill,
  taskType: TaskType
) {
  return skill.documentType === taskType || skill.documentType === "general";
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

function isTaskView(value: ActiveView): value is TaskType {
  return ["research", "competitor", "feedback", "prd"].includes(value);
}
