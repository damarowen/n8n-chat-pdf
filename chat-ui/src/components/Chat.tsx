"use client";

import { useEffect, useMemo, useState } from "react";

type ChatRole = "user" | "assistant" | "system";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

const endpoint =
  process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL ??
  "https://nein.damarowen.blog/webhook/chat-upload";

const genId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

function extractReplyText(payload: unknown): string {
  if (typeof payload === "string") return payload;

  if (Array.isArray(payload)) {
    const first = payload[0] as Record<string, unknown> | undefined;
    if (first && typeof first.output === "string") return first.output;
    if (first && typeof first.text === "string") return first.text;
  }

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.output === "string") return obj.output;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.response === "string") return obj.response;
  }

  return "No response text returned from webhook.";
}

function getHasUploaded(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem("n8n-chat-has-uploaded") === "true";
}

function setHasUploaded(value: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("n8n-chat-has-uploaded", value ? "true" : "false");
}

export default function Chat() {
  const [hasUploaded, setHasUploadedState] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      text: "Hi! Please upload a PDF first so I can answer your questions.",
    },
  ]);

  useEffect(() => {
    const uploaded = getHasUploaded();
    if (uploaded) {
      setHasUploadedState(true);
      setMessages((prev) =>
        prev[0]?.id === "assistant-welcome"
          ? [
              {
                ...prev[0],
                text: "File uploaded! Ask me anything about your PDF.",
              },
              ...prev.slice(1),
            ]
          : prev
      );
    }
  }, []);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const canSend = useMemo(() => {
    if (loading) return false;
    if (!hasUploaded) {
      // Before any upload: user MUST attach a file (text optional)
      return !!file;
    }
    // After upload: text-only messages allowed, file input is disabled/hidden
    return input.trim().length > 0;
  }, [input, file, loading, hasUploaded]);

  function getOrCreateSessionId(): string {
    if (typeof window === "undefined") return "";

    const key = "n8n-chat-session-id";
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;

    const created = genId();
    window.sessionStorage.setItem(key, created);
    return created;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSend) return;

    const userText = input.trim();

    setMessages((prev) => [
      ...prev,
      {
        id: genId(),
        role: "user",
        text:
          userText ||
          (file ? `Uploaded file: ${file.name}` : "(empty message)"),
      },
    ]);

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("sessionId", getOrCreateSessionId());
      formData.append("chatInput", userText);
      if (file) formData.append("data", file);

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const contentType = res.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

      const reply = extractReplyText(payload);

      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "assistant",
          text: reply,
        },
      ]);

      if (file) {
        setHasUploadedState(true);
        setHasUploaded(true);
      }

      setInput("");
      setFile(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown request error";
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "system",
          text: `Request failed: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold">n8n Chat + PDF Upload</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Session: <span className="font-mono">browser-managed</span>
        </p>
      </header>

      <section className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
              msg.role === "user"
                ? "ml-auto bg-blue-600 text-white"
                : msg.role === "assistant"
                  ? "mr-auto bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "mr-auto bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </section>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
          disabled={loading}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {!hasUploaded ? (
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600 dark:text-zinc-300">
                Upload PDF (required)
              </span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  if (hasUploaded) {
                    setFile(null);
                    return;
                  }
                  setFile(e.target.files?.[0] ?? null);
                }}
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

        {file && !hasUploaded && (
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            Selected: <span className="font-medium">{file.name}</span>
          </p>
        )}
      </form>
    </div>
  );
}
