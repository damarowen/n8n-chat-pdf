# Project Overview: n8n-workflows

A monorepo managing AI-powered automation workflows using **n8n-as-code** alongside a modern **React/Next.js** frontend for a document-aware chatbot.

---

## Table of Contents

1. [Project Summary](#project-summary)
2. [Repository Structure](#repository-structure)
3. [The n8n Backend](#the-n8n-backend)
   - [Architecture: n8n-as-code](#architecture-n8n-as-code)
   - [Primary Workflow: n8n-chatbot-pdf-gdrive-gemini](#primary-workflow-n8n-chatbot-pdf-gdrive-gemini)
   - [Data Flow](#data-flow)
   - [Credentials & Services](#credentials--services)
4. [The React Frontend: chat-ui](#the-react-frontend-chat-ui)
   - [Stack](#stack)
   - [Component Architecture](#component-architecture)
   - [API Contract](#api-contract)
5. [Development Workflow](#development-workflow)
   - [n8nac Commands](#n8nac-commands)
   - [Local Frontend Development](#local-frontend-development)
6. [Deployment](#deployment)
7. [Environment Configuration](#environment-configuration)
8. [AI Agent Guidelines](#ai-agent-guidelines)

---

## Project Summary

| Property | Value |
|----------|-------|
| **Context Root** | `/Users/macbookair/Desktop/n8n-workflows` |
| **Primary Purpose** | AI document chatbot with RAG (Retrieval Augmented Generation) |
| **Workflow Platform** | n8n (v2.12.3 at generation time) |
| **Frontend** | Next.js 16 + React 19 + Tailwind CSS v4 |
| **LLM Provider** | Google Gemini (models/gemini-1.5-flash) |
| **Vector Store** | Supabase (`documents` table) |
| **Chat Memory** | PostgreSQL (`chat_history` table) |
| **Deployment Target** | Vercel (frontend), n8n Cloud/External (backend) |

The repo contains two main workstreams:
1. **Workflow management** via `n8n-as-code` — TypeScript-first authoring, validation, and sync of n8n workflows.
2. **React migration** — A Next.js app replacing the inline HTML chat UI served by n8n with a dedicated, deployable frontend.

---

## Repository Structure

```
n8n-workflows/
├── .github/
│   └── agents/
│       └── n8n-architect.agent.md       # AI agent spec for n8n-as-code
├── .agents/
│   └── skills/
│       └── n8n-architect/
│           └── SKILL.md                   # Portable skill for n8n work
├── .n8nac/
│   └── ai-context.json                  # Auto-generated n8nac context
├── chat-ui/                             # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── components/
│   │       └── Chat.tsx                 # Main chat + upload UI
│   ├── public/                          # Static assets
│   ├── .env.example
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   ├── react-migration-plan.md          # Migration design document
│   └── PROJECT_OVERVIEW.md              # This file
├── workflows/
│   └── n8n-damar/
│       ├── n8n-chatbot-pdf-gdrive-gemini.workflow.ts
│       ├── n8n-workflows.d.ts           # TypeScript stubs for n8n-as-code
│       └── tsconfig.json
├── AGENTS.md                            # AI agent bootstrap context
├── n8nac-config.json                    # n8n-as-code workspace config
└── .gitignore
```

---

## The n8n Backend

### Architecture: n8n-as-code

This project uses **n8n-as-code** (via `n8nac` CLI) to manage workflows as TypeScript files rather than through the n8n UI.

- **Primary CLI**: `npx --yes n8nac ...`
- **Secondary CLI** (local instances only): `npx --yes @n8n-as-code/n8n-manager ...`
- **Workflow path**: `workflows/n8n-damar/`
- **Active Environment**: `n8n-damar-2`
- **Instance URL**: `https://nein.damarowen.blog`

Key commands:
- `npx --yes n8nac workspace migrate --json` — Check for required migrations
- `npx --yes n8nac workspace status --json` — Verify workspace state
- `npx --yes n8nac list` — List all workflows
- `npx --yes n8nac pull <workflowId>` — Pull remote changes
- `npx --yes n8nac push <path> --verify` — Push local changes
- `npx --yes n8nac skills search "<node or capability>"` — Schema lookup

### Primary Workflow: `n8n-chatbot-pdf-gdrive-gemini`

A 20-node workflow that implements a full RAG chatbot with dual ingestion paths.

#### Node Inventory

| # | Property Name | Node Type | Role |
|---|---------------|-----------|------|
| 1 | `WhenClickingExecuteWorkflow` | `manualTrigger` | Manual execution for document ingestion |
| 2 | `DownloadFile` | `googleDrive` | Downloads a PDF from Google Drive |
| 3 | `SupabaseVectorStore` | `vectorStoreSupabase` | Vectorizes & stores documents (insert mode) |
| 4 | `EmbeddingsGoogleGemini` | `embeddingsGoogleGemini` | Embedding model (gemini-embedding-001) |
| 5 | `DefaultDataLoader` | `documentDefaultDataLoader` | Extracts text from PDF binary |
| 6 | `RecursiveCharacterTextSplitter` | `textSplitterRecursiveCharacterTextSplitter` | Chunks text (1000 chars, 100 overlap) |
| 7 | `StickyNote` | `stickyNote` | Documentation: ingestion pipeline summary |
| 8 | `AiAgent` | `agent` | AI orchestrator with system prompt |
| 9 | `GoogleGeminiChatModel` | `lmChatGoogleGemini` | LLM (gemini-1.5-flash, temp=0.1) |
| 10 | `PostgresChatMemory` | `memoryPostgresChat` | Conversation memory in Postgres |
| 11 | `EmbeddingsGoogleGemini1` | `embeddingsGoogleGemini` | Embedding model for retrieval |
| 12 | `SupabaseVectorStore1` | `vectorStoreSupabase` | Retrieval tool for AI Agent |
| 13 | `WhenChatMessageReceived` | `chatTrigger` | Public chat trigger webhook |
| 14 | `IfFileUploaded` | `if` | Branch: file upload vs chat only |
| 15 | `UploadAcknowledgement` | `set` | "Your file was uploaded and indexed" |
| 16 | `StickyNote1` | `stickyNote` | Documentation: chat pipeline summary |
| 17 | `EditFields` | `set` | Error fallback message (in Indonesian) |
| 18 | `If_` | `if` | Detect AI errors |
| 19 | `ChatUiWebhook` | `webhook` | GET /webhook/chat-ui (legacy HTML UI) |
| 20 | `HtmlChatResponse` | `respondToWebhook` | Returns inline HTML chat page |

#### Routing Map

```
INGESTION PATH (Manual)
WhenClickingExecuteWorkflow
  -> DownloadFile
    -> SupabaseVectorStore
      -> UploadAcknowledgement

CHAT PATH (Automatic)
WhenChatMessageReceived
  -> IfFileUploaded
    -> true:  SupabaseVectorStore (index uploaded PDF)
    -> false: AiAgent
               -> If_ (check for error)
                 -> true: EditFields (error message)

LEGACY UI
ChatUiWebhook
  -> HtmlChatResponse (serves built-in HTML page)
```

#### AI Sub-Node Connections (via `.uses()`)

```
SupabaseVectorStore
  .uses({ ai_embedding: EmbeddingsGoogleGemini,
          ai_document: [DefaultDataLoader] })

DefaultDataLoader
  .uses({ ai_textSplitter: RecursiveCharacterTextSplitter })

AiAgent
  .uses({ ai_languageModel: GoogleGeminiChatModel,
          ai_memory: PostgresChatMemory,
          ai_tool: [SupabaseVectorStore1] })

SupabaseVectorStore1
  .uses({ ai_embedding: EmbeddingsGoogleGemini1 })
```

#### System Prompt (AI Agent)

> "Anda adalah Asisten Virtual yang bertugas menjawab pertanyaan berdasarkan dokumen yang diberikan.
> ATURAN UTAMA:
> 1. GUNAKAN HANYA informasi yang ditemukan dalam dokumen (Context)...
> 2. JANGAN gunakan pengetahuan umum Anda di luar dokumen tersebut.
> 3. JIKA informasi tidak ada dalam dokumen, jawablah dengan jujur...
> 4. JAWABLAH dengan bahasa yang sama dengan pertanyaan user (Indonesia/Inggris).
> 5. TETAPLAH objektif, profesional, dan ringkas."

### Data Flow

1. **Document Ingestion (Manual)**
   - Operator triggers manual execution.
   - PDF is downloaded from a fixed Google Drive file (`Damar-Oen-Resume-2026.pdf`).
   - Text is extracted, split into 1000-char chunks with 100-char overlap.
   - Each chunk is embedded using Google Gemini embedding-001 and stored in Supabase `documents` table.

2. **Chat + Upload (Automatic)**
   - User sends a message (optionally with a PDF) via the webhook `POST /webhook/31a47c8c-aaee-4182-a6c5-6da629ab1cc0/chat`.
   - If a PDF is uploaded, it is routed to SupabaseVectorStore for immediate indexing.
   - The message is forwarded to the AI Agent.
   - The AI Agent queries `SupabaseVectorStore1` (retrieve-as-tool) via the Supabase `match_documents` RPC.
   - Retrieved chunks + chat history (from Postgres) + user question are passed to Google Gemini.
   - Response is returned to the user.
   - If any error occurs, a polite Indonesian fallback message is returned.

3. **Legacy HTML UI**
   - `GET /webhook/chat-ui` serves a self-contained HTML page (built with Tailwind CDN) that can also interact with the chat webhook.

### Credentials & Services

| Service | Credential Type | Node(s) |
|---------|----------------|---------|
| Google Drive | `googleDriveOAuth2Api` | DownloadFile |
| Supabase | `supabaseApi` | SupabaseVectorStore, SupabaseVectorStore1 |
| Google Gemini | `googlePalmApi` | EmbeddingsGoogleGemini, GoogleGeminiChatModel, EmbeddingsGoogleGemini1 |
| PostgreSQL | `postgres` | PostgresChatMemory |

---

## The React Frontend: `chat-ui`

### Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.2.6 |
| React | React / React DOM | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| Language | TypeScript | ^5 |
| Font | Geist (Sans + Mono) | Google Fonts |

### Component Architecture

```
page.tsx
  -> Chat.tsx (client component)
       -> Header (title + session info)
       -> Message list (user / assistant / system bubbles)
       -> Form
            -> textarea (message input)
            -> file input (PDF upload)
            -> submit button
```

### Key Features

- **Session Persistence**: `sessionId` stored in `localStorage` so conversation context survives page refreshes.
- **File Upload**: Users can attach a PDF; it is sent as `data` in multipart form-data.
- **Error Handling**: Distinguishes HTTP errors, JSON parsing, and missing response fields. Displays errors as "system" messages.
- **Responsive**: Works on mobile and desktop with Tailwind utility classes.
- **Dark Mode Ready**: Uses `dark:` variants throughout.

### API Contract

**Request** (`POST`, `multipart/form-data`):
- `chatInput` (string): User message text
- `sessionId` (string): Persistent browser session ID
- `data` (file, optional): PDF binary

**Response** (`application/json` or `text/plain`):
- Expected JSON: `{ "output": "..." }` or `{ "message": "..." }`
- Fallback: plain text

**Environment Variable**:
```bash
NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL=https://nein.damarowen.blog/webhook/31a47c-8c-aaee-4182-a6c5-6da629ab1cc0/chat
```

### Local Development

```bash
cd chat-ui
cp .env.example .env.local
npm install
npm run dev
# Open http://localhost:3000
```

### Production Deployment

1. Push the n8n workflow and ensure it is active.
2. Set `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` in Vercel / Netlify environment settings.
3. Build and deploy the Next.js app.
4. Ensure CORS allows the frontend domain on the n8n webhook (or use a Next.js API proxy if needed).

---

## Development Workflow

### n8nac Commands

All n8n-as-code commands run from the **context root** (`/Users/macbookair/Desktop/n8n-workflows`):

```bash
# Pre-flight (always run these first)
npx --yes n8nac workspace migrate --json
npx --yes n8nac workspace status --json

# List workflows
npx --yes n8nac list

# Pull changes before editing
npx --yes n8nac pull <workflowId>

# Push after editing
npx --yes n8nac push workflows/n8n-damar/n8n-chatbot-pdf-gdrive-gemini.workflow.ts --verify

# Validate locally
npx --yes n8nac skills validate workflows/n8n-damar/n8n-chatbot-pdf-gdrive-gemini.workflow.ts

# Test
npx --yes n8nac test-plan <workflowId> --json
npx --yes n8nac workflow activate <workflowId>
npx --yes n8nac test <workflowId> --prod

# Present workflow URL
npx --yes n8nac workflow present <workflowId> --json
```

### Local Frontend Development

```bash
cd /Users/macbookair/Desktop/n8n-workflows/chat-ui
npm install
npm run dev
```

The frontend automatically connects to the live n8n webhook URL defined in `.env.local`.

---

## Deployment

| Component | Target | Notes |
|-----------|--------|-------|
| n8n Workflows | External n8n Instance | `https://nein.damarowen.blog` |
| Next.js Frontend | Vercel / Netlify | `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` must be set |

### Deployment Checklist

- [ ] Workflow pushed and active in n8n
- [ ] CORS allows frontend domain (if needed)
- [ ] Env var `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` set in platform
- [ ] Production test: chat text only
- [ ] Production test: upload PDF only
- [ ] Production test: ask question requiring retrieved context

---

## Environment Configuration

### `n8nac-config.json`

```json
{
  "version": 4,
  "activeEnvironmentId": "n8n-damar-2",
  "environmentTargets": [
    {
      "id": "n8n-damar",
      "name": "n8n damar",
      "kind": "external-instance",
      "url": "https://nein.damarowen.blog"
    }
  ],
  "environments": [
    {
      "id": "n8n-damar-2",
      "name": "n8n damar",
      "syncSlug": "n8n-damar",
      "environmentTargetId": "n8n-damar",
      "projectId": "personal",
      "projectName": "Personal",
      "workflowsPath": "workflows/n8n-damar",
      "folderSync": true
    }
  ]
}
```

This configures:
- **Target**: External n8n instance at `nein.damarowen.blog`
- **Workflow Directory**: `workflows/n8n-damar`
- **Folder Sync**: Enabled (bidirectional sync of workflow folder)
- **Project**: `personal`

---

## AI Agent Guidelines

This repository includes two AI agent configurations:

1. **`.github/agents/n8n-architect.agent.md`** — VS Code / Copilot-compatible workspace agent.
2. **`.agents/skills/n8n-architect/SKILL.md`** — Portable skill fallback.

Both enforce:
- `n8nac` as the primary CLI interface.
- Pre-flight migration checks before any workflow work.
- Pull-before-edit, push-after-edit discipline.
- Schema-first research using `npx --yes n8nac skills ...`.
- Never writing `n8nac-config.json` or credential files by hand.

When working on this repo, AI agents should:
1. Run `npx --yes n8nac update-ai` and read `AGENTS.md`.
2. Run `npx --yes n8nac workspace migrate --json`.
3. Run `npx --yes n8nac workspace status --json`.
4. Only then proceed with workflow or frontend tasks.

---

## Notes & Decisions

- **Why n8n-as-code?** Workflows are version-controlled, reviewable, and refactorable via standard TypeScript tooling. The inline `<workflow-map>` block at the top of each `.workflow.ts` file acts as a self-documenting index.
- **Why a separate React frontend?** The legacy HTML chat (served by `respondToWebhook`) is functional but not customizable or deployable as a standalone app. The Next.js app (`chat-ui`) provides a modern, responsive, and independently deployable interface while keeping n8n as the pure backend API.
- **Language**: The AI agent's system prompt is written in **Indonesian** because the target users primarily communicate in Indonesian.
- **Session Strategy**: `sessionId` is browser-scoped via `localStorage`, not user-authenticated. This is appropriate for a public-facing demo/chat assistant.

---

*Last updated: 2026-05-24*
