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
  bucket:
    | "primary_support"
    | "indirect_support"
    | "background"
    | "applicability_unknown"
    | "comparative"
    | "non_supporting";
  role_status: string;
  applicability: "Applicable" | "Unknown" | "Inapplicable";
  applicability_axes: ApplicabilityAxis[];
  directness: "direct" | "indirect" | "contextual" | "non_supporting";
  directness_label: string;
  source_kind:
    | "guideline"
    | "consensus"
    | "systematic_review"
    | "narrative_review"
    | "primary_study"
    | "reference_list"
    | "abbreviations"
    | "front_matter"
    | "other";
  directness_reasons: string[];
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
  kind: "core" | "subfacet";
  evidence_indices: number[];
  primary_indices: number[];
  supporting_indices: number[];
  status: "covered" | "partial" | "missing";
  sufficiency: "unknown" | "missing" | "limited" | "moderate" | "sufficient";
  triggers: string[];
}

export interface CoverageConflict {
  left_index: number;
  right_index: number;
  left_quote: string;
  right_quote: string;
  overlap: number;
}

export interface InterventionPlanItem {
  category_id: string;
  label: string;
  evidence_indices: number[];
  direct_indices: number[];
  status: "covered" | "indirect_only" | "missing";
}

export interface CoverageEvidenceStats {
  delivered_items: number;
  unique_documents: number;
  unique_evidence_spans: number;
  duplicate_evidence_rate: number;
  source_diversity: number;
  per_facet_source_coverage: Record<string, number>;
  lifecycle: {
    retrieved: number;
    classified: number;
    scope_checked: number;
    eligible: number;
    delivered: number;
  };
}

export interface Coverage {
  facets: string[];
  uncovered_facets: string[];
  missing_roles: string[];
  incomplete_reasons: string[];
  facet_plan: FacetPlanItem[];
  conflicts: CoverageConflict[];
  conditions: Record<string, string[]>;
  intervention_plan: InterventionPlanItem[];
  evidence_stats: CoverageEvidenceStats;
}

export interface QueryConstraint {
  axis: "population" | "phase" | "etiology" | "intervention";
  value: string;
  matched_text: string;
  char_start: number;
  char_end: number;
  source: "question" | "explicit";
}

export interface SourcePayload {
  items: EvidenceItem[];
  coverage: Coverage;
  trace: Array<Record<string, unknown>>;
  fingerprint: string;
  mode: "llm" | "extractive" | "extractive_fallback";
  conditions: Record<string, string[]>;
  constraints: QueryConstraint[];
}

export type ClaimSupport =
  | "supported"
  | "partial"
  | "contradicted"
  | "unsupported"
  | "uncited"
  | "unmapped"
  | "evidence_gap";

export interface EvidenceSpan {
  index: number;
  char_start: number;
  char_end: number;
  source_char_start?: number;
  source_char_end?: number;
  quote: string;
  score: number;
}

export interface AtomBinding {
  text: string;
  support: ClaimSupport;
  overlap: number;
  reason: string;
  kind: "fact" | "evidence_gap";
  evidence_spans: EvidenceSpan[];
}

export interface SentenceBinding {
  index: number;
  text: string;
  citations: number[];
  status: "cited" | "unmapped" | "uncited";
  support: ClaimSupport;
  overlap: number;
  support_method: string;
  kind: "fact" | "evidence_gap";
  reason: string;
  evidence_spans: EvidenceSpan[];
  atoms: AtomBinding[];
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
  sentence_counts: Record<string, number>;
  claim_total: number;
}

export interface ThinkingItem {
  label: string;
  value: string;
}

export interface ThinkingNode {
  id: string;
  title: string;
  status: "running" | "done" | "error";
  summary: string;
  items: ThinkingItem[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourcePayload;
  citations?: CitationReport;
  thinking?: ThinkingNode[];
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
