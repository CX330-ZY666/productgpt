export type TaskType = "research" | "competitor" | "feedback" | "prd";

export type SourceType = "personal" | "collected" | "company";

export type DocumentType =
  | "prd"
  | "research"
  | "competitor"
  | "feedback"
  | "general";

export type OutputMode = "standard" | "template";

export type CustomSkillSourceType = "document_extracted" | "skill_imported";

export type CustomSkillType = "direct_generation" | "guided_workflow";

export interface DocumentStyleTemplate {
  id: string;
  name: string;
  summary: string;
  sourceType: SourceType;
  documentType: DocumentType;
  sourceName?: string;
  structureRules: string[];
  tableRules: string[];
  toneRules: string[];
  detailRules: string[];
  formattingRules: string[];
  decisionRules: string[];
  reusableInstructions: string[];
  applicableScenarios: string[];
  antiPatterns: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomSkillGuidedStep {
  id: string;
  title: string;
  description: string;
  questions: string[];
}

export interface CustomSkillParsedRules {
  requiredInputs: string[];
  analysisSteps: string[];
  outputStructure: string[];
  qualityRules: string[];
  constraints: string[];
  structureRules: string[];
  tableRules: string[];
  toneRules: string[];
  detailRules: string[];
  formattingRules: string[];
  decisionRules: string[];
  reusableInstructions: string[];
  applicableScenarios: string[];
  antiPatterns: string[];
  guidedSteps: CustomSkillGuidedStep[];
  finalOutputInstruction: string;
}

export interface CustomSkill {
  id: string;
  name: string;
  summary: string;
  sourceType: CustomSkillSourceType;
  skillType: CustomSkillType;
  documentType: DocumentType;
  sourceName?: string;
  originalText: string;
  originalSourceType?: SourceType;
  parsedRules: CustomSkillParsedRules;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateRequest {
  taskType: TaskType;
  input: string;
  context?: string;
  outputMode?: OutputMode;
  customSkill?: CustomSkill;
  styleTemplate?: DocumentStyleTemplate;
}

export interface GenerateResponse {
  result: string;
  taskType: TaskType;
}

export interface DocumentHistoryItem {
  id: string;
  title: string;
  taskType: TaskType;
  input: string;
  context: string;
  otherParameters: string;
  externalSources?: WebSource[];
  taskParameters: Record<string, TaskParameterValue>;
  outputMode: OutputMode;
  skillName: string;
  templateId?: string;
  templateName?: string;
  strategySnapshot?: unknown;
  resultMarkdown: string;
  revisions: RevisionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WebSource {
  id: string;
  url: string;
  title: string;
  description?: string;
  text: string;
  fetchedAt: string;
}

export interface FetchUrlRequest {
  url: string;
}

export interface FetchUrlResponse {
  source: WebSource;
}

export interface ReviseRequest {
  taskType: TaskType;
  input: string;
  currentResult: string;
  instruction: string;
  context?: string;
  outputMode?: OutputMode;
  revisionMode?: "global" | "selection";
  selectedText?: string;
  customSkill?: CustomSkill;
  styleTemplate?: DocumentStyleTemplate;
}

export interface ReviseResponse {
  result: string;
  taskType: TaskType;
}

export interface RevisionItem {
  id: string;
  type: "global" | "local";
  instruction: string;
  before: string;
  after: string;
  createdAt: string;
}

export interface AnalyzeStyleRequest {
  documentText: string;
  sourceType: SourceType;
  documentType: DocumentType;
  userRequirement?: string;
  templateName: string;
  sourceName?: string;
}

export interface AnalyzeStyleResponse {
  template: DocumentStyleTemplate;
}

export interface AnalyzeCustomSkillRequest {
  skillText: string;
  documentType: DocumentType;
  userRequirement?: string;
  sourceName?: string;
  skillName?: string;
}

export interface AnalyzeCustomSkillResponse {
  skill: CustomSkill;
}

export interface TaskConfig {
  value: TaskType;
  label: string;
  description: string;
  placeholder: string;
  outputDescription: string;
}

export interface BadcaseItem {
  id: string;
  taskType: TaskType;
  input: string;
  expected: string;
  actual: string;
  badcaseType: string;
  reason: string;
  optimization: string;
  afterResult: string;
}

export interface ProductSkill {
  id: TaskType;
  name: string;
  category?: string;
  description: string;
  sourceInspiredBy?: string;
  inputGuide: string;
  requiredInputs: string[];
  method?: string;
  outputStructure: string;
  qualityRules: string[];
  antiPatterns: string[];
  exampleInput?: string;
}

export interface SkillScore {
  frequency: number;
  methodology: number;
  inputFriendliness: number;
  outputUsability: number;
  differentiation: number;
  evaluability: number;
  total: number;
}

export interface SkillCandidate {
  id: string;
  taskType: TaskType;
  name: string;
  category: string;
  description: string;
  sourceInspiredBy: string;
  inputGuide: string;
  method: string;
  outputStructure: string;
  qualityRules: string[];
  antiPatterns: string[];
  exampleInput: string;
  score: SkillScore;
  included: boolean;
  rationale?: string;
}

export interface TaskSelectParameter {
  type: "select";
  key: string;
  label: string;
  defaultValue: string;
  options: string[];
}

export interface TaskTagParameter {
  type: "tags";
  key: string;
  label: string;
  defaultValue: string[];
  options: string[];
}

export type TaskParameter = TaskSelectParameter | TaskTagParameter;
export type TaskParameterValue = string | string[];
