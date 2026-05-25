"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ChatMessage,
  clearMessages,
  genId,
  getHasUploaded,
  getOrCreateSessionId,
  loadMessages,
  saveMessages,
  sendChatMessage,
  setHasUploaded,
} from "../services/chatService";

/** Welcome message default — selalu sama di server & client agar tidak hydration mismatch */
const defaultMessages: ChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    text: "Hi! Please upload a PDF first so I can answer your questions.",
  },
];

/** State gabungan chat — agar restore dari sessionStorage hanya butuh 1 setState */
type ChatState = {
  hasUploaded: boolean;
  messages: ChatMessage[];
};

const initialState: ChatState = {
  hasUploaded: false,
  messages: defaultMessages,
};

export default function Chat() {
  /** State gabungan: upload status + pesan chat */
  const [chatState, setChatState] = useState<ChatState>(initialState);

  /** State: teks yang diketik user */
  const [input, setInput] = useState("");

  /** State: file PDF yang dipilih */
  const [file, setFile] = useState<File | null>(null);

  /** State: apakah request sedang berjalan */
  const [loading, setLoading] = useState(false);

  /** Restore status upload & riwayat pesan dari sessionStorage setelah mount di client */
  useEffect(() => {
    const uploaded = getHasUploaded();
    const stored = loadMessages();
    const restoredMessages = stored ?? (uploaded
      ? [{ id: "assistant-welcome", role: "assistant" as const, text: "File uploaded! Ask me anything about your PDF." }]
      : defaultMessages);
    // eslint-disable-next-line
    setChatState({ hasUploaded: uploaded, messages: restoredMessages });
  }, []);

  /** Helper: update pesan saja */
  function setMessages(updater: (prev: ChatMessage[]) => ChatMessage[]) {
    setChatState((prev) => ({ ...prev, messages: updater(prev.messages) }));
  }

  /** Helper: update status upload saja */
  function setHasUploadedState(value: boolean) {
    setChatState((prev) => ({ ...prev, hasUploaded: value }));
  }

  const { hasUploaded, messages } = chatState;

  /** Validasi tombol send — wajib ada text, sebelum upload wajib ada file juga */
  const canSend = useMemo(() => {
    if (loading) return false;
    const hasText = input.trim().length > 0;
    return hasUploaded ? hasText : hasText && !!file;
  }, [input, file, loading, hasUploaded]);

  /** Kirim pesan ke webhook n8n */
  async function handleSend() {
    if (!canSend) return;

    const userText = input.trim();

    /** Tambahkan pesan user ke daftar & simpan ke sessionStorage */
    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      text: userText || (file ? `Uploaded file: ${file.name}` : "(empty message)"),
    };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      saveMessages(next);
      return next;
    });

    /** Reset input segera agar kolom chat langsung kosong */
    setInput("");
    setFile(null);

    setLoading(true);

    try {
      const sessionId = getOrCreateSessionId();
      const reply = await sendChatMessage(sessionId, userText, file);

      /** Tambahkan balasan assistant ke daftar & simpan ke sessionStorage */
      const assistantMsg: ChatMessage = { id: genId(), role: "assistant", text: reply };
      setMessages((prev) => {
        const next = [...prev, assistantMsg];
        saveMessages(next);
        return next;
      });

      /** Jika ada file yang dikirim, tandai sebagai sudah upload */
      if (file) {
        setHasUploadedState(true);
        setHasUploaded(true);
      }
    } catch (error) {
      /** Tampilkan pesan error jika request gagal & simpan ke sessionStorage */
      const message = error instanceof Error ? error.message : "Unknown request error";
      const errorMsg: ChatMessage = { id: genId(), role: "system", text: `Request failed: ${message}` };
      setMessages((prev) => {
        const next = [...prev, errorMsg];
        saveMessages(next);
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  /** Handle form submit — kirim pesan ke webhook n8n */
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await handleSend();
  }

  /** Render UI chat — header, daftar pesan, form input */
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-4 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h1 className="text-xl font-semibold">n8n Chat + PDF Upload</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Session: <span className="font-mono">browser-managed</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearMessages();
            setChatState(initialState);
            setHasUploaded(false);
            setInput("");
            setFile(null);
          }}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Clear Chat
        </button>
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
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
