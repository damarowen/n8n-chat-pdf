import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : n8n-chatbot-pdf-gdrive-gemini
// Nodes   : 22  |  Connections: 13
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// WhenClickingExecuteWorkflow        manualTrigger
// DownloadFile                       googleDrive                [creds]
// SupabaseVectorStore                vectorStoreSupabase        [AI] [creds] [retry]
// EmbeddingsGoogleGemini             embeddingsGoogleGemini     [creds] [ai_embedding]
// DefaultDataLoader                  documentDefaultDataLoader  [AI] [ai_document]
// RecursiveCharacterTextSplitter     textSplitterRecursiveCharacterTextSplitter [ai_textSplitter]
// StickyNote                         stickyNote
// AiAgent                            agent                      [AI] [onError→regular]
// FormatCitation                     code
// GoogleGeminiChatModel              lmChatGoogleGemini         [creds] [retry] [ai_languageModel]
// PostgresChatMemory                 memoryPostgresChat         [creds] [ai_memory]
// EmbeddingsGoogleGemini1            embeddingsGoogleGemini     [creds] [ai_embedding]
// SupabaseVectorStore1               vectorStoreSupabase        [AI] [creds] [ai_tool]
// IfFileUploaded                     if
// ChatUploadWebhook                  webhook
// PrepareForAi                       set
// StickyNote1                        stickyNote
// EditFields                         set
// If_                                if
// ReturnResponse                     set
// RespondSuccess                     respondToWebhook
// RespondError                       respondToWebhook
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// WhenClickingExecuteWorkflow
//    → DownloadFile
//      → SupabaseVectorStore
//        → PrepareForAi
//          → AiAgent
//            → FormatCitation
//              → If_
//                → EditFields
//                  → RespondError
//               .out(1) → ReturnResponse
//                  → RespondSuccess
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
        position: [-1200, 400],
    })
    WhenClickingExecuteWorkflow = {};

    @node({
        id: '4ea87ce0-c704-4ee8-8f8f-d320c48b8242',
        name: 'Download file',
        type: 'n8n-nodes-base.googleDrive',
        version: 3,
        position: [-960, 400],
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
        position: [-800, 368],
        credentials: { supabaseApi: { id: 'SHnAw3PkW5ikrai0', name: 'Supabase account' } },
        retryOnFail: true,
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
        position: [-960, 640],
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
        position: [-720, 640],
    })
    DefaultDataLoader = {
        dataType: 'binary',
        binaryMode: 'specificField',
        loader: 'pdfLoader',
        binaryDataKey: 'data',
        options: {
            metadata: {
                metadataValues: [
                    {
                        name: 'sessionId',
                        value: "={{ $('Chat Upload Webhook').item.json.body.sessionId }}",
                    },
                ],
            },
        },
    };

    @node({
        id: '000fb9d1-8347-4475-9db1-0215460b8cd1',
        name: 'Recursive Character Text Splitter',
        type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
        version: 1,
        position: [-720, 880],
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
        position: [-480, 240],
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
        color: 1,
    };

    @node({
        id: '16584f02-4aac-461d-8bcf-cdae0c7a867a',
        name: 'AI Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 1.6,
        position: [-240, -400],
        onError: 'continueRegularOutput',
    })
    AiAgent = {
        options: {
            systemMessage: `Anda adalah Asisten Virtual yang menjawab pertanyaan berdasarkan dokumen PDF yang diupload user pada sesi ini.

ALUR WAJIB (TIDAK BOLEH DILEWATI):
- LANGKAH 1: SETIAP kali user mengirim pertanyaan APAPUN tentang isi dokumen, Anda WAJIB memanggil tool "search_documents" terlebih dahulu untuk mengambil konteks dari database. JANGAN PERNAH menjawab tanpa memanggil tool ini terlebih dulu.
- LANGKAH 2: Setelah tool mengembalikan hasil, baca konteks yang diambil dan susun jawaban hanya berdasarkan konteks tersebut.
- LANGKAH 3: Sertakan sitasi sesuai format di bawah.

ATURAN JAWABAN:
1. GUNAKAN HANYA informasi dari hasil tool. JANGAN gunakan pengetahuan umum di luar dokumen.
2. Jika hasil tool kosong atau benar-benar tidak ada informasi yang relevan, baru jawab: "Maaf, saya tidak menemukan informasi tersebut dalam dokumen yang tersedia." dan blok sitasi diisi [].
3. JAWAB dengan bahasa yang sama dengan pertanyaan user (Indonesia/Inggris).
4. Tetap objektif, profesional, dan ringkas.

FORMAT JAWABAN (WAJIB Markdown rapi):
- Mulai dengan 1 kalimat ringkasan ("**Ringkasan:** ...") yang menjawab inti pertanyaan.
- Jika ada beberapa poin/data, gunakan **bullet list** ("- item").
- Jika ada data tabular (mis. daftar invoice, harga, tanggal, jumlah), WAJIB gunakan **tabel Markdown** dengan header yang jelas. Contoh:

  | No | Nomor Invoice | Total Pendapatan |
  |----|---------------|------------------|
  | 1  | INV-XXX       | Rp1.000.000      |

- Gunakan **bold** untuk angka/nilai penting, dan heading "###" untuk seksi panjang.
- Tutup dengan baris "**Total / Kesimpulan:** ..." jika relevan.
- Jangan menulis jawaban dalam 1 paragraf panjang — pecah jadi seksi/list/tabel.

SITASI (WAJIB di paling akhir, di luar konten Markdown):

---CITATIONS---
[{"lines":{"from":<loc.lines.from>,"to":<loc.lines.to>},"excerpt":"<kutipan 1 kalimat kunci dari dokumen>"}]
---END_CITATIONS---

Jika tidak ada dokumen relevan, isi dengan: []`,
        },
    };

    @node({
        id: 'fc1a2b3c-4d5e-6f70-8901-abcdef123456',
        name: 'Format Citation',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [0, -400],
    })
    FormatCitation = {
        jsCode: `const raw = $input.first().json.output ?? '';
const citationMatch = raw.match(/---CITATIONS---\\s*([\\s\\S]*?)\\s*---END_CITATIONS---/);
let answerText = raw;
let citations = [];
if (citationMatch) {
  answerText = raw.replace(/---CITATIONS---[\\s\\S]*?---END_CITATIONS---/, '').trim();
  try { citations = JSON.parse(citationMatch[1].trim()); } catch (e) { citations = []; }
}
let citationText = '';
if (citations.length > 0) {
  citationText = citations.map(function (c, i) {
    var lines = c.lines ? 'Brs. ' + c.lines.from + '\\u2013' + c.lines.to : '';
    var excerpt = c.excerpt ? ' "' + c.excerpt + '"' : '';
    return '[' + (i + 1) + '] ' + lines + ':' + excerpt;
  }).join('\\n');
}
return [{
  json: {
    output: answerText,
    citations: citations,
    citationText: citationText,
    hasCitations: citations.length > 0,
    error: $input.first().json.error ?? null,
    sessionId: $input.first().json.sessionId ?? ''
  }
}];`,
    };

    @node({
        id: '3fe1a455-8c4f-45c7-a657-0585cc483952',
        name: 'Google Gemini Chat Model',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        version: 1,
        position: [-336, 0],
        credentials: { googlePalmApi: { id: 'h1z4Jak4KkNu5SQ7', name: 'Google Gemini(PaLM) Api account' } },
        retryOnFail: true,
    })
    GoogleGeminiChatModel = {
        options: {
            temperature: 0.1,
        },
    };

    @node({
        id: '23cc8cfb-c601-49c9-9f4f-c534303c2e7b',
        name: 'Postgres Chat Memory',
        type: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
        version: 1.2,
        position: [-160, -144],
        credentials: { postgres: { id: 'yoe8aj2syp3VHrNe', name: 'Postgres account' } },
    })
    PostgresChatMemory = {
        sessionIdType: 'customKey',
        sessionKey: '={{ $json.sessionId }}',
        tableName: 'chat_history',
    };

    @node({
        id: '828559fa-8b56-4072-a285-5794d57907a6',
        name: 'Embeddings Google Gemini1',
        type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
        version: 1,
        position: [240, -160],
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
        position: [0, -160],
        credentials: { supabaseApi: { id: 'SHnAw3PkW5ikrai0', name: 'Supabase account' } },
    })
    SupabaseVectorStore1 = {
        mode: 'retrieve-as-tool',
        toolDescription:
            'WAJIB dipanggil untuk SETIAP pertanyaan user. Tool ini melakukan semantic search ke dokumen PDF yang diupload user di sesi chat ini dan mengembalikan potongan teks (chunks) yang paling relevan beserta metadata (loc.lines.from, loc.lines.to). Input: query string berisi pertanyaan atau kata kunci dari user. Selalu panggil tool ini terlebih dahulu sebelum menyusun jawaban, walaupun pertanyaan user terlihat singkat atau ambigu.',
        tableName: {
            __rl: true,
            value: 'documents',
            mode: 'list',
            cachedResultName: 'documents',
        },
        options: {
            metadata: {
                metadataValues: [
                    {
                        name: 'sessionId',
                        value: "={{$('Prepare For AI').item.json.sessionId}}",
                    },
                ],
            },
        },
    };

    @node({
        id: 'f58b9e9f-2e1b-4a1f-b5a6-1f7f8b9c3d21',
        name: 'If File Uploaded',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [-960, -400],
    })
    IfFileUploaded = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'loose',
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
        looseTypeValidation: true,
        options: {},
    };

    @node({
        id: 'e1f2a3b4-c5d6-7890-abcd-ef1234567890',
        webhookId: 'chat-upload-id',
        name: 'Chat Upload Webhook',
        type: 'n8n-nodes-base.webhook',
        version: 2,
        position: [-1200, -400],
    })
    ChatUploadWebhook = {
        httpMethod: 'POST',
        path: 'chat-upload',
        responseMode: 'responseNode',
        options: {},
    };

    @node({
        id: 'a4b5c6d7-e8f9-0a1b-2c3d-4e5f6a7b8c9d',
        name: 'Prepare For AI',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [-480, -400],
    })
    PrepareForAi = {
        assignments: {
            assignments: [
                {
                    id: 'e5d6d10d-c0d6-48a5-936d-370ad9625376',
                    name: 'chatInput',
                    value: '={{ $("Chat Upload Webhook").item.json.body.chatInput }}',
                    type: 'string',
                },
                {
                    id: '86ea0b82-46ae-4d6a-bb4a-10f5a4a1749f',
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
        position: [704, -784],
    })
    StickyNote1 = {
        content: `Trigger: ChatUploadWebhook (POST /webhook/chat-upload)

Memory: Postgres Chat Memory di tabel chat_history (per sessionId).

Agentic Reasoning: AI Agent bertindak sebagai konduktor. Saat user bertanya, Agent memanggil Tool (Supabase Vector Store).

The Search: match_documents mencari chunk paling relevan berdasarkan semantic similarity.

Final Answer: Google Gemini 2.5 Flash menyusun jawaban dari context yang ditemukan.

Jika error: menampilkan pesan Maaf banget...`,
        height: 352,
        width: 608,
        color: 1,
    };

    @node({
        id: 'cc6321b7-2e03-4194-809f-a697e2a3128c',
        name: 'Edit Fields',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [240, -640],
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
        position: [144, -400],
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
        position: [480, -400],
    })
    ReturnResponse = {
        assignments: {
            assignments: [
                {
                    id: 'rr-001',
                    name: 'output',
                    value: '={{ $json.output }}',
                    type: 'string',
                },
                {
                    id: 'rr-002',
                    name: 'citations',
                    value: '={{ $json.citations }}',
                    type: 'array',
                },
                {
                    id: 'rr-003',
                    name: 'citationText',
                    value: '={{ $json.citationText }}',
                    type: 'string',
                },
                {
                    id: 'rr-004',
                    name: 'hasCitations',
                    value: '={{ $json.hasCitations }}',
                    type: 'boolean',
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
        name: 'Respond Success',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.1,
        position: [720, -400],
    })
    RespondSuccess = {
        respondWith: 'json',
        responseBody:
            '={{ JSON.stringify({ output: $json.output, citations: $json.citations, citationText: $json.citationText, hasCitations: $json.hasCitations }) }}',
        options: {
            responseCode: 200,
            responseHeaders: {
                entries: [
                    {
                        name: 'Content-Type',
                        value: 'application/json',
                    },
                ],
            },
        },
    };

    @node({
        id: 'bb22cc33-dd44-ee55-ff66-aabb11223344',
        name: 'Respond Error',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.1,
        position: [480, -640],
    })
    RespondError = {
        respondWith: 'json',
        responseBody:
            "={{ JSON.stringify({ output: $json.output, citations: [], citationText: '', hasCitations: false }) }}",
        options: {
            responseCode: 200,
            responseHeaders: {
                entries: [
                    {
                        name: 'Content-Type',
                        value: 'application/json',
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
        this.ChatUploadWebhook.out(0).to(this.IfFileUploaded.in(0));
        this.IfFileUploaded.out(0).to(this.SupabaseVectorStore.in(0));
        this.IfFileUploaded.out(1).to(this.PrepareForAi.in(0));
        this.SupabaseVectorStore.out(0).to(this.PrepareForAi.in(0));
        this.PrepareForAi.out(0).to(this.AiAgent.in(0));
        this.AiAgent.out(0).to(this.FormatCitation.in(0));
        this.FormatCitation.out(0).to(this.If_.in(0));
        this.If_.out(0).to(this.EditFields.in(0));
        this.If_.out(1).to(this.ReturnResponse.in(0));
        this.ReturnResponse.out(0).to(this.RespondSuccess.in(0));
        this.EditFields.out(0).to(this.RespondError.in(0));

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
