# React Migration Plan for n8n Chatbot

## Current State
- Backend: n8n workflow `n8n-chatbot-pdf-gdrive-gemini`
- Chat endpoint: `POST /webhook/31a47c8c-aaee-4182-a6c5-6da629ab1cc0/chat`
- HTML UI endpoint: `GET /webhook/chat-ui`
- Features already available: chat + PDF upload + RAG retrieval + Postgres memory

## Goal
Build a separate React frontend (Next.js) that keeps n8n as the backend API.

## Architecture
- Frontend (Next.js on Vercel/Netlify)
  - Handles UI/UX, session state, file picker, loading/error states
- Backend (n8n)
  - Receives multipart form-data (`chatInput`, `sessionId`, `data` for PDF)
  - Routes upload requests into vector indexing
  - Routes chat requests to AI Agent + tool retrieval

## Implementation Steps
1. Create Next.js app with TypeScript + Tailwind
2. Add `components/Chat.tsx` for chat + upload UI
3. Configure env var:
   - `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL=https://nein.damarowen.blog/webhook/31a47c8c-aaee-4182-a6c5-6da629ab1cc0/chat`
4. Implement message list, typing indicator, upload status, and error handling
5. Submit with `FormData`:
   - `chatInput`
   - `sessionId`
   - `data` (optional PDF file)
6. Parse response:
   - `output` or fallback `message`
7. Deploy to Vercel
8. Validate end-to-end flow (upload + ask question about uploaded document)

## Minimal API Contract
Request (`multipart/form-data`):
- `chatInput` (string)
- `sessionId` (string)
- `data` (file, optional, `application/pdf`)

Response (`application/json` expected):
- `output` (string) or `message` (string)

## Deployment Checklist
- [ ] Workflow pushed and active in n8n
- [ ] CORS allows frontend domain (if needed)
- [ ] Env var set in Vercel project
- [ ] Production test: send chat text only
- [ ] Production test: upload PDF only
- [ ] Production test: ask question requiring retrieved context

## Notes
- Keep n8n workflow as source of truth for AI logic and ingestion pipeline.
- React app should remain stateless except for UI/session handling.
- If CORS blocks direct webhook access, add a Next.js API proxy route.
