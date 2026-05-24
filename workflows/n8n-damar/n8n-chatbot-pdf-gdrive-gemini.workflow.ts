import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : n8n-chatbot-pdf-gdrive-gemini
// Nodes   : 20  |  Connections: 9
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// WhenClickingExecuteWorkflow        manualTrigger
// DownloadFile                       googleDrive                [creds]
// SupabaseVectorStore                vectorStoreSupabase        [AI] [creds]
// EmbeddingsGoogleGemini             embeddingsGoogleGemini     [creds] [ai_embedding]
// DefaultDataLoader                  documentDefaultDataLoader  [AI] [ai_document]
// RecursiveCharacterTextSplitter     textSplitterRecursiveCharacterTextSplitter [ai_textSplitter]
// StickyNote                         stickyNote
// AiAgent                            agent                      [AI] [onError→regular]
// GoogleGeminiChatModel              lmChatGoogleGemini         [creds] [retry] [ai_languageModel]
// PostgresChatMemory                 memoryPostgresChat         [creds] [ai_memory]
// EmbeddingsGoogleGemini1            embeddingsGoogleGemini     [creds] [ai_embedding]
// SupabaseVectorStore1               vectorStoreSupabase        [AI] [creds] [ai_tool]
// WhenChatMessageReceived            chatTrigger
// IfFileUploaded                     if
// UploadAcknowledgement              set
// StickyNote1                        stickyNote
// EditFields                         set
// If_                                if
// ChatUiWebhook                      webhook
// HtmlChatResponse                   respondToWebhook
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// WhenClickingExecuteWorkflow
//    → DownloadFile
//      → SupabaseVectorStore
//        → UploadAcknowledgement
// WhenChatMessageReceived
//    → IfFileUploaded
//      → SupabaseVectorStore (↩ loop)
//     .out(1) → AiAgent
//        → If_
//          → EditFields
// ChatUiWebhook
//    → HtmlChatResponse
//
// AI CONNECTIONS
// SupabaseVectorStore.uses({ ai_embedding: EmbeddingsGoogleGemini, ai_document: [DefaultDataLoader] })
// DefaultDataLoader.uses({ ai_textSplitter: RecursiveCharacterTextSplitter })
// AiAgent.uses({ ai_languageModel: GoogleGeminiChatModel, ai_memory: PostgresChatMemory, ai_tool: [SupabaseVectorStore1] })
// SupabaseVectorStore1.uses({ ai_embedding: EmbeddingsGoogleGemini1 })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: '9ZjUMTxEHEWh2545',
    name: 'n8n-chatbot-pdf-gdrive-gemini',
    active: true,
    isArchived: false,
    settings: {
        executionOrder: 'v1',
        binaryMode: 'separate',
        callerPolicy: 'workflowsFromSameOwner',
        availableInMCP: false,
    },
})
export class N8nChatbotPdfGdriveGeminiWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'd301231a-8630-4e6f-8d1c-3900f07be4b9',
        name: "When clicking 'Execute workflow'",
        type: 'n8n-nodes-base.manualTrigger',
        version: 1,
        position: [-352, -128],
    })
    WhenClickingExecuteWorkflow = {};

    @node({
        id: '4ea87ce0-c704-4ee8-8f8f-d320c48b8242',
        name: 'Download file',
        type: 'n8n-nodes-base.googleDrive',
        version: 3,
        position: [-128, -128],
        credentials: { googleDriveOAuth2Api: { id: 'IUhQeIrxHvA2IALs', name: 'Google Drive account' } },
    })
    DownloadFile = {
        operation: 'download',
        fileId: {
            __rl: true,
            value: '1VP9Ep9BLpOV-gV3fEpMyK9rkP8WGeUyi',
            mode: 'list',
            cachedResultName: 'Damar-Oen-Resume-2026.pdf',
            cachedResultUrl: 'https://drive.google.com/file/d/1VP9Ep9BLpOV-gV3fEpMyK9rkP8WGeUyi/view?usp=drivesdk',
        },
        options: {},
    };

    @node({
        id: '1a30865f-517b-4c4e-aeef-2d5b8f484a87',
        name: 'Supabase Vector Store',
        type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
        version: 1,
        position: [144, -112],
        credentials: { supabaseApi: { id: 'SHnAw3PkW5ikrai0', name: 'Supabase account' } },
    })
    SupabaseVectorStore = {
        mode: 'insert',
        tableName: {
            __rl: true,
            value: 'documents',
            mode: 'list',
            cachedResultName: 'documents',
        },
        options: {},
    };

    @node({
        id: 'f57a09ac-8ae0-4236-813d-0724060fe473',
        name: 'Embeddings Google Gemini',
        type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
        version: 1,
        position: [-48, 192],
        credentials: { googlePalmApi: { id: 'h1z4Jak4KkNu5SQ7', name: 'Google Gemini(PaLM) Api account' } },
    })
    EmbeddingsGoogleGemini = {
        modelName: 'models/gemini-embedding-001',
    };

    @node({
        id: 'b9077965-d002-4cbe-b41e-a34c8547a3e0',
        name: 'Default Data Loader',
        type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
        version: 1,
        position: [256, 128],
    })
    DefaultDataLoader = {
        dataType: 'binary',
        binaryMode: 'specificField',
        binaryPropertyName: 'data',
        options: {},
    };

    @node({
        id: '000fb9d1-8347-4475-9db1-0215460b8cd1',
        name: 'Recursive Character Text Splitter',
        type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
        version: 1,
        position: [368, 304],
    })
    RecursiveCharacterTextSplitter = {
        chunkOverlap: 100,
        options: {},
    };

    @node({
        id: 'b9b06257-bc91-4d37-9a12-31cc3e6bb69b',
        name: 'Sticky Note',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [528, -80],
    })
    StickyNote = {
        content: `SUMMARY: JALUR INGESTION (LIBRARY BUILDER)

Source: Google Drive (Folder: Buat Kerja)

Parser: Default Data Loader (PDF Extraction)

Strategy: Recursive Splitter (Chunk: 1000, Overlap: 100)

Model: Google Gemini embedding-001 (768 Dim)

Destination: Supabase Table documents

Purpose: Sinkronisasi resume ke Vector Store untuk basis pengetahuan AI.

Input: Application/PDF (Binary) -> Process: Parse  -> Split (1000 text) -> Vectorize -> Output: Vector Record (Supabase).`,
        height: 336,
        width: 592,
    };

    @node({
        id: '16584f02-4aac-461d-8bcf-cdae0c7a867a',
        name: 'AI Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 1.6,
        position: [160, -736],
        onError: 'continueRegularOutput',
    })
    AiAgent = {
        options: {
            systemMessage: `Anda adalah Asisten Virtual yang bertugas menjawab pertanyaan berdasarkan dokumen yang diberikan.

ATURAN UTAMA:
1. GUNAKAN HANYA informasi yang ditemukan dalam dokumen (Context) yang diambil dari database.
2. JANGAN gunakan pengetahuan umum Anda di luar dokumen tersebut.
3. JIKA informasi tidak ada dalam dokumen, jawablah dengan jujur: "Maaf, saya tidak menemukan informasi tersebut dalam dokumen yang tersedia."
4. JAWABLAH dengan bahasa yang sama dengan pertanyaan user (Indonesia/Inggris).
5. TETAPLAH objektif, profesional, dan ringkas.

DATA KONTEKS:
{context}

HISTORY PERCAKAPAN:
{chat_history}`,
        },
    };

    @node({
        id: '3fe1a455-8c4f-45c7-a657-0585cc483952',
        name: 'Google Gemini Chat Model',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        version: 1,
        position: [48, -528],
        credentials: { googlePalmApi: { id: 'h1z4Jak4KkNu5SQ7', name: 'Google Gemini(PaLM) Api account' } },
        retryOnFail: true,
    })
    GoogleGeminiChatModel = {
        modelName: 'models/gemini-1.5-flash',
        options: {
            temperature: 0.1,
        },
    };

    @node({
        id: '23cc8cfb-c601-49c9-9f4f-c534303c2e7b',
        name: 'Postgres Chat Memory',
        type: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
        version: 1.2,
        position: [192, -528],
        credentials: { postgres: { id: 'yoe8aj2syp3VHrNe', name: 'Postgres account' } },
    })
    PostgresChatMemory = {
        tableName: 'chat_history',
    };

    @node({
        id: '828559fa-8b56-4072-a285-5794d57907a6',
        name: 'Embeddings Google Gemini1',
        type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
        version: 1,
        position: [432, -352],
        credentials: { googlePalmApi: { id: 'h1z4Jak4KkNu5SQ7', name: 'Google Gemini(PaLM) Api account' } },
    })
    EmbeddingsGoogleGemini1 = {
        modelName: 'models/gemini-embedding-001',
    };

    @node({
        id: '2763f1b1-6f20-4493-a8a5-1252fe898b17',
        name: 'Supabase Vector Store1',
        type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
        version: 1.3,
        position: [336, -544],
        credentials: { supabaseApi: { id: 'SHnAw3PkW5ikrai0', name: 'Supabase account' } },
    })
    SupabaseVectorStore1 = {
        mode: 'retrieve-as-tool',
        toolDescription: 'work',
        tableName: {
            __rl: true,
            value: 'documents',
            mode: 'list',
            cachedResultName: 'documents',
        },
        options: {},
    };

    @node({
        id: 'b88a1ca8-79b1-4e91-8560-7e12d78db270',
        webhookId: '31a47c8c-aaee-4182-a6c5-6da629ab1cc0',
        name: 'When chat message received',
        type: '@n8n/n8n-nodes-langchain.chatTrigger',
        version: 1.4,
        position: [-160, -688],
        retryOnFail: false,
    })
    WhenChatMessageReceived = {
        public: true,
        initialMessages:
            "Hi there! I'm Nathan. Feel free to ask me anything about Damar's professional profile. You can also upload a PDF and I will index it automatically.",
        options: {
            allowFileUploads: true,
            acceptedMimeTypes: ['application/pdf'],
            uploadBinaryPropertyName: 'data',
        },
    };

    @node({
        id: 'f58b9e9f-2e1b-4a1f-b5a6-1f7f8b9c3d21',
        name: 'If File Uploaded',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [-16, -688],
    })
    IfFileUploaded = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 3,
            },
            conditions: [
                {
                    id: '7f3c0c8d-2c7e-4f2a-bf8c-2b7e2d7b1c9a',
                    leftValue: '={{ $binary.data }}',
                    rightValue: '',
                    operator: {
                        type: 'string',
                        operation: 'notEmpty',
                        singleValue: true,
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: 'd9a0b1c2-3d4e-5f60-a7b8-91c2d3e4f5a6',
        name: 'Upload Acknowledgement',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [736, -624],
    })
    UploadAcknowledgement = {
        assignments: {
            assignments: [
                {
                    id: 'b1a2c3d4-e5f6-47a8-9123-4567890abcde',
                    name: 'output',
                    value: 'Your file was uploaded and indexed. You can now ask questions about it.',
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '3dab5c2a-8dd4-45b4-a2b2-0b0a46e59314',
        name: 'Sticky Note1',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [688, -448],
    })
    StickyNote1 = {
        content: `Trigger: Dimulai saat ada pesan masuk melalui Chat Trigger.

Memory: Menggunakan node Postgres Chat Memory yang terhubung ke tabel chat_history. Ini berfungsi agar AI ingat konteks obrolan sebelumnya (menggunakan sessionId).

Agentic Reasoning: AI Agent bertindak sebagai konduktor. Saat user bertanya, Agent tidak langsung menjawab, tapi memanggil Tool (Supabase Vector Store).

The Search: Melalui fungsi RPC match_documents, database mencari potongan resume yang paling relevan dengan pertanyaan user berdasarkan kemiripan vektor.

Final Answer: Google Gemini menerima pertanyaan user + potongan resume yang relevan, lalu menyusun jawaban final yang akurat.

jika error akan menampilkan default message error`,
        height: 352,
        width: 608,
    };

    @node({
        id: 'cc6321b7-2e03-4194-809f-a697e2a3128c',
        name: 'Edit Fields',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [784, -784],
    })
    EditFields = {
        assignments: {
            assignments: [
                {
                    id: '8dc5d93d-c14d-4e61-8705-efa523d35bce',
                    name: 'output',
                    value: 'Maaf banget, sepertinya otak saya (API) sedang kepanasan karena terlalu banyak permintaan. Silakan coba lagi sekitar 1 menit lagi ya!',
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '45c76cd0-9532-40ce-ae3d-01e7f9d35acf',
        name: 'If',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [512, -736],
    })
    If_ = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 3,
            },
            conditions: [
                {
                    id: '30879e93-6750-49c9-90f7-bb7d097aa6e1',
                    leftValue: '={{ $json.error }}',
                    rightValue: '',
                    operator: {
                        type: 'string',
                        operation: 'notEmpty',
                        singleValue: true,
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        webhookId: 'chat-ui-webhook-id',
        name: 'Chat UI Webhook',
        type: 'n8n-nodes-base.webhook',
        version: 2,
        position: [-352, 128],
    })
    ChatUiWebhook = {
        path: 'chat-ui',
        httpMethod: 'GET',
        responseMode: 'responseNode',
        options: {},
    };

    @node({
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: 'HTML Chat Response',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.1,
        position: [-128, 128],
    })
    HtmlChatResponse = {
        respondWith: 'text',
        responseBody: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nathan AI - Document Chat Assistant</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .message { animation: fadeIn 0.3s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .typing-indicator span { animation: typing 1.4s infinite; }
        @keyframes typing { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }
    </style>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
    <div class="container mx-auto max-w-4xl h-screen flex flex-col p-4">
        <!-- Header -->
        <div class="bg-white rounded-t-2xl shadow-lg p-6 border-b">
            <h1 class="text-3xl font-bold text-gray-800">🤖 Nathan AI</h1>
            <p class="text-gray-600 mt-1">Document Chat Assistant - Ask me anything about uploaded documents</p>
        </div>

        <!-- Chat Messages -->
        <div id="chatMessages" class="bg-white flex-1 overflow-y-auto p-6 space-y-4"></div>

        <!-- Input Area -->
        <div class="bg-white rounded-b-2xl shadow-lg p-6 border-t">
            <div id="uploadStatus" class="hidden mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p class="text-sm text-blue-700">📄 <span id="fileName"></span></p>
            </div>
            <div class="flex gap-3">
                <input type="file" id="fileInput" accept="application/pdf" class="hidden">
                <button onclick="document.getElementById('fileInput').click()" class="px-4 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl transition">
                    📎
                </button>
                <input type="text" id="messageInput" placeholder="Type your message or upload a PDF..." 
                    class="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <button onclick="sendMessage()" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition">
                    Send
                </button>
            </div>
        </div>
    </div>

    <script>
        const WEBHOOK_URL = 'https://nein.damarowen.blog/webhook/31a47c8c-aaee-4182-a6c5-6da629ab1cc0/chat';
        let sessionId = 'session-' + Date.now();
        let selectedFile = null;

        document.getElementById('fileInput').addEventListener('change', (e) => {
            selectedFile = e.target.files[0];
            if (selectedFile) {
                document.getElementById('uploadStatus').classList.remove('hidden');
                document.getElementById('fileName').textContent = selectedFile.name;
            }
        });

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        function addMessage(text, isUser) {
            const messagesDiv = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message flex \${isUser ? 'justify-end' : 'justify-start'}\`;
            messageDiv.innerHTML = \`
                <div class="\${isUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'} rounded-2xl px-5 py-3 max-w-lg shadow">
                    <p class="whitespace-pre-wrap">\${text}</p>
                </div>
            \`;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function showTyping() {
            const messagesDiv = document.getElementById('chatMessages');
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typing';
            typingDiv.className = 'flex justify-start';
            typingDiv.innerHTML = \`
                <div class="bg-gray-100 rounded-2xl px-5 py-3 shadow typing-indicator">
                    <span class="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                    <span class="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1" style="animation-delay: 0.2s"></span>
                    <span class="inline-block w-2 h-2 bg-gray-400 rounded-full" style="animation-delay: 0.4s"></span>
                </div>
            \`;
            messagesDiv.appendChild(typingDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function removeTyping() {
            const typing = document.getElementById('typing');
            if (typing) typing.remove();
        }

        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message && !selectedFile) return;

            if (message) addMessage(message, true);
            input.value = '';

            showTyping();

            try {
                const formData = new FormData();
                formData.append('chatInput', message);
                formData.append('sessionId', sessionId);
                
                if (selectedFile) {
                    formData.append('data', selectedFile);
                    document.getElementById('uploadStatus').classList.add('hidden');
                    selectedFile = null;
                }

                const response = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                removeTyping();
                
                const reply = data.output || data.message || 'No response received';
                addMessage(reply, false);
            } catch (error) {
                removeTyping();
                addMessage('❌ Error: ' + error.message, false);
            }
        }

        // Initial greeting
        addMessage("Hi there! I'm Nathan. Feel free to ask me anything about Damar's professional profile. You can also upload a PDF and I will index it automatically.", false);
    </script>
</body>
</html>`,
        options: {
            responseCode: 200,
            responseHeaders: {
                entries: [
                    {
                        name: 'Content-Type',
                        value: 'text/html',
                    },
                ],
            },
        },
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.WhenClickingExecuteWorkflow.out(0).to(this.DownloadFile.in(0));
        this.DownloadFile.out(0).to(this.SupabaseVectorStore.in(0));
        this.WhenChatMessageReceived.out(0).to(this.IfFileUploaded.in(0));
        this.IfFileUploaded.out(0).to(this.SupabaseVectorStore.in(0));
        this.IfFileUploaded.out(1).to(this.AiAgent.in(0));
        this.SupabaseVectorStore.out(0).to(this.UploadAcknowledgement.in(0));
        this.AiAgent.out(0).to(this.If_.in(0));
        this.If_.out(0).to(this.EditFields.in(0));
        this.ChatUiWebhook.out(0).to(this.HtmlChatResponse.in(0));

        this.SupabaseVectorStore.uses({
            ai_embedding: this.EmbeddingsGoogleGemini.output,
            ai_document: [this.DefaultDataLoader.output],
        });
        this.DefaultDataLoader.uses({
            ai_textSplitter: this.RecursiveCharacterTextSplitter.output,
        });
        this.AiAgent.uses({
            ai_languageModel: this.GoogleGeminiChatModel.output,
            ai_memory: this.PostgresChatMemory.output,
            ai_tool: [this.SupabaseVectorStore1.output],
        });
        this.SupabaseVectorStore1.uses({
            ai_embedding: this.EmbeddingsGoogleGemini1.output,
        });
    }
}
