/**
 * Shared types for the VA C-File Analyzer application.
 */

// Re-export Prisma types for convenience
export type {
  User,
  Case,
  ClaimedCondition,
  Document,
  Extraction,
  EvidenceSynthesis,
  OutputDocument,
  Upload,
  Job,
} from "@prisma/client";

// Enum re-exports
export {
  CaseStatus,
  ServiceConnectionTheory,
  ClaimedConditionStatus,
  DocumentType,
  ProcessingStatus,
  ExtractionType,
  ReviewStatus,
  LegalElement,
  EvidenceStrength,
  OutputType,
  JobType,
  JobStatus,
} from "@prisma/client";

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Case-related types
export interface CreateCaseInput {
  internalIdentifier: string;
  conditions: CreateConditionInput[];
}

export interface CreateConditionInput {
  conditionName: string;
  serviceConnectionTheory: string;
  primaryConditionId?: string;
}

// Upload types
export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  error?: string;
}

// Extraction review types
export interface ExtractionReview {
  extractionId: string;
  status: "APPROVED" | "REJECTED" | "EDITED";
  editedText?: string;
}

// Evidence mapping for display
export interface EvidenceMap {
  conditionId: string;
  conditionName: string;
  elements: {
    element: string;
    strength: string;
    extractions: {
      id: string;
      text: string;
      source: string;
      pageRef: string;
    }[];
    gaps: string[];
  }[];
}

// Output generation options
export interface OutputGenerationOptions {
  caseId: string;
  outputType: string;
  includeConditions?: string[];
  format?: "pdf" | "docx" | "markdown";
}

// Service connection theory display names
export const SERVICE_CONNECTION_THEORY_LABELS: Record<string, string> = {
  DIRECT: "Direct Service Connection",
  SECONDARY: "Secondary to Service-Connected Condition",
  AGGRAVATION: "Aggravation of Pre-existing Condition",
  PRESUMPTIVE_AGENT_ORANGE: "Presumptive - Agent Orange Exposure",
  PRESUMPTIVE_BURN_PIT: "Presumptive - Burn Pit Exposure",
  PRESUMPTIVE_GULF_WAR: "Presumptive - Gulf War Service",
  PRESUMPTIVE_RADIATION: "Presumptive - Radiation Exposure",
};

// Document type display names
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  SERVICE_TREATMENT_RECORD: "Service Treatment Record",
  DD214: "DD-214",
  SERVICE_PERSONNEL_RECORD: "Service Personnel Record",
  CP_EXAM: "C&P Examination",
  VA_TREATMENT_RECORD: "VA Treatment Record",
  PRIVATE_MEDICAL_RECORD: "Private Medical Record",
  DBQ: "Disability Benefits Questionnaire",
  INDEPENDENT_MEDICAL_OPINION: "Independent Medical Opinion",
  RATING_DECISION: "Rating Decision",
  NOTICE_OF_DISAGREEMENT: "Notice of Disagreement",
  BOARD_DECISION: "Board Decision",
  CORRESPONDENCE: "Correspondence",
  LAY_STATEMENT: "Lay Statement",
  OTHER: "Other",
  UNCLASSIFIED: "Unclassified",
};

// Legal element display names
export const LEGAL_ELEMENT_LABELS: Record<string, string> = {
  CURRENT_DIAGNOSIS: "Current Diagnosis",
  IN_SERVICE_EVENT: "In-Service Event/Injury/Disease",
  NEXUS: "Nexus (Medical Connection)",
  QUALIFYING_SERVICE: "Qualifying Service",
  PRESUMPTIVE_DIAGNOSIS: "Presumptive Diagnosis",
  MANIFESTATION_TIMEFRAME: "Manifestation Timeframe",
  PRIMARY_CONDITION_SC: "Primary Condition Service Connection",
  SECONDARY_NEXUS: "Secondary Nexus",
};

// Evidence strength display
export const EVIDENCE_STRENGTH_LABELS: Record<string, { label: string; color: string }> = {
  STRONG: { label: "Strong", color: "green" },
  MODERATE: { label: "Moderate", color: "yellow" },
  WEAK: { label: "Weak", color: "orange" },
  GAP: { label: "Gap", color: "red" },
};
