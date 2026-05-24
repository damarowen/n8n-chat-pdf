# Chat-UI Upload-First Enforcement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify `Chat.tsx` so users cannot send text-only messages before uploading a PDF, and cannot upload more than one PDF per browser session. Close tab → new session → upload required again.

**Architecture:** Single-webhook architecture preserved (`/webhook/chat-upload`). All state enforcement lives in the frontend via React state + `sessionStorage`. After upload succeeds, a `hasUploaded` flag is persisted. UI adapts (hide file input, change welcome message, adjust send-button logic).

**Tech Stack:** React 19, Next.js 15, Tailwind CSS, browser `sessionStorage`.

---

## File Map

| File | Responsibility |
|------|----------------|
| `chat-ui/src/components/Chat.tsx` | Main chat UI component. Modified to add upload-first and one-upload-only enforcement logic. |

---

## Task 1: Add `hasUploaded` State with `sessionStorage` Persistence

**Files:**
- Modify: `chat-ui/src/components/Chat.tsx`

- [ ] **Step 1: Add helper functions to read/write `hasUploaded` flag**

```typescript
function getHasUploaded(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem("n8n-chat-has-uploaded") === "true";
}

function setHasUploaded(value: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("n8n-chat-has-uploaded", value ? "true" : "false");
}
```

- [ ] **Step 2: Add `hasUploaded` state initialized from `sessionStorage`**

Add inside `Chat()` component, alongside existing `useState` calls:

```typescript
const [hasUploaded, setHasUploadedState] = useState<boolean>(getHasUploaded());
```

---

## Task 2: Update Send-Button Logic (`canSend`)

**Files:**
- Modify: `chat-ui/src/components/Chat.tsx`

- [ ] **Step 3: Replace `canSend` `useMemo` to enforce upload-first rule**

```typescript
const canSend = useMemo(() => {
  if (loading) return false;
  if (!hasUploaded) {
    // Before any upload: user MUST attach a file (text optional)
    return !!file;
  }
  // After upload: text-only messages allowed, file input is disabled/hidden
  return input.trim().length > 0;
}, [input, file, loading, hasUploaded]);
```

---

## Task 3: Set `hasUploaded` Flag on Successful Upload

**Files:**
- Modify: `chat-ui/src/components/Chat.tsx`

- [ ] **Step 4: After successful webhook response, set the flag**

Inside `onSubmit`, in the `try` block, after receiving the reply and **before** clearing state:

```typescript
if (file) {
  setHasUploadedState(true);
  setHasUploaded(true);
}
```

Place this right after:

```typescript
setMessages((prev) => [
  ...prev,
  {
    id: genId(),
    role: "assistant",
    text: reply,
  },
]);
```

---

## Task 4: Adapt UI for Upload-First and One-Upload-Only

**Files:**
- Modify: `chat-ui/src/components/Chat.tsx`

- [ ] **Step 5: Change welcome message based on `hasUploaded`**

Replace the initial `messages` array with a computed default:

```typescript
const [messages, setMessages] = useState<ChatMessage[]>([
  {
    id: "assistant-welcome",
    role: "assistant",
    text: hasUploaded
      ? "File uploaded! Ask me anything about your PDF."
      : "Hi! Please upload a PDF first so I can answer your questions.",
  },
]);
```

- [ ] **Step 6: Hide file input after upload and show status text**

In the form JSX, replace the existing file input block:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  {!hasUploaded ? (
    <label className="text-sm">
      <span className="mb-1 block text-zinc-600 dark:text-zinc-300">
        Upload PDF (required)
      </span>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        disabled={loading}
        className="block text-sm"
      />
    </label>
  ) : (
    <p className="text-sm text-emerald-600 dark:text-emerald-400">
      PDF uploaded. You can now ask questions.
    </p>
  )}

  <button
    type="submit"
    disabled={!canSend}
    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
  >
    {loading ? "Sending..." : hasUploaded ? "Ask" : "Upload & Send"}
  </button>
</div>
```

- [ ] **Step 7: Remove selected-file hint when `hasUploaded` is true**

Replace the existing file hint block:

```tsx
{file && !hasUploaded && (
  <p className="text-xs text-zinc-600 dark:text-zinc-300">
    Selected: <span className="font-medium">{file.name}</span>
  </p>
)}
```

- [ ] **Step 8: Update user message display for upload-only submissions**

In `onSubmit`, when displaying the user's own message, if there's no text and there is a file, show a friendlier label:

```typescript
text:
  userText ||
  (file ? `Uploaded file: ${file.name}` : "(empty message)"),
```

This line already exists; verify it is present and unchanged.

---

## Task 5: Prevent Re-Upload After Success

**Files:**
- Modify: `chat-ui/src/components/Chat.tsx`

- [ ] **Step 9: Guard against second file attachment**

In the `onChange` handler for the file input, add a guard:

```typescript
onChange={(e) => {
  if (hasUploaded) {
    // Should never fire because input is hidden, but defensive
    setFile(null);
    return;
  }
  setFile(e.target.files?.[0] ?? null);
}}
```

Because the input is already hidden via `!hasUploaded` conditional rendering, this is purely defensive.

---

## Task 6: Manual Verification

**Files:**
- Modify: none (verification only)

- [ ] **Step 10: Run the chat UI and verify the three states**

1. **Fresh tab (no upload yet):**
   - Welcome message says "Please upload a PDF first..."
   - Textarea is enabled but **Send** button is disabled until a PDF is selected.
   - Button label reads "Upload & Send".

2. **Upload a PDF:**
   - Button becomes enabled.
   - Click **Upload & Send**.
   - After success, welcome area shows "File uploaded! Ask me anything about your PDF."
   - File input disappears, replaced by green status text.
   - Button label changes to "Ask".
   - `sessionStorage` contains `n8n-chat-has-uploaded = true`.

3. **Ask text-only questions:**
   - Type text, click **Ask**.
   - Request body contains only `sessionId` and `chatInput` (no `data` file).
   - Workflow routes through `IfFileUploaded` → false branch → `PrepareForAI` → `AI Agent`.

4. **Close tab, reopen:**
   - `sessionStorage` cleared automatically.
   - App returns to state 1 (upload required again).

---

## Spec Coverage Checklist

| Requirement | Implementing Task |
|-------------|-------------------|
| User cannot chat before uploading PDF | Task 2 (`canSend`), Task 4 (welcome message) |
| After uploading, user cannot upload again in same session | Task 4 (hide input), Task 5 (defensive guard) |
| After uploading, user CAN ask text-only questions | Task 2 (`canSend` when `hasUploaded`) |
| Close browser/tab → new session → previous PDF inaccessible | `sessionStorage` used throughout; cleared on tab close |
| Single webhook preserved | No workflow changes required |

## Placeholder Scan

- No "TBD", "TODO", or "implement later" found.
- Every step contains exact code blocks or exact commands.
- No vague directives like "add validation" without code.
- Task 6 includes exact verification scenarios.

## Type / Signature Consistency

- `hasUploaded`: `boolean` everywhere.
- `getHasUploaded()`: returns `boolean`.
- `setHasUploaded(value: boolean)`: accepts `boolean`.
- `sessionStorage` keys: `n8n-chat-has-uploaded` (single canonical key).

---

## Execution Handoff

**Plan complete.**

**Execution options:**

1. **Inline Execution** — I execute all tasks in this session using `superpowers:executing-plans`, with checkpoints for review.
2. **Subagent-Driven** — I dispatch a fresh subagent per task, review between tasks.

Since this is a focused, single-file change with clear steps, **Inline Execution** is recommended.

**Shall I proceed with inline execution?**
