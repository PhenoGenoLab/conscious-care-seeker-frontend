import type { ConditionPayload } from "@/lib/types";
import { cn } from "./ui";

const GROUPS: Array<{
  key: keyof ConditionPayload;
  label: string;
  options: Array<{ value: string; label: string }>;
}> = [
  {
    key: "population",
    label: "人群",
    options: [
      { value: "adult", label: "成人" },
      { value: "older_adult", label: "老年" },
      { value: "pediatric", label: "儿童" },
      { value: "neonatal", label: "新生儿" },
    ],
  },
  {
    key: "phase",
    label: "病程",
    options: [
      { value: "acute", label: "急性期" },
      { value: "subacute", label: "亚急性" },
      { value: "chronic", label: "慢性期" },
    ],
  },
  {
    key: "etiology",
    label: "病因",
    options: [
      { value: "tbi", label: "创伤性" },
      { value: "hypoxic_ischemic", label: "缺氧缺血" },
      { value: "stroke", label: "卒中" },
      { value: "metabolic", label: "代谢性" },
      { value: "neurodegenerative", label: "神经退行性" },
    ],
  },
];

export function ConditionPicker({
  value,
  onChange,
  idPrefix = "condition",
  showHeader = true,
}: {
  value: ConditionPayload;
  onChange: (next: ConditionPayload) => void;
  idPrefix?: string;
  showHeader?: boolean;
}) {
  function toggle(key: keyof ConditionPayload, option: string) {
    const current = value[key];
    onChange({
      ...value,
      [key]: current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    });
  }

  const hasSelection =
    value.population.length + value.phase.length + value.etiology.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {showHeader ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium tracking-cn text-n-950">适用条件</p>
          {hasSelection ? (
            <button
              type="button"
              onClick={() => onChange({ population: [], phase: [], etiology: [] })}
              className="text-xs tracking-cn text-n-450 underline-offset-2 transition-colors duration-150 hover:text-n-950 hover:underline"
            >
              清除全部
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {GROUPS.map((group) => (
          <div
            key={group.key}
            role="group"
            aria-labelledby={`${idPrefix}-${group.key}`}
            className="flex flex-wrap items-center gap-2"
          >
            <span
              id={`${idPrefix}-${group.key}`}
              className="w-8 shrink-0 text-xs tracking-cn text-n-450"
            >
              {group.label}
            </span>
            {group.options.map((option) => {
              const active = value[group.key].includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(group.key, option.value)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs tracking-cn transition-[color,background-color,border-color] duration-150",
                    active
                      ? "border-primary bg-primary font-medium text-white"
                      : "border-line-300 text-n-700 hover:bg-n-150 hover:text-n-950",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function conditionSummary(value: ConditionPayload): string {
  const labels = GROUPS.flatMap((group) =>
    group.options
      .filter((option) => value[group.key].includes(option.value))
      .map((option) => option.label),
  );
  return labels.length ? labels.join(" · ") : "未设置";
}
