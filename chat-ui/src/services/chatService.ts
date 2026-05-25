/** Role pesan dalam chat */
export type ChatRole = "user" | "assistant" | "system";

/** Struktur satu pesan chat */
export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
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

/** Ambil teks jawaban dari berbagai format payload yang mungkin dikembalikan webhook */
export function extractReplyText(payload: unknown): string {
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

/** Kirim pesan + file ke webhook n8n, kembalikan teks jawaban */
export async function sendChatMessage(
  sessionId: string,
  chatInput: string,
  file: File | null
): Promise<string> {
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

  return extractReplyText(payload);
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
