import {
  CustomSkill,
  CustomSkillGuidedStep,
  CustomSkillParsedRules,
  CustomSkillSourceType,
  CustomSkillType,
  DocumentStyleTemplate,
  DocumentType,
  SourceType,
} from "@/lib/types";

const customSkillsKey = "productgpt.customSkills";
const selectedCustomSkillKey = "productgpt.selectedCustomSkillId";
const legacyTemplatesKey = "productgpt.styleTemplates";
const legacySelectedTemplateKey = "productgpt.selectedStyleTemplateId";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getCustomSkills(): CustomSkill[] {
  if (!canUseStorage()) return [];

  const skills = readCustomSkills();
  const legacySkills = readLegacyTemplates().map(templateToCustomSkill);
  const merged = mergeById(skills, legacySkills);

  if (legacySkills.length && merged.length !== skills.length) {
    saveCustomSkills(merged);
  }

  return merged;
}

export function saveCustomSkills(skills: CustomSkill[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(customSkillsKey, JSON.stringify(skills));
}

export function addCustomSkill(skill: CustomSkill) {
  const skills = getCustomSkills();
  const nextSkills = [skill, ...skills.filter((item) => item.id !== skill.id)];
  saveCustomSkills(nextSkills);
  return nextSkills;
}

export function updateCustomSkill(skill: CustomSkill) {
  const skills = getCustomSkills();
  const nextSkills = skills.map((item) => (item.id === skill.id ? skill : item));
  saveCustomSkills(nextSkills);
  return nextSkills;
}

export function deleteCustomSkill(skillId: string) {
  const nextSkills = getCustomSkills().filter((item) => item.id !== skillId);
  saveCustomSkills(nextSkills);

  if (getSelectedCustomSkillId() === skillId) {
    setSelectedCustomSkillId("");
  }

  return nextSkills;
}

export function getSelectedCustomSkillId() {
  if (!canUseStorage()) return "";
  return (
    window.localStorage.getItem(selectedCustomSkillKey) ??
    window.localStorage.getItem(legacySelectedTemplateKey) ??
    ""
  );
}

export function setSelectedCustomSkillId(skillId: string) {
  if (!canUseStorage()) return;

  if (skillId) {
    window.localStorage.setItem(selectedCustomSkillKey, skillId);
  } else {
    window.localStorage.removeItem(selectedCustomSkillKey);
  }
}

export function getSelectedCustomSkill() {
  const selectedId = getSelectedCustomSkillId();
  if (!selectedId) return null;
  return getCustomSkills().find((skill) => skill.id === selectedId) ?? null;
}

export function templateToCustomSkill(
  template: DocumentStyleTemplate
): CustomSkill {
  const parsedRules: CustomSkillParsedRules = {
    requiredInputs: [],
    analysisSteps: [
      ...template.structureRules,
      ...template.decisionRules,
    ].filter(Boolean),
    outputStructure: template.structureRules,
    qualityRules: [
      ...template.detailRules,
      ...template.formattingRules,
      ...template.decisionRules,
    ].filter(Boolean),
    constraints: template.antiPatterns,
    structureRules: template.structureRules,
    tableRules: template.tableRules,
    toneRules: template.toneRules,
    detailRules: template.detailRules,
    formattingRules: template.formattingRules,
    decisionRules: template.decisionRules,
    reusableInstructions: template.reusableInstructions,
    applicableScenarios: template.applicableScenarios,
    antiPatterns: template.antiPatterns,
    guidedSteps: [],
    finalOutputInstruction:
      "按照该用户自建 Skill 的结构、表格、语气、颗粒度、格式和判断规则生成同类文档。",
  };

  return {
    id: template.id,
    name: template.name,
    summary: template.summary,
    sourceType: "document_extracted",
    skillType: "direct_generation",
    documentType: template.documentType,
    sourceName: template.sourceName,
    originalText: "",
    originalSourceType: template.sourceType,
    parsedRules,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

function readCustomSkills() {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(customSkillsKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeCustomSkill)
          .filter((skill): skill is CustomSkill => Boolean(skill))
      : [];
  } catch {
    return [];
  }
}

function readLegacyTemplates() {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(legacyTemplatesKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeLegacyTemplate)
          .filter((template): template is DocumentStyleTemplate =>
            Boolean(template)
          )
      : [];
  } catch {
    return [];
  }
}

function normalizeCustomSkill(value: unknown): CustomSkill | null {
  if (!isRecord(value)) return null;

  const id = readString(value, "id");
  const name = readString(value, "name");
  const summary = readString(value, "summary") || "未提供 Skill 摘要。";
  const sourceType = readCustomSkillSourceType(value.sourceType);
  const skillType = readCustomSkillType(value.skillType);
  const documentType = readDocumentType(value.documentType);
  const parsedRules = normalizeParsedRules(value.parsedRules);
  const createdAt = readString(value, "createdAt") || new Date().toISOString();
  const updatedAt = readString(value, "updatedAt") || createdAt;

  if (!id || !name || !sourceType || !skillType || !documentType) {
    return null;
  }

  return {
    id,
    name,
    summary,
    sourceType,
    skillType,
    documentType,
    sourceName: readString(value, "sourceName") || undefined,
    originalText: readString(value, "originalText"),
    originalSourceType: readSourceType(value.originalSourceType) ?? undefined,
    parsedRules,
    createdAt,
    updatedAt,
  };
}

function normalizeLegacyTemplate(value: unknown): DocumentStyleTemplate | null {
  if (!isRecord(value)) return null;

  const id = readString(value, "id");
  const name = readString(value, "name");
  const sourceType = readSourceType(value.sourceType);
  const documentType = readDocumentType(value.documentType);
  const createdAt = readString(value, "createdAt") || new Date().toISOString();
  const updatedAt = readString(value, "updatedAt") || createdAt;

  if (!id || !name || !sourceType || !documentType) return null;

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

function normalizeParsedRules(value: unknown): CustomSkillParsedRules {
  const source = isRecord(value) ? value : {};

  return {
    requiredInputs: readStringArray(source, "requiredInputs"),
    analysisSteps: readStringArray(source, "analysisSteps"),
    outputStructure: readStringArray(source, "outputStructure"),
    qualityRules: readStringArray(source, "qualityRules"),
    constraints: readStringArray(source, "constraints"),
    structureRules: readStringArray(source, "structureRules"),
    tableRules: readStringArray(source, "tableRules"),
    toneRules: readStringArray(source, "toneRules"),
    detailRules: readStringArray(source, "detailRules"),
    formattingRules: readStringArray(source, "formattingRules"),
    decisionRules: readStringArray(source, "decisionRules"),
    reusableInstructions: readStringArray(source, "reusableInstructions"),
    applicableScenarios: readStringArray(source, "applicableScenarios"),
    antiPatterns: readStringArray(source, "antiPatterns"),
    guidedSteps: readGuidedSteps(source.guidedSteps),
    finalOutputInstruction:
      readString(source, "finalOutputInstruction") ||
      "基于该用户自建 Skill 生成结构化产品文档。",
  };
}

function readGuidedSteps(value: unknown): CustomSkillGuidedStep[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const title = readString(item, "title");
      const questions = readStringArray(item, "questions");

      if (!title || !questions.length) return null;

      return {
        id: readString(item, "id") || `step-${index + 1}`,
        title,
        description: readString(item, "description"),
        questions,
      };
    })
    .filter((item): item is CustomSkillGuidedStep => Boolean(item));
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const map = new Map<string, T>();
  incoming.forEach((item) => map.set(item.id, item));
  current.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
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

function readCustomSkillSourceType(
  value: unknown
): CustomSkillSourceType | null {
  return value === "document_extracted" || value === "skill_imported"
    ? value
    : null;
}

function readCustomSkillType(value: unknown): CustomSkillType | null {
  return value === "direct_generation" || value === "guided_workflow"
    ? value
    : null;
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
