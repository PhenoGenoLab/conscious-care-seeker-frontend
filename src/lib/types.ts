export interface ConditionPayload {
  population: string[];
  phase: string[];
  etiology: string[];
}

export interface ApplicabilityAxis {
  axis: "population" | "phase" | "etiology";
  verdict: "Applicable" | "Unknown" | "Inapplicable";
  query: string[];
  values: string[];
  basis: "chunk" | "document" | "none";
  reason:
    | "matched"
    | "missing_in_evidence"
    | "opposite_conflict"
    | "not_opposite_mismatch";
}

export interface EvidenceItem {
  index: number;
  anchor_id: number;
  source_id: string;
  title: string;
  section: string;
  page_start: number;
  page_end: number;
  char_start: number;
  char_end: number;
  bucket: "primary_support" | "background" | "applicability_unknown" | "comparative";
  role_status: string;
  applicability: "Applicable" | "Unknown" | "Inapplicable";
  applicability_axes: ApplicabilityAxis[];
  roles: string[];
  conditions: Record<string, string[]>;
  direct_support: boolean;
  text: string;
  text_sha256: string;
}

export interface FacetPlanItem {
  facet_id: string;
  label: string;
  required: boolean;
  evidence_indices: number[];
  status: "covered" | "missing";
  triggers: string[];
}

export interface Coverage {
  facets: string[];
  uncovered_facets: string[];
  missing_roles: string[];
  incomplete_reasons: string[];
  facet_plan: FacetPlanItem[];
}

export interface SourcePayload {
  items: EvidenceItem[];
  coverage: Coverage;
  trace: Array<Record<string, unknown>>;
  fingerprint: string;
  mode: "llm" | "extractive" | "extractive_fallback";
}

export type ClaimSupport =
  | "supported"
  | "partial"
  | "unsupported"
  | "uncited"
  | "unmapped";

export interface SentenceBinding {
  index: number;
  text: string;
  citations: number[];
  status: "cited" | "unmapped" | "uncited";
  support: ClaimSupport;
  overlap: number;
  support_method: string;
}

export interface CitationReport {
  status: "no_citations" | "out_of_range" | "mapping_failed" | "mapped";
  cited_indices: number[];
  invalid_indices: number[];
  mapped_indices: number[];
  unmapped_indices: number[];
  mapping_errors: string[];
  semantic_support: string;
  sentences: SentenceBinding[];
  uncited_count: number;
  support_method: string;
  support_counts: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourcePayload;
  citations?: CitationReport;
  mode?: string;
  pending?: boolean;
  stopped?: boolean;
  question?: string;
  error?: string;
}

export interface DocumentSummary {
  source_id: string;
  title: string;
  source_path: string;
  kind: string;
  page_count: number;
  text_characters: number;
  chunk_count: number;
  ingested_at: string;
  text_sha256: string;
}

export interface Stats {
  sources: number;
  chunks: number;
  conditions: number;
  embedded_chunks: number;
}

export interface Health {
  status: string;
  schema_version: string;
  llm_enabled: boolean;
  embedding_enabled: boolean;
  stats: Stats;
}

export interface SearchResult {
  question: string;
  n_items: number;
  items: EvidenceItem[];
  coverage: Coverage;
  trace: Array<Record<string, unknown>>;
  fingerprint: string;
  evidence_block: string;
}

export interface UploadResult {
  source_id?: string;
  filename?: string;
  created?: boolean;
  chunks?: number;
  error?: string;
}
