# SSE Streaming Implementation Plan

> **Goal:** Real-time word-by-word AI response streaming seperti ChatGPT, sekaligus bypass Cloudflare 100s timeout.

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## 🔍 Hasil Investigasi

n8n **sudah mendukung SSE streaming native** di Webhook node. Tidak perlu custom code node atau fake-streaming.

Dari dokumentasi n8n resmi:
- **Webhook node** → `Respond > Streaming response`: *"Enables real-time data streaming back to the user as the workflow processes. Requires nodes with streaming support in the workflow (for example, the AI agent node)."*
- **Respond to Webhook node** → `Enable Streaming` option: *"When enabled, sends the data back to the user using streaming. Requires a trigger configured with the Response mode Streaming."*
- **AI Agent node v1.6** ✅ sudah support streaming.

## ⚠️ Constraint Kritis

**Problem dengan arsitektur saat ini:** Workflow kita punya `FormatCitation` code node yang berjalan *setelah* AI Agent selesai, untuk meng-extract citations. Kalau kita pakai `responseMode: 'streaming'`, n8n men-stream output AI Agent **secara langsung** — artinya:

1. Citations (`{ output, citations, citationText, hasCitations }`) tidak bisa dikirim bersamaan dengan streaming tokens
2. Streaming response hanya berisi token text mentah, bukan JSON terstruktur
3. `FormatCitation` dan `ReturnResponse` nodes tidak dieksekusi dalam streaming path

**Solusi yang dipilih:** Hybrid approach
- Stream: token text AI → UI menampilkan real-time
- After stream: citations dikirim sebagai SSE event terpisah di akhir stream (`event: citations`)
- Fallback: kalau streaming gagal, UI fallback ke `sendChatMessage` synchronous seperti sekarang

## Architecture: Sebelum vs Sesudah

```
SEBELUM:
User → POST /webhook/chat-upload → [n8n workflow runs] → Response JSON { output, citations }
         ↑ Cloudflare 100s cut ↑

SESUDAH:
User → POST /webhook/chat-upload → n8n immediately starts SSE stream
         ↓ SSE event-stream open (no timeout!) ↓
         data: {"token": "Berdasarkan"}
         data: {"token": " dokumen"}
         data: {"token": " yang"}
         ...
         event: citations
         data: {"citations": [...], "hasCitations": true}
         data: [DONE]
```

## Perubahan yang Diperlukan

### 1. n8n Workflow (`workflow.ts`) — 1 baris

```typescript
// SEBELUM:
responseMode: 'lastNode',

// SESUDAH:
responseMode: 'streaming',
```

**Catatan penting:** Setelah perubahan ini:
- AI Agent tokens akan di-stream otomatis oleh n8n
- `FormatCitation` dan `ReturnResponse` nodes masih berjalan, tapi hasilnya **tidak** dikirim ke client via streaming
- Citations harus dihandle secara terpisah — lihat bagian "Citations Strategy" di bawah

### 2. Frontend `chatService.ts` — tambah fungsi baru

Tambah `streamChatMessage()` yang menerima `onChunk` callback:

```typescript
export async function streamChatMessage(
  sessionId: string,
  chatInput: string,
  file: File | null,
  callbacks: {
    onChunk: (token: string) => void;
    onDone: (citations: Citation[]) => void;
    onError: (err: ChatRequestError) => void;
  },
  options: { signal?: AbortSignal } = {}
): Promise<void>
```

Parsing SSE stream:
- `data: {"token": "..."}` → panggil `onChunk(token)`
- `event: citations\ndata: {...}` → panggil `onDone(citations)`
- `data: [DONE]` → selesai
- Error / network failure → panggil `onError(err)` lalu fallback ke `sendChatMessage`

### 3. Frontend `Chat.tsx` — update `performSend`

- Ganti `await sendChatMessage(...)` dengan `await streamChatMessage(...)`
- Saat `onChunk`: update pesan assistant yang sudah ada (progressive render)
- Saat `onDone`: attach citations ke pesan tersebut
- `ThinkingBubble` tetap muncul sampai chunk pertama tiba, lalu auto-hilang

## Citations Strategy

**Skenario A (Sederhana — Implementasi Awal):**
- Citations **diabaikan sementara** saat streaming mode
- Hanya streaming text tanpa citations
- `onDone` dipanggil dengan `[]` (empty citations)

**Skenario B (Full — Fase 2):**
- Tambah "Respond to Webhook" node dengan `Enable Streaming` + `Respond With: JSON`
- Node ini berjalan setelah `FormatCitation`, mengirim citations sebagai SSE event terakhir
- Frontend handle `event: citations` dan render citation cards setelah stream selesai

**Keputusan untuk implementasi ini:** Mulai dengan **Skenario A** (citations kosong), validate streaming bekerja, lalu upgrade ke Skenario B.

## Fallback Strategy

Kalau `responseMode: 'streaming'` tidak bekerja di n8n instance kita (mungkin versi terlalu lama):
1. Frontend detect kalau response bukan `text/event-stream` (cek `Content-Type`)
2. Auto-fallback ke `sendChatMessage` synchronous seperti sekarang
3. `loadingStage` tetap `"thinking"` sampai response penuh tiba

## Checklist Implementasi

### Phase 1: Workflow Change
- [ ] Ubah `workflow.ts` line 394: `responseMode: 'lastNode'` → `responseMode: 'streaming'`
- [ ] Push workflow ke n8n via n8nac CLI (atau manual import)
- [ ] Test manual: `curl -N -X POST https://nein.damarowen.blog/webhook/chat-upload ...` — verifikasi `Content-Type: text/event-stream`

### Phase 2: Frontend Service
- [ ] Tambah `streamChatMessage()` di `chatService.ts` dengan SSE reader
- [ ] Handle `data: [DONE]`, `data: {"token": "..."}`, `event: citations`
- [ ] Export fungsi baru dari `chatService.ts`
- [ ] Verifikasi TypeScript compile clean

### Phase 3: Chat UI
- [ ] Update `performSend()` di `Chat.tsx` untuk pakai `streamChatMessage`
- [ ] Implement progressive render: pesan assistant muncul kosong, terisi chunk per chunk
- [ ] ThinkingBubble hilang saat chunk pertama tiba
- [ ] Citations card muncul setelah `onDone` dipanggil
- [ ] Fallback ke `sendChatMessage` kalau `streamChatMessage` error/network

### Phase 4: Validate & Deploy
- [ ] Test local: `npm run dev` di `chat-ui/`
- [ ] Test happy path: kirim pesan, lihat streaming
- [ ] Test error: matikan n8n sementara, pastikan fallback jalan
- [ ] Commit + push ke `main` → Vercel auto-deploy
- [ ] Verify di production: `askingpdf.damarowen.blog`

## Expected UX Result

```
User kirim: "Apa isi bab 3?"
↓ ThinkingBubble muncul (dots)
↓ 300ms kemudian — ThinkingBubble hilang, bubble AI kosong muncul
↓ Kata demi kata mengisi bubble: "Bab 3 membahas..."
↓ 2-3 detik kemudian — jawaban penuh tampil
↓ Citation cards muncul di bawah (Fase 2)
```

## Rollback Plan

Kalau ada masalah serius:
1. Revert `responseMode` ke `'lastNode'` di `workflow.ts`
2. Revert `performSend` di `Chat.tsx` kembali ke `sendChatMessage`
3. Commit dengan message `"revert: rollback SSE streaming"`
