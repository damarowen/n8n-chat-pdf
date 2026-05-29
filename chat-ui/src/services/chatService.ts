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

/** Kirim pesan + file ke webhook n8n, kembalikan balasan lengkap dengan citations. */
export async function sendChatMessage(
  sessionId: string,
  chatInput: string,
  file: File | null
): Promise<ChatReply> {
  const formData = new FormData();
  formData.append("sessionId", sessionId);
  formData.append("chatInput", chatInput);
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

  return extractReply(payload);
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
