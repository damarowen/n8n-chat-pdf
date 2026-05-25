# n8n Chat + PDF Upload

A lightweight Next.js frontend for chatting with PDF documents via an n8n webhook workflow.

## Features

- Chat interface with message history
- PDF file upload (required for first message)
- Browser-managed session ID per tab
- Handles JSON or text webhook responses
- Dark mode support

## Getting Started

### 1. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your n8n webhook URL:

```env
NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL=https://your-n8n-instance/webhook/chat-upload
```

### 2. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Webhook Contract

The frontend sends `multipart/form-data` with:

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Browser-generated session ID |
| `chatInput` | string | User message text |
| `data` | file (optional) | PDF file — required on first message |

This matches the n8n `WhenChatMessageReceived` node (`uploadBinaryPropertyName = data`).

## Project Structure

```
src/
├── app/                  # Next.js app (layout, page, styles)
├── components/           # React components (Chat.tsx)
└── services/             # API & utility logic (chatService.ts)
```

## Deploy

Deploy to Vercel, Netlify, or any Node host. Set the environment variable in your platform settings:

- `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL`

Then redeploy.
