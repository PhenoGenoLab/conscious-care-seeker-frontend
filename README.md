# conscious-care-seeker-frontend

意识昏迷知识库（Disorders of Consciousness, DoC）的前端单页应用：流式问答、证据检索与知识库管理。
每个证据片段都保留来源、页码与字符区间；答案中的 `[E#]` 编号可回指到后端锚点。

本仓库只包含前端。后端与语料在
[PhenoGenoLab/Consciousness_coma_rag](https://github.com/PhenoGenoLab/Consciousness_coma_rag)，
开发时默认从本机 `127.0.0.1:8000` 读取 API。

> 本系统输出不构成诊疗建议。

## 技术栈

React 19 · Vite 7 · Tailwind CSS 4 · react-router 7 · react-markdown + remark-gfm，包管理使用 Bun。

## 快速开始

```bash
bun install
bun run dev        # http://localhost:5173，/api 代理到 http://127.0.0.1:8000
```

需要先启动后端（在 `Consciousness_coma_rag` 仓库中）：

```bash
cd agents
uv run cc-rag ingest
uv run cc-rag serve --port 8000
```

## 脚本

| 命令 | 作用 |
|---|---|
| `bun run dev` | Vite 开发服务器，端口 5173 |
| `bun run build` | `tsc -b && vite build`，产物在 `dist/` |
| `bun run preview` | 预览构建产物 |
| `bun run typecheck` | 仅类型检查（`tsc -b --noEmit`） |

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `VITE_BACKEND_URL` | `http://127.0.0.1:8000` | 开发服务器 `/api` 代理目标（仅 dev） |
| `VITE_BASE_PATH` | `/` | 部署子路径；`.env.production` 设为 `/conscious-care-seeker/` |
| `VITE_API_BASE_URL` | `import.meta.env.BASE_URL` | 显式覆盖 API 基址；默认与页面同基址 |

生产构建的 `dist/` 可直接由后端 gateway 托管（同一端口提供 SPA），也可独立部署到
`/conscious-care-seeker/` 并通过反向代理转发 `/api`。

## 页面与目录

```text
src/
  main.tsx                    入口
  App.tsx                     路由：/（问答）、/search（证据检索）、/library（知识库）
  components/                 布局、证据卡片、条件选择器、Markdown、通用 UI
  lib/api.ts                  HTTP 契约（只在此处 fetch）
  lib/sse.ts                  SSE 解析（event:/data: 分块）
  lib/types.ts                后端响应类型镜像
  lib/labels.ts               枚举/原因文案映射
  pages/chat.tsx              流式问答
  pages/search.tsx            检索、条件过滤与检索轨迹
  pages/library.tsx           上传/删除来源与统计
```

## 约定

- API 与 SSE 只经 `src/lib/api.ts`、`src/lib/sse.ts`，组件不直接 `fetch`。
- 类型镜像后端契约放在 `src/lib/types.ts`；后端字段变化需同步。
- 样式使用 `src/index.css` 的 Tailwind `@theme` 语义色（`bg-surface`、`text-muted`、`border-line`、`bg-accent`），避免散落十六进制色。
- 证据展示必须保留 `E{index}`、`source_id`、页与字符区间；`Unknown` 适用性不得显示为已验证。
- 条件轴固定为 `population` / `phase` / `etiology`；新增取值需同步 `src/components/condition-picker.tsx` 与后端抽取规则。