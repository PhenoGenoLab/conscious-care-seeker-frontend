import { useState } from "react";
import type { EvidenceItem } from "@/lib/types";
import { axisChip } from "@/lib/labels";
import { Icon } from "./icons";
import { CopyButton, StatusChip, cn } from "./ui";

const bucketLabels: Record<EvidenceItem["bucket"], string> = {
  primary_support: "直接支持",
  indirect_support: "间接支持",
  background: "背景",
  applicability_unknown: "条件待定",
  comparative: "比较材料",
  non_supporting: "不可支持",
};

const directnessTone: Record<
  EvidenceItem["directness"],
  "success" | "neutral" | "danger"
> = {
  direct: "success",
  indirect: "neutral",
  contextual: "neutral",
  non_supporting: "danger",
};

const applicability: Record<
  EvidenceItem["applicability"],
  { label: string; tone: "success" | "neutral" | "danger" }
> = {
  Applicable: { label: "可适用", tone: "success" },
  Unknown: { label: "适用性未知", tone: "neutral" },
  Inapplicable: { label: "不适用", tone: "danger" },
};

const roleLabels: Record<string, string> = {
  guideline: "指南",
  review: "综述",
  observation: "观察",
  background: "背景",
};

function citationText(item: EvidenceItem): string {
  const pages =
    item.page_end !== item.page_start
      ? `p.${item.page_start}–${item.page_end}`
      : `p.${item.page_start}`;
  return `[E${item.index}] ${item.source_id} ${pages} chars ${item.char_start}–${item.char_end}`;
}

function excerpt(item: EvidenceItem): string {
  const lines = item.text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[-*_]{3,}$/.test(line));

  const clean = /[\s：:·]/g;
  const heading = (lines[0] ?? "").replace(clean, "");
  if (
    heading &&
    (heading === item.title.replace(clean, "") || heading === item.section.replace(clean, ""))
  ) {
    lines.shift();
  }
  return lines.join("\n");
}

export function EvidenceCard({ item }: { item: EvidenceItem }) {
  const [open, setOpen] = useState(false);
  const status = applicability[item.applicability];
  const displayText = excerpt(item);
  const roleText = Array.from(
    new Set(item.roles.map((role) => roleLabels[role] ?? "").filter(Boolean)),
  )
    .filter((label) => label !== bucketLabels[item.bucket])
    .join(" / ");

  return (
    <article className="rounded-deco border border-line-100 bg-surface">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 pt-3">
        <span className="font-code text-xs tracking-num text-primary">E{item.index}</span>
        <StatusChip tone={status.tone}>{status.label}</StatusChip>
        <StatusChip tone={directnessTone[item.directness]}>
          {item.directness_label}
        </StatusChip>
        <span className="text-xs tracking-cn text-n-450">{bucketLabels[item.bucket]}</span>
        {roleText ? (
          <span className="min-w-0 truncate text-xs tracking-cn text-n-450">
            · {roleText}
          </span>
        ) : null}
        <span className="ml-auto font-mono text-xs tracking-num tabular-nums text-n-450">
          p.{item.page_start}
          {item.page_end !== item.page_start ? `–${item.page_end}` : ""}
        </span>
      </div>

      {item.applicability_axes.length ? (
        <div className="flex flex-wrap items-center gap-1 px-4 pt-1.5">
          {item.applicability_axes.map((axis) => {
            const chip = axisChip(axis);
            return (
              <StatusChip key={axis.axis} tone={chip.tone}>
                {chip.label}
              </StatusChip>
            );
          })}
        </div>
      ) : null}

      <div className="px-4 pt-1.5">
        <p className="text-body font-medium leading-5 tracking-cn text-n-950">
          {item.title}
          {item.section && item.section !== item.title ? (
            <span className="font-normal text-n-450"> · {item.section}</span>
          ) : null}
        </p>
        <p className="mt-1 truncate font-mono text-xs tracking-num text-n-450">
          {item.source_id} · chars {item.char_start}–{item.char_end}
        </p>
      </div>

      <div className="px-4 py-3">
        <p
          className={cn(
            "text-body tracking-cn whitespace-pre-line text-n-700",
            !open && "line-clamp-3",
          )}
        >
          {displayText}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line-100 px-2 py-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs tracking-cn text-n-550 transition-colors duration-150 hover:bg-n-150 hover:text-n-950"
        >
          {open ? "收起原文" : "展开原文"}
          <Icon
            name="chevronDown"
            className={cn("h-3.5 w-3.5 transition-transform duration-150", open && "rotate-180")}
          />
        </button>
        <span className="flex items-center gap-1 text-xs tracking-cn text-n-450">
          <span className="hidden sm:inline">复制引用</span>
          <CopyButton value={citationText(item)} label={`复制 E${item.index} 的引用信息`} />
        </span>
      </div>
    </article>
  );
}

export function EvidenceList({ items }: { items: EvidenceItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-deco border border-line-100 bg-n-150/50 px-4 py-5 text-body tracking-cn text-n-550">
        没有可引用的证据片段。
      </div>
    );
  }
  return (
    <div className="grid items-start gap-2 xl:grid-cols-2">
      {items.map((item) => (
        <EvidenceCard key={item.anchor_id} item={item} />
      ))}
    </div>
  );
}
