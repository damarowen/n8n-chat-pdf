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
7. [Infrastructure as Code (Terraform)](#infrastructure-as-code-terraform)
   - [What it Provisions](#what-it-provisions)
   - [File Structure & Responsibilities](#file-structure--responsibilities)
   - [First-Time Setup](#first-time-setup)
   - [Common Tasks](#common-tasks)
   - [Changing the Custom Domain](#changing-the-custom-domain)
8. [Environment Configuration](#environment-configuration)
9. [AI Agent Guidelines](#ai-agent-guidelines)

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
│   └── README.md                        # This file
├── infra/                               # Terraform IaC for Vercel deployment
│   ├── versions.tf                      # Terraform + provider version locks
│   ├── providers.tf                     # Vercel provider config (token via env)
│   ├── variables.tf                     # Input variables + defaults
│   ├── main.tf                          # Project + env var + domain resources
│   ├── outputs.tf                       # project_id, URLs, DNS instructions
│   ├── terraform.tfvars.example         # Template (commit-safe)
│   ├── terraform.tfvars                 # YOUR values (gitignored)
│   └── README.md                        # Infra-specific setup guide
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
| Next.js Frontend | Vercel (via Terraform) | Provisioned by `infra/` — see [Infrastructure as Code](#infrastructure-as-code-terraform) |
| Custom Domain | `askingpdf.damarowen.blog` | Managed by `vercel_project_domain` in Terraform |

### Deployment Checklist

- [ ] Workflow pushed and active in n8n
- [ ] CORS allows frontend domain (if needed)
- [ ] Env var `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` set in platform
- [ ] Production test: chat text only
- [ ] Production test: upload PDF only
- [ ] Production test: ask question requiring retrieved context

---

## Infrastructure as Code (Terraform)

The `infra/` folder contains **Terraform** code that provisions the entire Vercel
deployment automatically. If you've never used Terraform before — think of it as
"infrastructure version control": instead of clicking buttons in the Vercel
dashboard, the desired state is described in `.tf` files and applied by a single
command. Re-running the command is idempotent (no duplicate resources).

> **TL;DR**: After cloning, set `VERCEL_API_TOKEN`, copy `terraform.tfvars.example`
> to `terraform.tfvars`, then run `terraform init && terraform apply`. The Vercel
> project + custom domain + env vars are created automatically. Future `git push`
> to `main` triggers a production deploy via Vercel's native GitHub integration.

### What it Provisions

| Resource | Purpose |
|----------|---------|
| `vercel_project.chat_ui` | The Vercel project itself, linked to the GitHub repo `damarowen/n8n-chat-pdf`, with `chat-ui/` as the monorepo root directory and `framework = nextjs` |
| `vercel_project_environment_variable.n8n_webhook` | Sets `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` across all three Vercel environments (production / preview / development) |
| `vercel_project_domain.custom` | Attaches the custom domain (e.g. `askingpdf.damarowen.blog`) to the project |

After `apply`, Vercel auto-deploys whenever you `git push origin main` — no
Terraform re-run is needed for code changes. Terraform is only re-run when you
change **infrastructure** (env vars, domain, project settings).

### File Structure & Responsibilities

```
infra/
├── versions.tf              # Pins Terraform CLI >= 1.6.0 and provider versions
├── providers.tf             # Configures the Vercel provider (reads token from env var)
├── variables.tf             # Declares all input variables + their defaults
├── main.tf                  # Defines the actual resources (project, env var, domain)
├── outputs.tf               # Values printed after apply (project ID, URLs, DNS hints)
├── terraform.tfvars.example # Template — copy to terraform.tfvars and customize
├── terraform.tfvars         # YOUR local values (gitignored, never committed)
├── terraform.tfstate        # State file (gitignored — tracks what Terraform created)
├── .terraform.lock.hcl      # Provider version lockfile (COMMITTED for reproducibility)
└── README.md                # Folder-level setup guide (same info, more detail)
```

| File | What it does | When you edit it |
|------|--------------|------------------|
| **`versions.tf`** | Locks Terraform version (`>= 1.6.0`) and Vercel provider version (`vercel/vercel ~> 2.0`). Acts as a compatibility guarantee. | Almost never — only when upgrading provider. |
| **`providers.tf`** | Tells Terraform how to authenticate with Vercel. The token is read from the `VERCEL_API_TOKEN` environment variable, so it never appears in code or git. | If you add another provider (e.g. Cloudflare for DNS). |
| **`variables.tf`** | Declares all configurable inputs (`project_name`, `github_owner`, `custom_domain`, `n8n_chat_webhook_url`, etc.) with defaults baked in for this project. Acts as the "API" of the infra. | When adding a new configurable knob. |
| **`main.tf`** | The actual infrastructure declaration: 3 resources (project, env var, domain). This is where the meaningful logic lives. | When changing what gets provisioned (e.g. add a second env var, add a second domain). |
| **`outputs.tf`** | Defines what Terraform prints after `apply` — useful info like `project_id`, default Vercel URL, custom domain URL, and DNS setup instructions. | When you want to expose more info to the operator. |
| **`terraform.tfvars.example`** | A safe-to-commit template showing which values to provide. Copy it to `terraform.tfvars` to use it. | When adding a new variable that needs an example. |
| **`terraform.tfvars`** | **Your private values** — e.g. the actual n8n webhook URL. Gitignored. Each developer creates their own. | When changing input values (e.g. switching webhook URL). |
| **`terraform.tfstate`** | Terraform's record of what it actually created in Vercel (resource IDs, etc.). **Critical** — losing this means Terraform "forgets" what it manages. Gitignored because it may contain secrets. | Never edit by hand. Back it up somewhere safe. |
| **`.terraform.lock.hcl`** | Locks exact provider versions for reproducibility across machines. | Committed; regenerated by `terraform init -upgrade`. |

### First-Time Setup

```bash
# 1) Install Terraform (macOS via Homebrew)
brew install terraform
terraform -version   # should be >= 1.6.0

# 2) Get a Vercel API token: https://vercel.com/account/tokens
export VERCEL_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
# (Add this line to ~/.zshrc to make it permanent)

# 3) Configure your inputs
cd infra
cp terraform.tfvars.example terraform.tfvars
# Open terraform.tfvars and set n8n_chat_webhook_url

# 4) Initialize (downloads providers)
terraform init

# 5) Preview changes (always do this before apply)
terraform plan

# 6) Apply (creates the project on Vercel)
terraform apply

# 7) Set the DNS CNAME at your DNS provider:
#      chat   CNAME   cname.vercel-dns.com
#    (terraform output prints exact instructions)
```

### Common Tasks

```bash
cd infra

# See current outputs (project ID, URLs, etc.)
terraform output

# Inspect what Terraform thinks currently exists
terraform state list
terraform state show vercel_project.chat_ui

# Re-apply after changing a variable (e.g. new webhook URL in terraform.tfvars)
terraform apply

# Format / validate before committing
terraform fmt
terraform validate

# DESTRUCTIVE — removes the Vercel project + domain attachment
terraform destroy
```

### Changing the Custom Domain

Example: switching from `askingpdf.damarowen.blog` → `pdfaq.damarowen.blog`.

> Vercel does **not** allow editing a `vercel_project_domain` resource's `domain`
> field in place — Terraform must detach the old domain and attach the new one.
> The plan will show "1 to add, 1 to destroy". This is expected and safe.

**Step 1 — Update the variable** in `infra/terraform.tfvars`:
```hcl
custom_domain = "pdfaq.damarowen.blog"
```
(Or override on the CLI: `terraform apply -var="custom_domain=pdfaq.damarowen.blog"`)

**Step 2 — Add a DNS CNAME for the new subdomain** at your DNS provider
(before applying, so propagation has time to start):
```
pdfaq   CNAME   cname.vercel-dns.com
```

**Step 3 — Apply the change**:
```bash
cd infra
terraform plan    # confirms: + add pdfaq, - remove chat
terraform apply
```

**Step 4 — Verify**:
```bash
dig +short pdfaq.damarowen.blog
curl -sI https://pdfaq.damarowen.blog | head -3
terraform output custom_domain_url
```

**Step 5 — Clean up DNS** (after verifying the new domain works):
- Remove the old `chat` CNAME record at the DNS provider.

**Need both domains simultaneously (for migration)?**
Add a second resource block in `main.tf` instead of changing the variable:
```hcl
resource "vercel_project_domain" "custom_alias" {
  project_id = vercel_project.chat_ui.id
  domain     = "pdfaq.damarowen.blog"
}
```
Both `chat` and `pdfaq` will serve the same Vercel project until you decide to
remove one.

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

*Last updated: 2026-05-30*
