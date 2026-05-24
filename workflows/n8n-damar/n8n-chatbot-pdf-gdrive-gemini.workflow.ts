import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : n8n-chatbot-pdf-gdrive-gemini
// Nodes   : 20  |  Connections: 11
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
// IfFileUploaded                     if
// ChatUploadWebhook                  webhook
// UploadAcknowledgement              set
// PrepareForAi                       set
// StickyNote1                        stickyNote
// EditFields                         set
// If_                                if
// ReturnResponse                     set
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// WhenClickingExecuteWorkflow
//    → DownloadFile
//      → SupabaseVectorStore
//        → UploadAcknowledgement
//          → PrepareForAi
//            → AiAgent
//              → If_
//                → EditFields
//               .out(1) → ReturnResponse
// ChatUploadWebhook
//    → IfFileUploaded
//      → SupabaseVectorStore (↩ loop)
//     .out(1) → PrepareForAi (↩ loop)
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
        loader: 'auto',
        binaryDataKey: 'data',
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
        color: 1,
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
        text: '={{ $json.chatInput }}',
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
        modelName: 'models/gemini-2.5-flash',
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
        sessionKey: '={{ $json.sessionId }}',
        tableName: 'chat_history',
        contextWindowLength: 5,
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
        id: 'f58b9e9f-2e1b-4a1f-b5a6-1f7f8b9c3d21',
        name: 'If File Uploaded',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [-16, -688],
    })
    IfFileUploaded = {
        looseTypeValidation: true,
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
                    leftValue: '={{ $binary.data.fileName }}',
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
        id: 'e1f2a3b4-c5d6-7890-abcd-ef1234567890',
        webhookId: 'chat-upload-id',
        name: 'Chat Upload Webhook',
        type: 'n8n-nodes-base.webhook',
        version: 2,
        position: [-352, -688],
    })
    ChatUploadWebhook = {
        path: 'chat-upload',
        httpMethod: 'POST',
        responseMode: 'lastNode',
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
        id: 'a4b5c6d7-e8f9-0a1b-2c3d-4e5f6a7b8c9d',
        name: 'Prepare For AI',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [400, -624],
    })
    PrepareForAi = {
        mode: 'manual',
        include: 'none',
        assignments: {
            assignments: [
                {
                    id: 'c9d0e1f2-3a4b-5c6d-7e8f-9a0b1c2d3e4f',
                    name: 'chatInput',
                    value: '={{ $("Chat Upload Webhook").item.json.body.chatInput }}',
                    type: 'string',
                },
                {
                    id: 'f0a1b2c3-d4e5-6f78-9abc-def012345678',
                    name: 'sessionId',
                    value: '={{ $("Chat Upload Webhook").item.json.body.sessionId }}',
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
        color: 1,
        content: `Trigger: ChatUploadWebhook (POST /webhook/chat-upload)

Memory: Postgres Chat Memory di tabel chat_history (per sessionId).

Agentic Reasoning: AI Agent bertindak sebagai konduktor. Saat user bertanya, Agent memanggil Tool (Supabase Vector Store).

The Search: match_documents mencari chunk paling relevan berdasarkan semantic similarity.

Final Answer: Google Gemini 2.5 Flash menyusun jawaban dari context yang ditemukan.

Jika error: menampilkan pesan Maaf banget...`,
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
        id: 'f1a2b3c4-d5e6-7890-abcd-ef0123456789',
        name: 'Return Response',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [512, -640],
    })
    ReturnResponse = {
        includeOtherFields: true,
        assignments: {
            assignments: [],
        },
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.WhenClickingExecuteWorkflow.out(0).to(this.DownloadFile.in(0));
        this.DownloadFile.out(0).to(this.SupabaseVectorStore.in(0));
        this.ChatUploadWebhook.out(0).to(this.IfFileUploaded.in(0));
        this.IfFileUploaded.out(0).to(this.SupabaseVectorStore.in(0));
        this.IfFileUploaded.out(1).to(this.PrepareForAi.in(0));
        this.SupabaseVectorStore.out(0).to(this.UploadAcknowledgement.in(0));
        this.UploadAcknowledgement.out(0).to(this.PrepareForAi.in(0));
        this.PrepareForAi.out(0).to(this.AiAgent.in(0));
        this.AiAgent.out(0).to(this.If_.in(0));
        this.If_.out(0).to(this.EditFields.in(0));
        this.If_.out(1).to(this.ReturnResponse.in(0));

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
