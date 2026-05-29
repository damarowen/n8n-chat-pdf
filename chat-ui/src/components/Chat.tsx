"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  type ChatMessage,
  type Citation,
  ChatRequestError,
  clearMessages,
  describeError,
  genId,
  getHasUploaded,
  getOrCreateSessionId,
  loadMessages,
  saveMessages,
  sendChatMessage,
  setHasUploaded,
} from "../services/chatService";

/**
 * Snapshot request terakhir yang gagal — disimpan agar tombol "Try again"
 * di pesan error bisa mengulang request yang sama persis.
 */
type FailedRequest = {
  /** ID pesan error di list, untuk auto-remove saat retry sukses. */
  errorMsgId: string;
  /** Text input user yang gagal terkirim. */
  text: string;
  /** File PDF yang dibarengi text (null kalau hanya chat). */
  file: File | null;
};

/** Render konten assistant sebagai Markdown rapi (heading, list, tabel, kode). */
function AssistantMarkdown({ text }: { text: string }) {
  return (
    <div
      className="prose prose-sm prose-zinc max-w-none dark:prose-invert
        prose-p:my-1.5 prose-headings:my-2 prose-headings:font-semibold
        prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0
        prose-table:my-2 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1
        prose-code:rounded prose-code:bg-zinc-200 prose-code:px-1 prose-code:py-0.5
        prose-code:text-[0.85em] prose-code:font-normal
        dark:prose-code:bg-zinc-700
        prose-pre:my-2 prose-pre:bg-zinc-900 prose-pre:text-zinc-100"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

/** Welcome message default — selalu sama di server & client agar tidak hydration mismatch */
const defaultMessages: ChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    text: "Hi! Please upload a PDF first so I can answer your questions.",
  },
];

/** Tahapan loading saat user kirim pesan/upload PDF. */
type LoadingStage = "uploading" | "indexing" | "thinking" | null;

/** Pesan label per tahap loading. */
const STAGE_LABELS: Record<Exclude<LoadingStage, null>, string> = {
  uploading: "Uploading PDF…",
  indexing: "Indexing document…",
  thinking: "Thinking…",
};

/**
 * Hint tambahan saat indexing — upload pertama bisa lama (30s–beberapa
 * menit) karena embedding seluruh PDF. Tampil di bawah label utama.
 */
const STAGE_HINTS: Partial<Record<Exclude<LoadingStage, null>, string>> = {
  indexing: "Upload pertama bisa memakan waktu hingga 5 menit. Mohon jangan tutup tab.",
};

/**
 * Bubble assistant "thinking" — 3 titik bounce + label tahap.
 * Tampil di akhir list saat request sedang berjalan.
 */
function ThinkingBubble({ stage }: { stage: Exclude<LoadingStage, null> }) {
  const hint = STAGE_HINTS[stage];
  return (
    <div className="flex flex-col gap-1">
      <div
        className="mr-auto flex max-w-[90%] flex-col gap-1 rounded-xl bg-zinc-100 px-3 py-2.5 text-sm text-zinc-700 shadow-sm dark:bg-zinc-800 dark:text-zinc-200"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s] dark:bg-zinc-400" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s] dark:bg-zinc-400" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 dark:bg-zinc-400" />
          </span>
          <span className="font-medium tracking-tight">{STAGE_LABELS[stage]}</span>
        </div>
        {hint && (
          <p className="pl-[26px] text-xs text-zinc-500 dark:text-zinc-400">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader full-page — tampil sebelum riwayat selesai di-restore
 * dari sessionStorage. Meng-cover seluruh layout (header, chat area, form
 * input) sehingga UI terasa konsisten tanpa flicker antara welcome state
 * default dan riwayat asli.
 */
function PageSkeleton() {
  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:px-6"
      aria-hidden="true"
    >
      {/* Header skeleton */}
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-2">
          <div className="h-5 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-7 w-20 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      </div>

      {/* Chat area skeleton — bubble bervariasi */}
      <section className="mb-4 flex flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mr-auto w-1/2 animate-pulse rounded-xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          <div className="h-3 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="ml-auto w-2/3 animate-pulse rounded-xl bg-blue-100 px-3 py-2 dark:bg-blue-900/40">
          <div className="mb-1.5 h-3 w-full rounded bg-blue-200 dark:bg-blue-800/60" />
          <div className="h-3 w-1/2 rounded bg-blue-200 dark:bg-blue-800/60" />
        </div>
        <div className="mr-auto w-3/4 animate-pulse rounded-xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          <div className="mb-1.5 h-3 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="mb-1.5 h-3 w-5/6 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </section>

      {/* Form input skeleton — textarea + dropzone + button */}
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-24 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
          <div className="h-12 flex-1 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-200 sm:w-36 dark:bg-zinc-700" />
        </div>
      </div>
    </div>
  );
}

/** Render daftar sitasi sebagai kartu mungil di bawah jawaban AI. */
function CitationList({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="mr-auto mt-1 flex max-w-[90%] flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Sources
      </p>
      <ul className="flex flex-col gap-1.5">
        {citations.map((c, i) => (
          <li
            key={i}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
          >
            <span className="font-semibold">
              [{i + 1}] Lines {c.lines.from}–{c.lines.to}
            </span>
            {c.excerpt ? (
              <span className="ml-1 italic text-zinc-600 dark:text-zinc-400">
                “{c.excerpt}”
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

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

  /**
   * State: tahap loading. `null` = idle. Selain itu = label yang ditampilkan
   * di ThinkingBubble. Loading aktif = `loadingStage !== null`.
   */
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(null);
  const loading = loadingStage !== null;

  /**
   * State: apakah masih hydrating (server render & sebelum useEffect jalan).
   * Default `true` agar SSR dan initial client render menampilkan skeleton —
   * setelah riwayat dari sessionStorage selesai di-restore, di-set ke `false`
   * dan messages asli/state awal di-render.
   */
  const [isHydrating, setIsHydrating] = useState(true);

  /**
   * Snapshot request terakhir yang gagal. Saat ada nilai, pesan error
   * yang ber-ID `lastFailed.errorMsgId` menampilkan tombol "Try again".
   * Di-clear setelah retry sukses atau user mengirim pesan baru.
   */
  const [lastFailed, setLastFailed] = useState<FailedRequest | null>(null);

  /** Ref ke bottom marker di list pesan — dipakai untuk auto-scroll ke bawah. */
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /**
   * Auto-scroll ke bawah setiap kali jumlah pesan / state loading berubah.
   * Penting di mobile karena viewport sempit & user pakai 1 jempol.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatState.messages.length, loadingStage]);

  /** Restore status upload & riwayat pesan dari sessionStorage setelah mount di client */
  useEffect(() => {
    const uploaded = getHasUploaded();
    const stored = loadMessages();
    const restoredMessages = stored ?? (uploaded
      ? [{ id: "assistant-welcome", role: "assistant" as const, text: "File uploaded! Ask me anything about your PDF." }]
      : defaultMessages);
    // eslint-disable-next-line
    setChatState({ hasUploaded: uploaded, messages: restoredMessages });
    /** Hydration selesai — tampilkan konten asli */
    setIsHydrating(false);
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

  /**
   * Core sender — dipakai oleh `handleSend` (input baru) dan `handleRetry`
   * (kirim ulang request yang gagal). Tidak baca state input; semua data
   * datang dari argument supaya bisa dipanggil ulang setelah error.
   *
   * @param userText  Text yang akan dikirim ke webhook.
   * @param fileToSend  File PDF yang menyertai (atau `null`).
   * @param skipUserMessage  Saat retry, pesan user sudah ada di list dari
   *                         pengiriman pertama → jangan tambahkan lagi
   *                         supaya tidak duplicate.
   * @param retryOfErrorId  Saat retry, ID pesan error yang akan dihapus
   *                        kalau request kali ini sukses (atau diganti
   *                        kalau gagal lagi).
   */
  async function performSend(
    userText: string,
    fileToSend: File | null,
    skipUserMessage = false,
    retryOfErrorId?: string
  ) {
    /** Tambahkan pesan user baru kalau bukan retry. */
    if (!skipUserMessage) {
      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        text: userText || (fileToSend ? `Uploaded file: ${fileToSend.name}` : "(empty message)"),
      };
      setMessages((prev) => {
        const next = [...prev, userMsg];
        saveMessages(next);
        return next;
      });
    }

    /**
     * Tahap awal: kalau ada file → "Uploading PDF…", lalu setelah ~700ms
     * lanjut ke "Indexing…" agar user merasa progress jalan; kalau tidak ada
     * file → langsung "Thinking…".
     */
    setLoadingStage(fileToSend ? "uploading" : "thinking");
    let indexingTimer: ReturnType<typeof setTimeout> | null = null;
    let thinkingTimer: ReturnType<typeof setTimeout> | null = null;
    if (fileToSend) {
      indexingTimer = setTimeout(() => setLoadingStage("indexing"), 700);
      thinkingTimer = setTimeout(() => setLoadingStage("thinking"), 2200);
    }

    try {
      const sessionId = getOrCreateSessionId();
      const reply = await sendChatMessage(sessionId, userText, fileToSend);

      /** Tambahkan balasan assistant ke daftar & simpan ke sessionStorage */
      const assistantMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        text: reply.output,
        citations: reply.citations,
      };
      setMessages((prev) => {
        /** Saat retry sukses, hapus pesan error lama supaya bersih. */
        const cleaned = retryOfErrorId
          ? prev.filter((m) => m.id !== retryOfErrorId)
          : prev;
        const next = [...cleaned, assistantMsg];
        saveMessages(next);
        return next;
      });

      /** Jika ada file yang dikirim, tandai sebagai sudah upload */
      if (fileToSend) {
        setHasUploadedState(true);
        setHasUploaded(true);
      }
      /** Sukses → clear snapshot retry. */
      setLastFailed(null);
    } catch (error) {
      /**
       * Klasifikasi error & tampilkan pesan ramah. Simpan snapshot agar
       * tombol "Try again" bisa kirim ulang.
       */
      const friendly = error instanceof ChatRequestError
        ? describeError(error)
        : error instanceof Error
          ? error.message
          : "Unknown request error";
      const errorMsgId = genId();
      const errorMsg: ChatMessage = {
        id: errorMsgId,
        role: "system",
        text: friendly,
      };
      setMessages((prev) => {
        /** Saat retry gagal lagi, ganti pesan error lama dengan yang baru. */
        const cleaned = retryOfErrorId
          ? prev.filter((m) => m.id !== retryOfErrorId)
          : prev;
        const next = [...cleaned, errorMsg];
        saveMessages(next);
        return next;
      });
      /**
       * Simpan request gagal supaya bisa di-retry. Kalau retry, gunakan
       * userMsgId yang sama (pesan user tidak digandakan).
       */
      setLastFailed({ errorMsgId, text: userText, file: fileToSend });
    } finally {
      /** Bersihkan timer + matikan bubble loading */
      if (indexingTimer) clearTimeout(indexingTimer);
      if (thinkingTimer) clearTimeout(thinkingTimer);
      setLoadingStage(null);
    }
  }

  /** Kirim pesan baru dari input box. */
  async function handleSend() {
    if (!canSend) return;
    const userText = input.trim();
    const fileToSend = file;
    /** Reset input segera agar kolom chat langsung kosong */
    setInput("");
    setFile(null);
    /** Kirim pesan baru → clear snapshot retry sebelumnya. */
    setLastFailed(null);
    await performSend(userText, fileToSend);
  }

  /** Kirim ulang request terakhir yang gagal. */
  async function handleRetry() {
    if (!lastFailed || loading) return;
    const snapshot = lastFailed;
    /** Hindari double-click — lock snapshot dan biarkan performSend handle UI. */
    setLastFailed(null);
    /**
     * `skipUserMessage = true` karena pesan user dari pengiriman pertama
     * sudah ada di list — kalau ditambahkan lagi akan jadi duplicate.
     */
    await performSend(snapshot.text, snapshot.file, true, snapshot.errorMsgId);
  }

  /** Handle form submit — kirim pesan ke webhook n8n */
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await handleSend();
  }

  /**
   * Render UI chat — header, daftar pesan, form input.
   * Selama hydration (SSR + sebelum useEffect jalan): tampilkan PageSkeleton
   * untuk SELURUH halaman sehingga tidak ada flicker konten parsial.
   */
  if (isHydrating) {
    return <PageSkeleton />;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
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
          className="min-h-11 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 sm:min-h-0 sm:py-1.5 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Clear Chat
        </button>
      </header>

      <section className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {messages.map((msg) => {
          /**
           * Tampilkan tombol "Try again" hanya pada pesan error yang
           * id-nya cocok dengan snapshot request terakhir & tidak sedang
           * loading.
           */
          const isRetryable =
            msg.role === "system" &&
            lastFailed?.errorMsgId === msg.id &&
            !loading;
          return (
            <div key={msg.id} className="flex flex-col gap-1">
              <div
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "ml-auto whitespace-pre-wrap bg-blue-600 text-white"
                    : msg.role === "assistant"
                      ? "mr-auto bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "mr-auto whitespace-pre-wrap bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                }`}
              >
                {msg.role === "assistant" ? (
                  <AssistantMarkdown text={msg.text} />
                ) : (
                  msg.text
                )}
              </div>
              {msg.role === "assistant" && msg.citations && msg.citations.length > 0 ? (
                <CitationList citations={msg.citations} />
              ) : null}
              {isRetryable ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/40"
                  aria-label="Coba kirim ulang pesan terakhir"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Coba lagi
                </button>
              ) : null}
            </div>
          );
        })}

        {/* Bubble "thinking" muncul di bawah daftar pesan saat request sedang jalan */}
        {loadingStage ? <ThinkingBubble stage={loadingStage} /> : null}

        {/* Marker untuk auto-scroll — selalu di paling bawah list */}
        <div ref={messagesEndRef} aria-hidden="true" />
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
          /**
           * `text-base` di mobile (≥16px) mencegah iOS Safari auto-zoom
           * saat input focus. Di ≥sm pakai `text-sm` agar tetap kompak.
           */
          className="min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none ring-blue-500 focus:ring-2 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950"
          disabled={loading}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
          {!hasUploaded ? (
            /**
             * Dropzone-style upload: native input disembunyikan, label jadi
             * area klik + drag-and-drop yang besar & berwarna. Saat file
             * sudah dipilih, dropzone berubah jadi file chip dengan tombol
             * remove.
             */
            file ? (
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/40">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                    <line x1="9" y1="11" x2="15" y2="11" />
                  </svg>
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-emerald-900 dark:text-emerald-100">
                    {file.name}
                  </span>
                  <span className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                    {(file.size / 1024).toFixed(1)} KB · Ready to upload
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={loading}
                  aria-label="Remove file"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-200/60 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.dataset.dragging = "true";
                }}
                onDragLeave={(e) => {
                  delete e.currentTarget.dataset.dragging;
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  delete e.currentTarget.dataset.dragging;
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped && dropped.type === "application/pdf") {
                    setFile(dropped);
                  }
                }}
                className="group flex flex-1 cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/60 px-3 py-2.5 text-sm transition hover:border-blue-400 hover:bg-blue-50/60 data-[dragging=true]:border-blue-500 data-[dragging=true]:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-950/40 dark:hover:border-blue-500 dark:hover:bg-blue-950/30 dark:data-[dragging=true]:bg-blue-950/40"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition group-hover:scale-110 dark:bg-blue-900/40 dark:text-blue-300"
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-medium text-zinc-800 dark:text-zinc-100">
                    Upload PDF
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Click or drag &amp; drop · PDF only
                  </span>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={loading}
                  className="sr-only"
                />
              </label>
            )
          ) : (
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="font-medium">
                PDF uploaded · ask anything about it
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingStage ? (
              <>
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
                <span>{STAGE_LABELS[loadingStage]}</span>
              </>
            ) : (
              <span>{hasUploaded ? "Ask" : "Upload & Send"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
