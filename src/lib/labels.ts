import type { ApplicabilityAxis, FacetPlanItem } from "./types";

type Tone = "neutral" | "success" | "danger";

const axisNames: Record<ApplicabilityAxis["axis"], string> = {
  population: "人群",
  phase: "病程",
  etiology: "病因",
};

export const conditionValueLabels: Record<string, string> = {
  adult: "成人",
  older_adult: "老年",
  pediatric: "儿童",
  neonatal: "新生儿",
  acute: "急性期",
  subacute: "亚急性",
  chronic: "慢性期",
  tbi: "创伤性",
  hypoxic_ischemic: "缺氧缺血",
  stroke: "卒中",
  metabolic: "代谢性",
  neurodegenerative: "神经退行性",
};

function valuesText(values: string[]): string {
  return values.map((value) => conditionValueLabels[value] ?? value).join("/");
}

export function axisChip(axis: ApplicabilityAxis): { label: string; tone: Tone } {
  const name = axisNames[axis.axis] ?? axis.axis;
  const basis = axis.basis === "document" ? "（文献标题）" : "";
  if (axis.reason === "matched") {
    return { label: `${name} ${valuesText(axis.values)}${basis}`, tone: "success" };
  }
  if (axis.reason === "opposite_conflict") {
    return { label: `${name} ${valuesText(axis.values)} 相反${basis}`, tone: "danger" };
  }
  if (axis.reason === "missing_in_evidence") {
    return { label: `${name} 未说明`, tone: "neutral" };
  }
  return {
    label: `${name} 未直接支持${axis.values.length ? `：${valuesText(axis.values)}` : ""}`,
    tone: "neutral",
  };
}

export function coverageReason(reason: string): string {
  if (reason.startsWith("inapplicable_filtered:")) {
    return `按适用条件剔除 ${reason.slice("inapplicable_filtered:".length)} 条明确不适用证据`;
  }
  if (reason === "required_roles_missing") {
    return "缺少指定类型的证据";
  }
  return reason;
}

export function missingFacets(
  plan: readonly FacetPlanItem[] | undefined,
): FacetPlanItem[] {
  return (plan ?? []).filter(
    (facet) => facet.required && facet.evidence_indices.length === 0,
  );
}