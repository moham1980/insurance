# Knowledge Layer Service — Capability Truth Registry

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Document Indexing | **REAL** | `indexDocument` with chunking, embedding, and persistence | None | Production-ready
| Semantic Search | **REAL** | `search` with cosine similarity over document/chunk embeddings | In-memory similarity; consider pgvector for scale | P1
| Embedding Generation | **REAL** | `generateEmbeddings` calls external API via `EMBEDDING_API_URL`; falls back to mock | Needs production embedding endpoint (OpenAI, local, etc.) | P0
| Chunk-Level Embeddings | **REAL** | Per-chunk embeddings stored in `DocumentChunk.embeddings` | None | Production-ready
| Citation-Ready Retrieval | **SKELETON** | Chunk-level provenance exists | Needs source ranking and trust scoring | P2
| Vector Store | **SKELETON** | Embeddings stored as `jsonb` in PostgreSQL | Needs pgvector or dedicated vector DB for scale | P2

## Environment Variable Requirements

```bash
EMBEDDING_API_URL=                  # e.g., https://api.openai.com/v1/embeddings
EMBEDDING_API_KEY=                  # API key for embedding provider
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

## Decision Log

- **2024-06-11**: `generateEmbeddings` now uses `fetch` to call external embedding API with fallback to mock embeddings. Mock is only used when `EMBEDDING_API_URL` is unset.
- **2024-06-11**: Chunk-level embeddings are now generated during indexing for citation-aware retrieval.
