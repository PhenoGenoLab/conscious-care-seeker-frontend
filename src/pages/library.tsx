import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  SectionHeader,
  Spinner,
  StatusChip,
  cn,
} from "@/components/ui";
import { api, LIBRARY_CHANGED_EVENT } from "@/lib/api";
import type { DocumentSummary, Stats, UploadResult } from "@/lib/types";

const ACCEPT = ".md,.markdown,.txt,.pdf";
const MAX_BYTES = 25 * 1024 * 1024;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function LibraryPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [loadError, setLoadError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [target, setTarget] = useState<DocumentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const draggingDepth = useRef(0);

  const refresh = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const [nextDocuments, health] = await Promise.all([api.documents(), api.health()]);
      setDocuments(nextDocuments);
      setStats(health.stats);
      setLoadError("");
      window.dispatchEvent(new Event(LIBRARY_CHANGED_EVENT));
    } catch (cause) {
      setLoadError((cause as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  async function upload(files: File[]) {
    if (!files.length || uploading) return;

    const oversized = files.filter((file) => file.size > MAX_BYTES);
    const usable = files.filter((file) => file.size <= MAX_BYTES);
    setUploadError(
      oversized.length
        ? `${oversized.map((file) => file.name).join("、")} 超过 25 MiB，未上传。`
        : "",
    );
    if (!usable.length) return;

    setUploading(true);
    setResults([]);
    setAnnouncement(`正在导入 ${usable.length} 个文件`);
    try {
      const response = await api.upload(usable);
      setResults(response.results);
      setStats(response.stats);
      await refresh();
      const created = response.results.filter((item) => !item.error).length;
      const failed = response.results.length - created;
      setAnnouncement(
        `导入完成：${created} 个文件已处理${failed ? `，${failed} 个失败` : ""}`,
      );
    } catch (cause) {
      setUploadError((cause as Error).message);
      setAnnouncement("导入失败");
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    if (!target || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await api.deleteDocument(target.source_id);
      setStats(response.stats);
      setTarget(null);
      setResults([]);
      await refresh();
      setAnnouncement(`已删除来源 ${target.title}`);
      requestAnimationFrame(() => headingRef.current?.focus());
    } catch (cause) {
      setDeleteError((cause as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-panel bg-surface p-6 sm:p-7">
        <SectionHeader
          title="知识库"
          actions={
            <Button
              variant="outline"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              <Icon
                name="refresh"
                className={cn("h-[18px] w-[18px]", refreshing && "animate-spin")}
              />
              {refreshing ? "刷新中…" : "刷新"}
            </Button>
          }
        />
      </section>

      <section
        aria-label="知识库统计"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-line-100 sm:grid-cols-4"
      >
        {[
          { label: "来源", value: stats?.sources },
          { label: "证据片段", value: stats?.chunks },
          { label: "条件记录", value: stats?.conditions },
          { label: "向量片段", value: stats?.embedded_chunks },
        ].map((metric) => (
          <div key={metric.label} className="bg-surface px-5 py-4">
            <p className="text-xs tracking-cn text-n-450">{metric.label}</p>
            <p className="mt-1 font-mono text-xl leading-7 tracking-num tabular-nums text-n-950">
              {metric.value ?? "—"}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-panel bg-surface p-6 sm:p-7">
        <h2 className="text-xl font-semibold tracking-title text-n-950">导入语料</h2>

        <div
          onDragEnter={(event) => {
            event.preventDefault();
            draggingDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault();
            draggingDepth.current = Math.max(0, draggingDepth.current - 1);
            if (draggingDepth.current === 0) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            draggingDepth.current = 0;
            setDragging(false);
            void upload(Array.from(event.dataTransfer.files));
          }}
          className={cn(
            "mt-4 flex flex-col items-center justify-center rounded-card border border-dashed px-6 py-8 text-center transition-colors duration-150",
            dragging ? "border-primary bg-primary/5" : "border-line-300 bg-canvas/60",
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-n-150 text-n-950">
            {uploading ? <Spinner className="size-5" /> : <Icon name="upload" />}
          </span>
          <p className="mt-3 text-body font-medium tracking-cn text-n-950">
            {uploading ? "正在解析与切块…" : "拖入文件，或选择上传"}
          </p>
          <p className="mt-1 text-xs tracking-cn text-n-450">
            支持 .md / .txt / .pdf，单个 ≤ 25 MiB
          </p>
          <input
            ref={inputRef}
            id="library-files"
            type="file"
            accept={ACCEPT}
            multiple
            tabIndex={-1}
            className="sr-only"
            onChange={(event) => {
              void upload(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <Button
            variant="outline"
            className="mt-3"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            选择文件
          </Button>
        </div>

        {uploadError ? (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-tip bg-danger/5 px-3 py-2 text-xs leading-5 tracking-cn text-danger"
          >
            <Icon name="alert" className="mt-0.5 h-3.5 w-3.5" />
            {uploadError}
          </p>
        ) : null}

        {results.length ? (
          <ul className="mt-3 flex flex-col gap-1.5" aria-label="上传结果">
            {results.map((result, index) => (
              <li
                key={`${result.source_id ?? result.filename}-${index}`}
                className={cn(
                  "flex items-start gap-2 rounded-tip px-3 py-2 text-xs leading-5 tracking-cn",
                  result.error ? "bg-danger/5 text-danger" : "bg-n-150 text-n-700",
                )}
              >
                <Icon
                  name={result.error ? "alert" : "check"}
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5",
                    !result.error && "text-success",
                  )}
                />
                <span className="min-w-0">
                  <span className="font-medium">
                    {result.filename ?? result.source_id}
                  </span>
                  {" · "}
                  {result.error
                    ? result.error
                    : result.created
                      ? `已入库 ${result.chunks} 个片段`
                      : "内容未变化，已跳过"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </section>

      <section className="rounded-panel bg-surface p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="scroll-mt-24 text-xl font-semibold tracking-title text-n-950 outline-none"
          >
            知识库来源
          </h2>
          {stats && stats.sources > 0 ? (
            <StatusChip tone="success">{stats.sources} 篇可用</StatusChip>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-4 flex flex-col gap-2" role="status" aria-live="polite">
            <span className="sr-only">正在加载来源</span>
            {[0, 1, 2].map((row) => (
              <span key={row} className="h-12 rounded-deco bg-n-150" aria-hidden="true" />
            ))}
          </div>
        ) : loadError ? (
          <div className="mt-4 flex flex-wrap items-start gap-3 rounded-tip bg-danger/5 px-3 py-3">
            <Icon name="alert" className="mt-0.5 h-[18px] w-[18px] text-danger" />
            <div className="min-w-0 flex-1">
              <p role="alert" className="text-body tracking-cn text-danger">
                加载来源失败：{loadError}
              </p>
              <p className="mt-0.5 text-xs tracking-cn text-n-550">
                请确认后端已启动，或稍后重试。
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              重试
            </Button>
          </div>
        ) : documents.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="text-xs font-normal tracking-cn text-n-450">
                  <th className="border-b border-line-200 pb-2 text-left font-normal">来源</th>
                  <th className="hidden w-[90px] border-b border-line-200 pb-2 pl-6 text-left font-normal sm:table-cell">
                    类型
                  </th>
                  <th className="hidden w-[80px] border-b border-line-200 px-6 pb-2 text-right font-normal md:table-cell">
                    片段
                  </th>
                  <th className="hidden w-[150px] border-b border-line-200 px-6 pb-2 text-left font-normal md:table-cell">
                    入库时间
                  </th>
                  <th className="border-b border-line-200 pb-2 pl-6 text-right font-normal">操作</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.source_id} className="group">
                    <td className="max-w-[380px] border-b border-line-100 py-3 pr-6">
                      <p className="flex items-center gap-1.5 truncate font-medium text-n-950">
                        <Icon name="file" className="h-3.5 w-3.5 text-n-450" />
                        {document.title}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs tracking-num text-n-450">
                        {document.source_id} · {document.chunk_count} 片段
                      </p>
                    </td>
                    <td className="hidden border-b border-line-100 py-3 pl-6 text-xs tracking-cn text-n-550 uppercase sm:table-cell">
                      {document.kind}
                    </td>
                    <td className="hidden border-b border-line-100 px-6 py-3 text-right font-mono text-xs tracking-num tabular-nums text-n-450 md:table-cell">
                      {document.chunk_count}
                    </td>
                    <td className="hidden border-b border-line-100 px-6 py-3 font-mono text-xs tracking-num whitespace-nowrap tabular-nums text-n-450 md:table-cell">
                      {formatDate(document.ingested_at)}
                    </td>
                    <td className="border-b border-line-100 py-3 pl-6 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`删除来源 ${document.title}`}
                        onClick={() => {
                          setDeleteError("");
                          setTarget(document);
                        }}
                        className="h-11 text-n-700 hover:border-danger/40 hover:text-danger sm:h-8"
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              icon={<Icon name="database" />}
              title="知识库为空"
              action={
                <Button onClick={() => inputRef.current?.click()}>
                  <Icon name="upload" className="h-[18px] w-[18px]" />
                  选择文件
                </Button>
              }
            />
          </div>
        )}
      </section>

      <ConfirmDialog
        open={target !== null}
        title="删除这个来源？"
        description={
          target ? (
            <>
              <span className="font-medium text-n-950">{target.title}</span>（
              <span className="font-mono text-xs">{target.source_id}</span>）及其{" "}
              {target.chunk_count} 个证据片段、锚点、条件与向量投影都会被删除，无法撤销。
            </>
          ) : (
            ""
          )
        }
        confirmLabel="删除来源"
        pending={deleting}
        error={deleteError}
        onConfirm={() => void remove()}
        onClose={() => {
          if (!deleting) {
            setTarget(null);
            setDeleteError("");
          }
        }}
      />
    </div>
  );
}
