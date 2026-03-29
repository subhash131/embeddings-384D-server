# 🚀 all-MiniLM-L6-v2 Embedding Server

A high-performance Express.js + TypeScript REST server for generating and storing text embeddings locally using the **all-MiniLM-L6-v2** model via `@xenova/transformers` (ONNX runtime).

## ✨ Features

- **Local Processing**: No external API calls needed. Everything runs on your machine.
- **Fast Embeddings**: Uses ONNX runtime for efficient CPU/GPU inference.
- **Auto-Chunking**: Built-in document chunking with configurable overlap for long texts.
- **Vector Search**: Simple in-memory vector store for similarity matching.
- **Rate Limited**: Protected endpoints to prevent resource exhaustion.
- **Health Monitoring**: Built-in health checks for model and store status.

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **Package Manager**: `pnpm` (recommended) or `npm`

## 🛠️ Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/subhash131/embeddings-384D-server
   cd embeddings-384D-server
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (or copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to set your desired port:
   ```env
   PORT=8000
   ```

4. **Build the project**:
   ```bash
   pnpm run build
   ```

## 🚀 Running the Server

### Production Mode
```bash
pnpm start
```

### Development Mode
```bash
pnpm run dev
```

The server will start at `http://localhost:8000` (or your configured port). It will automatically download the model on the first run if it's not present in the `model/` directory.

> [!TIP]
> **Using Postman or Insomnia?**
> You can simply copy any of the `curl` commands below and paste them directly into Postman (Import > Paste raw text) or Insomnia. They will automatically configure the method, URL, and headers for you!

---

## 🔌 API Endpoints

### 🩺 Health Check
`GET /health`

**Example Request:**
```bash
curl http://localhost:8000/health
```

---

### 🧠 Generate Embeddings
`POST /embed`

Generates 384-dimensional vectors for the provided input.

**JSON Body:**
```json
{
  "input": "Your text here"
}
```

**Example Request (curl):**
```bash
curl -X POST http://localhost:8000/embed \
     -H "Content-Type: application/json" \
     -d '{"input": "Hello world"}'
```

---

### 📥 Ingest Document
`POST /store`

Chunks and stores a document in the local vector store.

> [!WARNING]
> **No Persistence**: The current version uses an **in-memory** store. All ingested documents will be wiped if the server is restarted or goes down.

**JSON Body:**
```json
{
  "text": "Your large document text goes here...",
  "id": "optional-id-123",
  "chunk_words": 250,
  "overlap_words": 50
}
```

**Example Request (curl):**
```bash
curl -X POST http://localhost:8000/store \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Large document text...",
       "chunk_words": 100
     }'
```

---

### 📂 List Documents
`GET /store`

Returns a list of all documents currently in the store.

---

### 🔍 Similarity Search
`POST /match`

Search for the most relevant chunks in the store for a given query.

**JSON Body:**
```json
{
  "query": "Your search query",
  "top_k": 3
}
```

**Example Request (curl):**
```bash
curl -X POST http://localhost:8000/match \
     -H "Content-Type: application/json" \
     -d '{"query": "What is AI?", "top_k": 5}'
```

---

## 📊 Model Details

- **Model**: [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- **Dimension**: 384
- **Runtime**: ONNX (@xenova/transformers)
- **Context Window**: 256 tokens (recommended)

## 🛡️ License

MIT
