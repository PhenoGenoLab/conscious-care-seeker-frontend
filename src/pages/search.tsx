import { useRef, useState } from "react";
import { Link } from "react-router";
import { ConditionPicker } from "@/components/condition-picker";
import { EvidenceList } from "@/components/evidence-card";
import { Icon } from "@/components/icons";
import {
  Button,
  CopyButton,
  EmptyState,
  SectionHeader,
  Spinner,
  StatusChip,
  buttonClass,
} from "@/components/ui";
import { api } from "@/lib/api";
import { coverageReason } from "@/lib/labels";
import type { ConditionPayload, SearchResult } from "@/lib/types";

const emptyConditions: ConditionPayload = { population: [], phase: [], etiology: [] };

export function SearchPage() {
  const [question, setQuestion] = useState("");
  const [conditions, setConditions] = useState<ConditionPayload>(emptyConditions);
  const [includeInapplicable, setIncludeInapplicable] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  async function runSearch(
    text: string,
    nextConditions: ConditionPayload = conditions,
    include: boolean = includeInapplicable,
  ) {
    const id = ++requestId.current;
    setPending(true);
    setError("");
    try {
      const payload = await api.search({
        question: text,
        conditions: nextConditions,
        include_inapplicable: include,
        k: 10,
      });
      if (id === requestId.current) setResult(payload);
    } catch (cause) {
      if (id === requestId.current) setError((cause as Error).message);
    } finally {
      if (id === requestId.current) setPending(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      setFieldError("请输入检索问题。");
      inputRef.current?.focus();
      return;
    }
    setFieldError("");
    void runSearch(trimmed);
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-panel bg-surface p-6 sm:p-7">
        <SectionHeader
          title="证据检索"
          actions={
            <Link to="/" className={buttonClass("outline", "md")}>
              <Icon name="chat" className="h-[18px] w-[18px]" />
              返回问答
            </Link>
          }
        />
      </section>

      <form onSubmit={submit} noValidate className="rounded-panel bg-surface p-6 sm:p-7">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="search-question"
              className="text-body font-medium tracking-cn text-n-950"
            >
              检索问题
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-n-450">
                  <Icon name="search" className="h-[18px] w-[18px]" />
                </span>
                <input
                  ref={inputRef}
                  id="search-question"
                  value={question}
                  onChange={(event) => {
                    setQuestion(event.target.value);
                    if (fieldError) setFieldError("");
                  }}
                  placeholder="例如：CRS-R 如何区分微意识状态？"
                  aria-invalid={fieldError ? "true" : undefined}
                  aria-describedby={fieldError ? "search-question-error" : undefined}
                  className="h-9 w-full rounded-[10px] border border-line-300 bg-surface pr-3 pl-9 text-body tracking-cn text-n-950 transition-[border-color] duration-150 outline-none placeholder:text-n-450 focus:border-primary aria-[invalid=true]:border-danger"
                />
              </div>
              <Button type="submit" disabled={pending} className="h-9 w-full sm:w-auto">
                {pending ? <Spinner className="size-3.5" /> : <Icon name="search" className="h-[18px] w-[18px]" />}
                {pending ? "检索中…" : "检索"}
              </Button>
            </div>
            {fieldError ? (
              <p
                id="search-question-error"
                role="alert"
                className="flex items-center gap-1.5 text-xs tracking-cn text-danger"
              >
                <Icon name="alert" className="h-3.5 w-3.5" />
                {fieldError}
              </p>
            ) : null}
          </div>

          <div className="border-t border-line-100 pt-4">
            <ConditionPicker
              value={conditions}
              onChange={setConditions}
              idPrefix="search"
            />
          </div>

          <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 py-2 text-xs tracking-cn text-n-550 sm:min-h-0">
            <input
              type="checkbox"
              checked={includeInapplicable}
              onChange={(event) => {
                const checked = event.target.checked;
                setIncludeInapplicable(checked);
                if (result) void runSearch(result.question, conditions, checked);
              }}
              className="size-4 shrink-0 accent-[var(--color-primary)]"
            />
            保留不适用片段
          </label>
        </div>
      </form>

      {error ? (
        <section className="rounded-panel bg-surface p-6 sm:p-7">
          <div role="alert" className="flex flex-wrap items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/5 text-danger">
              <Icon name="alert" className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold tracking-title text-n-950">检索失败</h2>
              <p className="mt-1 text-body tracking-cn text-n-550">{error}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const trimmed = question.trim();
                if (!trimmed) {
                  setFieldError("请输入检索问题。");
                  inputRef.current?.focus();
                  return;
                }
                void runSearch(trimmed);
              }}
            >
              <Icon name="refresh" className="h-[18px] w-[18px]" />
              重试
            </Button>
          </div>
        </section>
      ) : null}

      {pending ? (
        <section
          className="rounded-panel bg-surface p-6 sm:p-7"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 text-body tracking-cn text-n-550">
            <Spinner className="size-4" />
            检索与过滤证据…
          </div>
          <div className="mt-5 flex flex-col gap-2" aria-hidden="true">
            <span className="h-5 w-40 rounded bg-n-150" />
            <span className="mt-2 h-3 w-2/3 rounded bg-n-150" />
            <span className="h-24 rounded-deco bg-n-150" />
            <span className="h-24 rounded-deco bg-n-150" />
          </div>
        </section>
      ) : null}

      {!pending && !error && result ? (
        <SearchResults
          result={result}
          onClearConditions={() => {
            setConditions(emptyConditions);
            void runSearch(result.question, emptyConditions, includeInapplicable);
          }}
          onRelaxConditions={() => {
            setConditions(emptyConditions);
            setIncludeInapplicable(true);
            void runSearch(result.question, emptyConditions, true);
          }}
        />
      ) : null}

      {!pending && !error && !result ? (
        <section className="rounded-panel bg-surface p-6 sm:p-7">
          <EmptyState icon={<Icon name="search" />} title="尚未检索" />
        </section>
      ) : null}
    </div>
  );
}

function SearchResults({
  result,
  onClearConditions,
  onRelaxConditions,
}: {
  result: SearchResult;
  onClearConditions: () => void;
  onRelaxConditions: () => void;
}) {
  const coverage = result.coverage;
  const hasGaps =
    coverage.uncovered_facets.length > 0 ||
    coverage.missing_roles.length > 0 ||
    coverage.incomplete_reasons.length > 0;

  return (
    <section className="rounded-panel bg-surface p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-title text-n-950">检索结果</h2>
          <p className="mt-1 line-clamp-2 text-body tracking-cn text-n-550">
            「{result.question}」· {result.items.length} 条证据
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs tracking-cn text-n-450">
          <span className="font-mono tracking-num">
            fingerprint {result.fingerprint.slice(0, 12)}
          </span>
          <CopyButton value={result.fingerprint} label="复制检索指纹" />
        </div>
      </div>

      {hasGaps ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-tip bg-n-150 px-3 py-2">
          {coverage.incomplete_reasons.map((reason) => (
            <StatusChip key={reason} className="bg-surface">
              {coverageReason(reason)}
            </StatusChip>
          ))}
          {coverage.uncovered_facets.length ? (
            <span className="text-xs tracking-cn text-n-550">
              未覆盖：{coverage.uncovered_facets.join(" · ")}
            </span>
          ) : null}
          {coverage.missing_roles.length ? (
            <span className="text-xs tracking-cn text-n-550">
              缺少角色：{coverage.missing_roles.join(" · ")}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-1.5 text-xs tracking-cn text-n-550">
          <Icon name="check" className="h-3.5 w-3.5 text-success" />
          覆盖完整
        </p>
      )}

      <div className="mt-4">
        {result.items.length ? (
          <EvidenceList items={result.items} />
        ) : (
          <EmptyState
            icon={<Icon name="search" />}
            title="没有可用证据"
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="outline" onClick={onClearConditions}>
                  清除适用条件
                </Button>
                <Button onClick={onRelaxConditions}>保留不适用片段</Button>
              </div>
            }
          />
        )}
      </div>

      {result.trace.length ? (
        <details className="mt-5 border-t border-line-100 pt-4">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-xs tracking-cn text-n-550 hover:text-n-950">
            <Icon name="chevronRight" className="h-3.5 w-3.5" />
            检索轨迹
          </summary>
          <pre className="trace-json mt-3 rounded-tip bg-n-150 p-3">
            {JSON.stringify(result.trace, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
