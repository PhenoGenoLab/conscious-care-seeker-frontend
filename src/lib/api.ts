import type {
  ConditionPayload,
  DocumentSummary,
  Health,
  SearchResult,
  Stats,
  UploadResult,
} from "./types";

const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? baseUrl;
export const LIBRARY_CHANGED_EVENT = "cc-rag:library-changed";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      detail = payload.detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export const api = {
  health: () => request<Health>("/api/health"),
  stats: () => request<Stats>("/api/stats"),
  documents: () =>
    request<{ documents: DocumentSummary[] }>("/api/documents").then((r) => r.documents),
  deleteDocument: (sourceId: string) =>
    request<{ stats: Stats }>(`/api/documents/${encodeURIComponent(sourceId)}`, {
      method: "DELETE",
    }),
  upload: (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    return request<{ results: UploadResult[]; stats: Stats }>("/api/documents", {
      method: "POST",
      body: form,
    });
  },
  search: (payload: {
    question: string;
    conditions: ConditionPayload;
    k?: number;
    include_inapplicable?: boolean;
  }) =>
    request<SearchResult>("/api/search", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
