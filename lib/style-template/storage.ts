import {
  DocumentStyleTemplate,
  DocumentType,
  SourceType,
} from "@/lib/types";

const templatesKey = "productgpt.styleTemplates";
const selectedTemplateKey = "productgpt.selectedStyleTemplateId";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getTemplates(): DocumentStyleTemplate[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(templatesKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeTemplate)
          .filter((template): template is DocumentStyleTemplate =>
            Boolean(template)
          )
      : [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates: DocumentStyleTemplate[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(templatesKey, JSON.stringify(templates));
}

export function addTemplate(template: DocumentStyleTemplate) {
  const templates = getTemplates();
  const nextTemplates = [
    template,
    ...templates.filter((item) => item.id !== template.id),
  ];
  saveTemplates(nextTemplates);
  return nextTemplates;
}

export function updateTemplate(template: DocumentStyleTemplate) {
  const templates = getTemplates();
  const nextTemplates = templates.map((item) =>
    item.id === template.id ? template : item
  );
  saveTemplates(nextTemplates);
  return nextTemplates;
}

export function deleteTemplate(templateId: string) {
  const nextTemplates = getTemplates().filter((item) => item.id !== templateId);
  saveTemplates(nextTemplates);

  if (getSelectedTemplateId() === templateId) {
    setSelectedTemplateId("");
  }

  return nextTemplates;
}

export function getSelectedTemplateId() {
  if (!canUseStorage()) return "";
  return window.localStorage.getItem(selectedTemplateKey) ?? "";
}

export function setSelectedTemplateId(templateId: string) {
  if (!canUseStorage()) return;

  if (templateId) {
    window.localStorage.setItem(selectedTemplateKey, templateId);
  } else {
    window.localStorage.removeItem(selectedTemplateKey);
  }
}

export function getSelectedTemplate() {
  const selectedId = getSelectedTemplateId();
  if (!selectedId) return null;
  return getTemplates().find((template) => template.id === selectedId) ?? null;
}

function normalizeTemplate(value: unknown): DocumentStyleTemplate | null {
  if (!isRecord(value)) return null;

  const id = readString(value, "id");
  const name = readString(value, "name");
  const sourceType = readSourceType(value.sourceType);
  const documentType = readDocumentType(value.documentType);
  const createdAt = readString(value, "createdAt") || new Date().toISOString();
  const updatedAt = readString(value, "updatedAt") || createdAt;

  if (!id || !name || !sourceType || !documentType) {
    return null;
  }

  return {
    id,
    name,
    summary: readString(value, "summary") || "未提供 Skill 摘要。",
    sourceType,
    documentType,
    sourceName: readString(value, "sourceName") || undefined,
    structureRules: readStringArray(value, "structureRules"),
    tableRules: readStringArray(value, "tableRules"),
    toneRules: readStringArray(value, "toneRules"),
    detailRules: readStringArray(value, "detailRules"),
    formattingRules: readStringArray(value, "formattingRules"),
    decisionRules: readStringArray(value, "decisionRules"),
    reusableInstructions: readStringArray(value, "reusableInstructions"),
    applicableScenarios: readStringArray(value, "applicableScenarios"),
    antiPatterns: readStringArray(value, "antiPatterns"),
    createdAt,
    updatedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
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
    .filter(Boolean);
}

function readSourceType(value: unknown): SourceType | null {
  return value === "personal" || value === "collected" || value === "company"
    ? value
    : null;
}

function readDocumentType(value: unknown): DocumentType | null {
  return value === "prd" ||
    value === "research" ||
    value === "competitor" ||
    value === "feedback" ||
    value === "general"
    ? value
    : null;
}
