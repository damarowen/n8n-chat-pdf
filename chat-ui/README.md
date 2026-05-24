# Chat UI for n8n RAG Workflow

This app is a lightweight Next.js frontend for your n8n chat workflow endpoint.

## Features

- Chat message input
- PDF upload from browser
- Session ID per browser tab
- Handles JSON or text webhook responses

## 1) Configure environment

Copy `.env.example` to `.env.local` and set your webhook URL.

```bash
cp .env.example .env.local
```

Default variable:

```env
NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL=https://nein.damarowen.blog/webhook/31a47c8c-aaee-4182-a6c5-6da629ab1cc0/chat
```

## 2) Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 3) n8n payload contract

The frontend sends `multipart/form-data` with:

- `sessionId` (string)
- `chatInput` (string)
- `data` (file, optional PDF)

This matches your `WhenChatMessageReceived` setup (`uploadBinaryPropertyName = data`).

## 4) Deploy

Deploy to Vercel/Netlify and set this environment variable in the platform settings:

- `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL`

Then redeploy.
