import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ConditionPicker, conditionSummary } from "@/components/condition-picker";
import { EvidenceList } from "@/components/evidence-card";
import { Markdown } from "@/components/markdown";
import { Icon } from "@/components/icons";
import {
  Button,
  ConfirmDialog,
  SectionHeader,
  Spinner,
  StatusChip,
  buttonClass,
  cn,
} from "@/components/ui";
import { streamChat } from "@/lib/sse";
import { coverageReason, missingFacets } from "@/lib/labels";
import type {
  ChatMessage,
  CitationReport,
  ClaimSupport,
  ConditionPayload,
  CoverageConflict,
  FacetPlanItem,
  SentenceBinding,
  SourcePayload,
  ThinkingNode,
} from "@/lib/types";

const SUGGESTIONS = [
  "微意识状态与无反应觉醒综合征如何鉴别？",
  "成人创伤性脑损伤后意识障碍的促醒治疗有哪些证据？",
  "心脏骤停后昏迷的预后评估应包含哪些检查？",
  "撤除生命维持治疗的伦理决策流程是什么？",
];

const emptyConditions: ConditionPayload = { population: [], phase: [], etiology: [] };
const CHAT_STORAGE_KEY = "cc-rag-chat-session";

interface StoredChatState {
  messages: ChatMessage[];
  conditions: ConditionPayload;
}

function loadChatState(): StoredChatState {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return { messages: [], conditions: emptyConditions };
    const parsed = JSON.parse(raw) as Partial<StoredChatState>;
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages
          .filter(
            (message) =>
              message &&
              typeof message.id === "string" &&
              (message.role === "user" || message.role === "assistant"),
          )
          .map((message) => ({ ...message, pending: false }))
      : [];
    const conditions =
      parsed.conditions &&
      Array.isArray(parsed.conditions.population) &&
      Array.isArray(parsed.conditions.phase) &&
      Array.isArray(parsed.conditions.etiology)
        ? parsed.conditions
        : emptyConditions;
    return { messages, conditions };
  } catch {
    return { messages: [], conditions: emptyConditions };
  }
}

function modeLabel(mode?: string): string {
  if (mode === "llm") return "生成模式";
  if (mode === "extractive_fallback") return "摘录回退";
  if (mode === "extractive") return "摘录模式";
  return "";
}

const citationFailureLabels: Record<string, string> = {
  out_of_range: "引用越界",
  mapping_failed: "映射失败",
};

export function ChatPage() {
  const [restored] = useState(loadChatState);
  const [messages, setMessages] = useState<ChatMessage[]>(restored.messages);
  const [question, setQuestion] = useState("");
  const [conditions, setConditions] = useState<ConditionPayload>(restored.conditions);
  const [pending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [showConditions, setShowConditions] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const lastCountRef = useRef(0);
  const firstScrollRef = useRef(true);
  const forceScrollRef = useRef(false);

  useLayoutEffect(() => {
    if (!messages.length) return;
    const main = document.getElementById("main");
    if (!main) return;
    const nearBottom = main.scrollHeight - main.scrollTop - main.clientHeight < 280;
    const force = firstScrollRef.current || forceScrollRef.current;
    firstScrollRef.current = false;
    forceScrollRef.current = false;
    lastCountRef.current = messages.length;
    if (nearBottom || force || pending) {
      main.scrollTop = main.scrollHeight;
      const frame = requestAnimationFrame(() => {
        main.scrollTop = main.scrollHeight;
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [messages, pending]);

  useEffect(() => {
    try {
      const hasConditions =
        conditions.population.length + conditions.phase.length + conditions.etiology.length > 0;
      if (!messages.length && !hasConditions) {
        sessionStorage.removeItem(CHAT_STORAGE_KEY);
      } else {
        sessionStorage.setItem(
          CHAT_STORAGE_KEY,
          JSON.stringify({
            messages: messages.map((message) => ({ ...message, pending: false })),
            conditions,
          }),
        );
      }
    } catch {
      /* storage full or unavailable: keep the in-memory conversation */
    }
  }, [messages, conditions]);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, [question]);

  function patchMessage(id: string, patch: Partial<ChatMessage>) {
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, ...patch } : message)),
    );
  }

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const history = messages
      .filter((message) => !message.pending && message.content)
      .slice(-8)
      .map((message) => ({ role: message.role, content: message.content }));
    const assistantId = crypto.randomUUID();

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
      { id: assistantId, role: "assistant", content: "", question: trimmed, pending: true },
    ]);
    forceScrollRef.current = true;
    setQuestion("");
    setPending(true);
    setAnnouncement("正在检索证据并组织回答");

    const controller = new AbortController();
    controllerRef.current = controller;
    let aborted = false;
    let finished = false;

    try {
      for await (const event of streamChat(
        { question: trimmed, conditions, history },
        controller.signal,
      )) {
        if (event.event === "sources") {
          patchMessage(assistantId, {
            sources: event.data as unknown as SourcePayload,
            mode: String(event.data.mode ?? ""),
          });
        } else if (event.event === "thinking") {
          const incoming = event.data as unknown as ThinkingNode;
          setMessages((current) =>
            current.map((message) => {
              if (message.id !== assistantId) return message;
              const nodes = message.thinking ?? [];
              const at = nodes.findIndex((node) => node.id === incoming.id);
              return {
                ...message,
                thinking:
                  at >= 0
                    ? nodes.map((node, index) => (index === at ? incoming : node))
                    : [...nodes, incoming],
              };
            }),
          );
          if (incoming.status === "running") {
            setAnnouncement(`${incoming.title}：${incoming.summary}`);
          }
        } else if (event.event === "delta") {
          const text = String(event.data.text ?? "");
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + text }
                : message,
            ),
          );
        } else if (event.event === "done") {
          finished = true;
          patchMessage(assistantId, {
            citations: event.data.citations as CitationReport,
            mode: String(event.data.mode ?? ""),
            pending: false,
          });
          setAnnouncement("回答完成");
        } else if (event.event === "error") {
          patchMessage(assistantId, { error: String(event.data.message ?? "生成失败") });
          setAnnouncement("生成失败，已提供可用内容");
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        aborted = true;
        patchMessage(assistantId, { stopped: true });
        setAnnouncement("已停止生成");
      } else {
        patchMessage(assistantId, { error: (error as Error).message });
        setAnnouncement("请求失败，请重试");
      }
    } finally {
      patchMessage(assistantId, { pending: false });
      setPending(false);
      controllerRef.current = null;
      if (!finished && !aborted) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId && !message.error
              ? { ...message, error: "连接中断，未收到完整回答。" }
              : message,
          ),
        );
      }
    }
  }

  function stop() {
    controllerRef.current?.abort();
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }

  function clearConversation() {
    controllerRef.current?.abort();
    setMessages([]);
    lastCountRef.current = 0;
    setConfirmClear(false);
    setAnnouncement("对话已清空");
    requestAnimationFrame(() => {
      const main = document.getElementById("main");
      if (main) main.scrollTop = 0;
      inputRef.current?.focus({ preventScroll: true });
    });
  }

  function reuseQuestion(text?: string) {
    if (!text) return;
    setQuestion(text);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <section className="rounded-panel bg-surface p-6 sm:p-7">
        <SectionHeader
          title="向知识库提问"
          actions={
            messages.length ? (
              <Button variant="outline" onClick={() => setConfirmClear(true)}>
                <Icon name="refresh" className="h-[18px] w-[18px]" />
                新对话
              </Button>
            ) : (
              <Link to="/search" className={buttonClass("outline", "md")}>
                <Icon name="search" className="h-[18px] w-[18px]" />
                检索明细
              </Link>
            )
          }
        />
      </section>

      {messages.length === 0 ? (
        <section className="rounded-panel bg-surface p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-n-150 text-n-950">
              <Icon name="chat" />
            </span>
            <h2 className="text-lg font-semibold tracking-title text-n-950">还没有提问</h2>
          </div>

          <div className="mt-6 flex flex-col">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void ask(suggestion)}
                className="group flex min-h-11 items-center justify-between gap-4 border-b border-line-100 py-2.5 text-left text-body tracking-cn text-n-900 transition-colors duration-150 last:border-0 hover:text-primary"
              >
                <span className="min-w-0">{suggestion}</span>
                <Icon
                  name="chevronRight"
                  className="h-4 w-4 shrink-0 text-n-450 transition-colors duration-150 group-hover:text-primary"
                />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {messages.map((message) =>
        message.role === "user" ? (
          <div key={message.id} className="flex justify-end">
            <p className="max-w-[85%] rounded-card rounded-br-md bg-n-150 px-4 py-2.5 text-body tracking-cn whitespace-pre-wrap text-n-950 sm:max-w-[72%]">
              {message.content}
            </p>
          </div>
        ) : (
          <AssistantMessage key={message.id} message={message} onReuse={reuseQuestion} />
        ),
      )}

      <section className="sticky bottom-0 z-20 mt-auto rounded-panel border border-line-100 bg-surface p-4 sm:p-5">
        <button
          type="button"
          aria-expanded={showConditions}
          onClick={() => setShowConditions((current) => !current)}
          className="-ml-2 inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-xs tracking-cn text-n-550 transition-colors duration-150 hover:bg-n-150 hover:text-n-950"
        >
          <Icon name="filter" className="h-3.5 w-3.5" />
          适用条件
          <span className="text-n-450">· {conditionSummary(conditions)}</span>
          <Icon
            name="chevronDown"
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-150",
              showConditions && "rotate-180",
            )}
          />
        </button>

        {showConditions ? (
          <div className="mt-3 border-t border-line-100 pt-3">
            <ConditionPicker
              value={conditions}
              onChange={setConditions}
              idPrefix="chat"
              showHeader={false}
            />
          </div>
        ) : null}

        <div className="mt-4 flex items-end gap-2">
          <label htmlFor="chat-question" className="sr-only">
            输入问题
          </label>
          <textarea
            ref={inputRef}
            id="chat-question"
            value={question}
            rows={1}
            placeholder="输入临床问题…"
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void ask(question);
              }
            }}
            className="max-h-40 min-h-9 flex-1 resize-none rounded-[10px] border border-line-300 bg-surface px-3 py-2 text-body leading-5 tracking-cn text-n-950 transition-[border-color] duration-150 outline-none placeholder:text-n-450 focus:border-primary"
          />
          {pending ? (
            <Button variant="outline" onClick={stop} className="h-9">
              <Icon name="stop" className="h-[18px] w-[18px]" />
              停止
            </Button>
          ) : (
            <Button
              onClick={() => void ask(question)}
              disabled={!question.trim()}
              className="h-9"
            >
              <Icon name="send" className="h-[18px] w-[18px]" />
              发送
            </Button>
          )}
        </div>

        <p className="mt-2 text-center text-xs tracking-cn text-n-450">
          回答不构成临床诊疗建议
        </p>
      </section>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <ConfirmDialog
        open={confirmClear}
        title="清空当前对话？"
        description="对话记录、证据展开状态与未完成的回答会被清除；知识库内容不受影响。"
        confirmLabel="清空对话"
        onConfirm={clearConversation}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}

function ThinkingPanel({
  nodes,
  pending,
}: {
  nodes: ThinkingNode[];
  pending?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(pending));
  useEffect(() => {
    if (pending) setOpen(true);
  }, [pending]);
  if (!nodes.length) return null;
  const active = nodes.find((node) => node.status === "running") ?? nodes[nodes.length - 1];
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="mt-3 rounded-tip border border-line-100 bg-n-150/40"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-xs tracking-cn [&::-webkit-details-marker]:hidden">
        {pending ? (
          <Spinner className="size-3 text-primary" />
        ) : (
          <Icon name="check" className="h-3.5 w-3.5 text-success" />
        )}
        <span className="font-medium text-n-800">思考过程</span>
        <span className="min-w-0 truncate text-n-550">
          {active.title} · {active.summary}
        </span>
        <span className="ml-auto font-mono tracking-num text-n-450">
          {nodes.length} 个节点
        </span>
        <Icon name="chevronDown" className="h-3.5 w-3.5 text-n-450" />
      </summary>
      <ol className="flex flex-col gap-2 border-t border-line-100 px-3 py-2.5">
        {nodes.map((node, index) => (
          <li key={node.id} className="flex gap-2">
            <span className="mt-0.5 flex w-2 shrink-0 justify-center">
              {node.status === "running" ? (
                <Spinner className="size-2.5 text-primary" />
              ) : node.status === "error" ? (
                <Icon name="alert" className="h-3 w-3 text-danger" />
              ) : (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    index === nodes.length - 1 ? "bg-success" : "bg-n-450",
                  )}
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xs font-medium text-n-800">{node.title}</span>
                <span className="text-[11px] text-n-450">
                  {node.status === "running"
                    ? "进行中"
                    : node.status === "error"
                      ? "失败"
                      : "完成"}
                </span>
              </div>
              <p className="text-xs leading-5 text-n-550">{node.summary}</p>
              {node.items.length ? (
                <dl className="mt-1 grid gap-x-3 gap-y-0.5 text-[11px] leading-4 sm:grid-cols-2">
                  {node.items.map((item) => (
                    <div key={`${node.id}-${item.label}`} className="flex min-w-0 gap-1">
                      <dt className="shrink-0 text-n-450">{item.label}</dt>
                      <dd className="min-w-0 truncate text-n-700" title={item.value}>
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

function AssistantMessage({
  message,
  onReuse,
}: {
  message: ChatMessage;
  onReuse: (text?: string) => void;
}) {
  const items = message.sources?.items ?? [];
  const coverage = message.sources?.coverage;
  const plan = coverage?.facet_plan ?? [];
  const unbound = missingFacets(plan);
  const [showEvidence, setShowEvidence] = useState(true);
  const [showTrace, setShowTrace] = useState(false);
  const coverageNote = [
    ...(coverage?.incomplete_reasons ?? []).map(coverageReason),
    ...(coverage?.missing_roles.length
      ? [`缺角色：${coverage.missing_roles.join("、")}`]
      : []),
    ...(unbound.length
      ? [`证据未覆盖：${unbound.map((facet) => facet.label).join("、")}`]
      : []),
    ...(coverage?.conflicts?.length
      ? [`证据间矛盾 ${coverage.conflicts.length} 处`]
      : []),
  ].join(" · ");

  return (
    <article className="rounded-panel bg-surface p-6 sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium tracking-cn text-n-950">知识库</span>
        {modeLabel(message.mode) ? (
          <StatusChip>{modeLabel(message.mode)}</StatusChip>
        ) : null}
        {message.citations ? <CitationStatus citations={message.citations} /> : null}
        {message.stopped ? <StatusChip>已停止</StatusChip> : null}
        {message.pending ? (
          <span className="inline-flex items-center gap-1.5 text-xs tracking-cn text-n-550">
            <Spinner className="size-3" />
            检索并组织证据…
          </span>
        ) : null}
      </div>

      {message.error ? (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-start gap-x-2 gap-y-1 rounded-tip bg-danger/5 px-3 py-2 text-xs leading-5 tracking-cn text-danger"
        >
          <Icon name="alert" className="mt-0.5 h-3.5 w-3.5" />
          <span className="min-w-0 flex-1">{message.error}</span>
          {message.question ? (
            <button
              type="button"
              onClick={() => onReuse(message.question)}
              className="font-medium underline underline-offset-2 hover:opacity-80"
            >
              放回输入框
            </button>
          ) : null}
        </div>
      ) : null}

      <ThinkingPanel nodes={message.thinking ?? []} pending={message.pending} />

      {message.content ? (
        <>
          <div className="mt-3">
            <Markdown>{message.content}</Markdown>
          </div>
          {message.citations ? (
            <CoverageAudit
              plan={plan}
              sentences={message.citations.sentences ?? []}
              conflicts={coverage?.conflicts ?? []}
              supportMethod={message.citations.support_method}
            />
          ) : null}
        </>
      ) : message.pending ? (
        <div className="mt-4 flex flex-col gap-2" aria-hidden="true">
          <span className="h-3 w-3/5 rounded bg-n-150" />
          <span className="h-3 w-11/12 rounded bg-n-150" />
          <span className="h-3 w-2/3 rounded bg-n-150" />
        </div>
      ) : null}

      {message.stopped && !message.content ? (
        <p className="mt-3 text-body tracking-cn text-n-550">已停止生成，未收到回答内容。</p>
      ) : null}

      {items.length ? (
        <div className="mt-5 border-t border-line-100 pt-4">
          <button
            type="button"
            aria-expanded={showEvidence}
            onClick={() => setShowEvidence((current) => !current)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <Icon name="book" className="h-[18px] w-[18px] text-n-550" />
              <span className="text-sm font-medium tracking-cn text-n-950">
                证据 {items.length} 条
              </span>
              {coverageNote ? (
                <span className="truncate text-xs tracking-cn text-n-450">
                  {coverageNote}
                </span>
              ) : null}
            </span>
            <Icon
              name="chevronDown"
              className={cn(
                "h-[18px] w-[18px] text-n-450 transition-transform duration-150",
                showEvidence && "rotate-180",
              )}
            />
          </button>

          {showEvidence ? (
            <div className="mt-3">
              <EvidenceList items={items} />
            </div>
          ) : null}

          {message.sources?.trace.length ? (
            <div className="mt-3">
              <button
                type="button"
                aria-expanded={showTrace}
                onClick={() => setShowTrace((current) => !current)}
                className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs tracking-cn text-n-550 transition-colors duration-150 hover:bg-n-150 hover:text-n-950"
              >
                检索轨迹 · fingerprint {message.sources.fingerprint.slice(0, 10)}
                <Icon
                  name="chevronDown"
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-150",
                    showTrace && "rotate-180",
                  )}
                />
              </button>
              {showTrace ? (
                <pre className="trace-json mt-2 rounded-tip bg-n-150 p-3">
                  {JSON.stringify(message.sources.trace, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

const supportLabels: Partial<
  Record<ClaimSupport, { label: string; className: string }>
> = {
  supported: { label: "支持", className: "text-n-450" },
  partial: { label: "部分支持", className: "text-n-550" },
  contradicted: { label: "与证据矛盾", className: "font-medium text-danger" },
  unsupported: { label: "无依据", className: "font-medium text-danger" },
  evidence_gap: { label: "证据缺口", className: "text-n-550" },
};

function methodLabel(method?: string): string {
  if (method === "llm-v1") return "LLM 判定";
  if (method === "lexical-span-v2") return "词汇＋跨度代理";
  return "词汇代理";
}

function CoverageAudit({
  plan,
  sentences,
  conflicts,
  supportMethod,
}: {
  plan: FacetPlanItem[];
  sentences: SentenceBinding[];
  conflicts: CoverageConflict[];
  supportMethod?: string;
}) {
  if (!plan.length && !sentences.length) return null;
  const uncited = sentences.filter((sentence) => sentence.status === "uncited").length;
  const unsupported = sentences.filter(
    (sentence) => sentence.support === "unsupported",
  ).length;
  const contradicted = sentences.filter(
    (sentence) => sentence.support === "contradicted",
  ).length;
  return (
    <div className="mt-4 grid gap-3 border-t border-line-100 pt-3 sm:grid-cols-2">
      {plan.length ? (
        <div>
          <p className="text-xs font-medium tracking-cn text-n-550">答案覆盖计划</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {plan.map((facet) => (
              <li
                key={facet.facet_id}
                className="flex flex-wrap items-baseline gap-x-2 text-xs leading-5"
              >
                <span
                  className={
                    facet.evidence_indices.length ? "text-n-700" : "font-medium text-danger"
                  }
                >
                  {facet.label}
                </span>
                <span className="font-mono tracking-num text-n-450">
                  {facet.primary_indices?.length
                    ? `主 ${facet.primary_indices.map((index) => `E${index}`).join("、")}`
                    : ""}
                  {facet.primary_indices?.length && facet.supporting_indices?.length
                    ? " · "
                    : ""}
                  {facet.supporting_indices?.length
                    ? `辅 ${facet.supporting_indices.map((index) => `E${index}`).join("、")}`
                    : ""}
                  {!facet.evidence_indices.length ? "无候选证据" : ""}
                </span>
                {facet.status === "partial" ? (
                  <span className="text-[11px] text-n-450">仅辅助证据</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {conflicts.length ? (
        <div className="sm:col-span-2">
          <p className="text-xs font-medium tracking-cn text-danger">
            证据间潜在矛盾（需并列呈现）
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {conflicts.map((conflict, index) => (
              <li key={`${conflict.left_index}-${conflict.right_index}-${index}`} className="text-xs leading-5 text-n-700">
                <span className="font-mono text-primary">
                  E{conflict.left_index} vs E{conflict.right_index}
                </span>{" "}
                ：{conflict.left_quote} ↔ {conflict.right_quote}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sentences.length ? (
        <div>
          <p className="text-xs font-medium tracking-cn text-n-550">
            结论-证据核对（
            {methodLabel(supportMethod)}）· 未标注 {uncited} 条
            {unsupported ? ` · 无依据 ${unsupported} 条` : ""}
            {contradicted ? ` · 矛盾 ${contradicted} 条` : ""}
          </p>
          <ul className="mt-1.5 flex max-h-40 flex-col gap-1 overflow-auto pr-1">
            {sentences.map((sentence) => (
              <li key={sentence.index} className="flex gap-1.5 text-xs leading-5">
                <span
                  className={cn(
                    "shrink-0 font-mono tracking-num",
                    sentence.status === "cited" ? "text-primary" : "text-n-450",
                  )}
                >
                  {sentence.citations.length
                    ? sentence.citations.map((index) => `E${index}`).join(" ")
                    : "—"}
                </span>
                <span
                  className={cn(
                    "min-w-0",
                    sentence.status === "uncited" ? "text-n-550" : "text-n-700",
                  )}
                  title={
                    sentence.evidence_spans?.length
                      ? sentence.evidence_spans
                          .map(
                            (span) =>
                              `E${span.index} [${span.char_start},${span.char_end})：${span.quote}`,
                          )
                          .join("\n\n")
                      : undefined
                  }
                >
                  {sentence.text}
                  {supportLabels[sentence.support] ? (
                    <span
                      className={cn(
                        "ml-1 whitespace-nowrap text-[11px]",
                        supportLabels[sentence.support]?.className,
                      )}
                    >
                      〔{supportLabels[sentence.support]?.label}〕
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CitationStatus({ citations }: { citations: CitationReport }) {
  const uncited = citations.uncited_count ?? 0;
  const unsupported = citations.support_counts?.unsupported ?? 0;
  const contradicted = citations.support_counts?.contradicted ?? 0;
  const proxy = methodLabel(citations.support_method);
  if (citations.status === "mapped") {
    return (
      <>
        <StatusChip tone="success">
          引用可回指 {citations.mapped_indices.length} 条
        </StatusChip>
        {uncited ? <StatusChip tone="danger">{uncited} 条结论未标注证据</StatusChip> : null}
        {unsupported ? (
          <StatusChip tone="danger">
            {unsupported} 条断言无证据支持（{proxy}）
          </StatusChip>
        ) : null}
        {contradicted ? (
          <StatusChip tone="danger">
            {contradicted} 条断言与证据矛盾（{proxy}）
          </StatusChip>
        ) : null}
      </>
    );
  }
  if (citations.status === "no_citations") {
    return <StatusChip>未标注引用</StatusChip>;
  }
  return (
    <StatusChip tone="danger">
      引用核验失败 · {citationFailureLabels[citations.status] ?? citations.status}
    </StatusChip>
  );
}
