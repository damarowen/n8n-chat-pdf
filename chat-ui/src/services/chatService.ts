/** Role pesan dalam chat */
export type ChatRole = "user" | "assistant" | "system";

/** Satu sitasi yang dirujuk AI Agent (dari blok `---CITATIONS---` di workflow). */
export type Citation = {
  /** Rentang baris pada dokumen sumber. */
  lines: { from: number; to: number };
  /** Kutipan kunci satu kalimat dari chunk. */
  excerpt: string;
};

/** Struktur satu pesan chat */
export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  /** Daftar sitasi yang menyertai jawaban AI (kosong untuk pesan user/system). */
  citations?: Citation[];
};

/** Bentuk balasan dari webhook n8n setelah parsing FormatCitation node. */
export type ChatReply = {
  output: string;
  citations: Citation[];
  citationText: string;
  hasCitations: boolean;
};

/** URL webhook n8n — dari env atau fallback */
export const endpoint =
  process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL ??
  "https://nein.damarowen.blog/webhook/chat-upload";

/** Generate ID unik pakai crypto.randomUUID atau fallback timestamp+random */
export function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

/** Ambil ChatReply (output + citations) dari berbagai format payload webhook. */
export function extractReply(payload: unknown): ChatReply {
  /** Default kosong — dipakai sebagai fallback bila tidak ada field yang cocok. */
  const empty: ChatReply = {
    output: "No response text returned from webhook.",
    citations: [],
    citationText: "",
    hasCitations: false,
  };

  /** Normalisasi citations: terima array of Citation, abaikan kalau format aneh. */
  const normalizeCitations = (raw: unknown): Citation[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const obj = item as Record<string, unknown>;
        const lines = obj.lines as Record<string, unknown> | undefined;
        const from = typeof lines?.from === "number" ? lines.from : NaN;
        const to = typeof lines?.to === "number" ? lines.to : NaN;
        const excerpt = typeof obj.excerpt === "string" ? obj.excerpt : "";
        if (Number.isNaN(from) || Number.isNaN(to)) return null;
        return { lines: { from, to }, excerpt } as Citation;
      })
      .filter((c): c is Citation => c !== null);
  };

  /** Bentuk objek tunggal hasil parsing → ChatReply. */
  const buildReply = (obj: Record<string, unknown>): ChatReply => {
    const output =
      typeof obj.output === "string"
        ? obj.output
        : typeof obj.text === "string"
          ? obj.text
          : typeof obj.message === "string"
            ? obj.message
            : typeof obj.response === "string"
              ? obj.response
              : empty.output;
    const citations = normalizeCitations(obj.citations);
    const citationText =
      typeof obj.citationText === "string" ? obj.citationText : "";
    const hasCitations =
      typeof obj.hasCitations === "boolean"
        ? obj.hasCitations
        : citations.length > 0;
    return { output, citations, citationText, hasCitations };
  };

  if (typeof payload === "string") return { ...empty, output: payload };

  if (Array.isArray(payload)) {
    const first = payload[0] as Record<string, unknown> | undefined;
    if (first) return buildReply(first);
    return empty;
  }

  if (payload && typeof payload === "object") {
    return buildReply(payload as Record<string, unknown>);
  }

  return empty;
}

/** Cek apakah user sudah pernah upload PDF (dari sessionStorage) */
export function getHasUploaded(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem("n8n-chat-has-uploaded") === "true";
}

/** Simpan status upload PDF ke sessionStorage */
export function setHasUploaded(value: boolean): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("n8n-chat-has-uploaded", value ? "true" : "false");
}

/** Ambil session ID yang ada, atau buat baru dan simpan ke sessionStorage */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  const key = "n8n-chat-session-id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const created = genId();
  window.sessionStorage.setItem(key, created);
  return created;
}

/**
 * Jenis error yang bisa terjadi saat memanggil webhook chat.
 * Dipakai UI untuk menampilkan pesan + saran yang sesuai konteks.
 */
export type ChatErrorKind = "timeout" | "network" | "http" | "unknown";

/**
 * Error khusus untuk request chat — membawa `kind` agar UI bisa membedakan
 * timeout, masalah jaringan/CORS, HTTP error (4xx/5xx), atau error lain.
 */
export class ChatRequestError extends Error {
  readonly kind: ChatErrorKind;
  readonly status?: number;
  constructor(kind: ChatErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ChatRequestError";
    this.kind = kind;
    this.status = status;
  }
}

/**
 * Timeout default untuk request chat (ms). Sengaja besar (5 menit) untuk
 * mengakomodasi upload PDF besar + embedding banyak chunk yang bisa lambat
 * pada request pertama. Kalau Cloudflare/proxy memotong duluan, error akan
 * muncul sebagai `network` (TypeError) — bukan `timeout` — tapi UI tetap
 * memberi tombol "Coba lagi".
 */
export const DEFAULT_TIMEOUT_MS = 300_000;

/**
 * Pesan user-friendly per jenis error — dipakai UI tanpa harus mapping ulang.
 */
export function describeError(err: ChatRequestError): string {
  switch (err.kind) {
    case "timeout":
      return "Server butuh waktu terlalu lama untuk merespons (>5 menit). Coba kirim lagi atau pakai file PDF yang lebih kecil.";
    case "network":
      return "Tidak bisa terhubung ke server. Periksa koneksi internet kamu, lalu coba lagi.";
    case "http":
      return `Server mengembalikan error${err.status ? ` (HTTP ${err.status})` : ""}. Coba lagi sebentar.`;
    default:
      return err.message || "Terjadi kesalahan tak terduga. Coba lagi.";
  }
}

/**
 * Kirim pesan + file ke webhook n8n, kembalikan balasan lengkap dengan citations.
 *
 * Pakai `AbortController` untuk timeout client-side. Kalau gagal, lempar
 * `ChatRequestError` dengan `kind` yang sudah diklasifikasi sehingga UI bisa
 * menampilkan pesan & tombol retry yang sesuai.
 */
export async function sendChatMessage(
  sessionId: string,
  chatInput: string,
  file: File | null,
  options: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<ChatReply> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const formData = new FormData();
  formData.append("sessionId", sessionId);
  formData.append("chatInput", chatInput);
  if (file) formData.append("data", file);

  /**
   * Gabungkan timeout internal dengan signal eksternal (kalau ada).
   * Catatan: AbortSignal.any tersedia di browser modern; fallback manual
   * di-handle dengan menambahkan listener.
   */
  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(() => timeoutCtrl.abort(), timeoutMs);
  const onExternalAbort = () => timeoutCtrl.abort();
  if (options.signal) {
    if (options.signal.aborted) timeoutCtrl.abort();
    else options.signal.addEventListener("abort", onExternalAbort);
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
      signal: timeoutCtrl.signal,
    });

    if (!res.ok) {
      throw new ChatRequestError(
        "http",
        `HTTP ${res.status}: ${res.statusText}`,
        res.status
      );
    }

    const contentType = res.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    return extractReply(payload);
  } catch (err) {
    /** Sudah ChatRequestError → re-throw apa adanya. */
    if (err instanceof ChatRequestError) throw err;

    /** Timeout (dari AbortController internal) atau abort dari caller. */
    if (err instanceof DOMException && err.name === "AbortError") {
      const isCallerAbort = options.signal?.aborted;
      throw new ChatRequestError(
        "timeout",
        isCallerAbort ? "Request dibatalkan." : `Request melebihi ${Math.round(timeoutMs / 1000)} detik.`
      );
    }

    /**
     * `TypeError: Failed to fetch` — browser tidak bisa establish koneksi.
     * Penyebab umum: jaringan putus, DNS gagal, CORS preflight gagal, atau
     * server menutup koneksi (mis. Cloudflare 524 setelah 100s).
     */
    if (err instanceof TypeError) {
      throw new ChatRequestError(
        "network",
        "Gagal terhubung ke server (mungkin masalah jaringan, CORS, atau koneksi diputus oleh proxy)."
      );
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    throw new ChatRequestError("unknown", message);
  } finally {
    clearTimeout(timeoutId);
    if (options.signal) options.signal.removeEventListener("abort", onExternalAbort);
  }
}

/** Simpan riwayat pesan ke sessionStorage (hilang saat tab ditutup) */
export function saveMessages(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("n8n-chat-messages", JSON.stringify(messages));
}

/** Muat riwayat pesan dari sessionStorage, kembalikan null jika belum ada */
export function loadMessages(): ChatMessage[] | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("n8n-chat-messages");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/** Hapus riwayat pesan dari sessionStorage */
export function clearMessages(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("n8n-chat-messages");
}
