# Comprehensive Repository Audit: FinanceAgent

**Date:** October 2026  
**Auditor:** Senior AI Engineer (Evaluation & GenAI Architect)  
**Status:** Complete (Phase 0 Read-Only Audit)  

---

## 1. Executive Summary

FinanceAgent is designed as an audit-grade financial report analysis platform combining PyMuPDF parsing, hybrid retrieval (BM25 Okapi + Scikit-Learn TF-IDF + Reciprocal Rank Fusion), deterministic citation validation, an abstention gate, an in-memory DuckDB OLAP engine, and SaaS RBAC/billing layers.

While the deterministic validation and security isolation architectures demonstrate solid defensive design principles, the repository contains critical architectural liabilities:
1. **Simulated Evaluations**: The existing `eval/run_eval.py` is a mock script using modulo arithmetic (`total_fields % 60 != 0`) rather than evaluating actual model outputs against real documents.
2. **Misleading Nomenclature**: TF-IDF cosine similarity is labeled "Dense Semantic Vector Indexing", despite lacking semantic embeddings.
3. **Ghost Dependencies & Configuration**: `chromadb` is declared in `requirements.txt` and `config.py` (`CHROMA_PERSIST_DIR`), but Chroma is never instantiated or queried.
4. **Data Truncation & Hallucinated Analytics**: Table extraction truncates at 15 rows (`rows[:15]`), and multi-quarter visual analytics in `supervisor.py` fabricate historical quarters by multiplying by `0.88`, `0.92`, and `0.96`.
5. **Missing Dependency**: `scikit-learn` was imported in `rag_service.py` but missing from `backend/requirements.txt`.
6. **Broken Test Fixture**: `tests/test_rag_and_chat.py::test_prompt_injection_defense` fails with HTTP 403 because test user fixtures lack required subscription plans.

---

## 2. End-to-End Architecture Map

### Request Flow: PDF Upload to Answer

```
[User / Frontend UI]
        │
        ▼ 1. Multipart PDF Upload (POST /api/v1/documents/upload)
[backend/app/api/documents.py]
        │
        ├─► 2. Binary Inspection & Security Scanner
        │      └─ [backend/app/core/security_scanner.py] (Signature %PDF-, size, /JS tokens)
        │
        ├─► 3. Cryptographic Hash Chain Seal
        │      └─ [backend/app/api/documents.py] (SHA-256: prev_hash:file_hash)
        │
        ├─► 4. Parsing & Structure Extraction
        │      └─ [backend/app/parser/pdf_parser.py] (PyMuPDF blocks, tables, visuals, OCR fallback)
        │
        ├─► 5. Database Persistence
        │      └─ [backend/app/models/models.py] (Document, EvidenceRecord, DocumentChunk)
        │
        └─► 6. In-Memory Chunking & Hybrid Indexing
               └─ [backend/app/rag/rag_service.py:index_document_chunks]
                      ├─ 160-char sentence-split text chunks
                      ├─ Tables (truncated to top 15 rows)
                      ├─ Visual regions (charts/images)
                      ├─ BM25 Okapi corpus statistics precomputation
                      └─ Scikit-Learn TF-IDF vectorizer fit_transform
```

```
[User Chat Query (POST /api/v1/chat/{document_id})]
        │
        ▼
[backend/app/api/chat.py:query_grounded_chat]
        │
        ├─► 1. RBAC & Tenant Verification
        │      └─ [backend/app/services/subscription_service.py] (Question limit check)
        │
        ├─► 2. Prompt Injection Guard
        │      └─ [backend/app/api/chat.py:is_prompt_injection]
        │
        ├─► 3. Hydration Check (Cache Recovery)
        │      └─ [backend/app/rag/rag_service.py:_load_from_database]
        │
        ├─► 4. Query Pre-processing & Synonym Expansion
        │      └─ [backend/app/rag/rag_service.py:FINANCIAL_SYNONYMS] (PAT, OCF, Net Income, etc.)
        │
        ├─► 5. Dual-Stream Scoring
        │      ├─ Lexical: BM25 Okapi (_score_bm25)
        │      └─ "Dense" Vector Space: TF-IDF Cosine Similarity (_score_dense)
        │
        ├─► 6. Reciprocal Rank Fusion (RRF) & Heuristic Boosts
        │      └─ [backend/app/rag/rag_service.py:538-587]
        │             rrf = 1/(60 + r_bm25) + 1/(60 + r_dense) + phrase/synonym boosts
        │
        ├─► 7. Safe Abstention Gate
        │      └─ [backend/app/rag/rag_service.py:590-608] (Rejects if combined_score <= threshold)
        │
        ├─► 8. Candidate Citation Formation (Top 4 Passages)
        │      └─ Physical page, printed label, snippet, bounding box coordinates
        │
        ├─► 9. Deterministic Citation Validation Outside LLM
        │      └─ [backend/app/engine/citation_validator.py:validate_response_citations]
        │             (Bounds check, version match, verbatim substring / 80% token overlap)
        │
        ├─► 10. Factual Guard Fallback & Synthesis
        │      ├─ Deterministic summary extraction: _extract_concise_answer
        │      ├─ LLM invocation: [backend/app/core/llm.py:LLMService.generate_grounded_answer]
        │      └─ Fallback guard: Discards LLM output if numeric values contradict top passage
        │
        └─► 11. Security Audit Logging & Response
               └─ [backend/app/models/models.py:AuditLog] (Inspected via /api/v1/chat/security/feed)
```

---

## 3. Plain-Language Explanation of Key Components

### 3.1 Hash Chain (`backend/app/api/documents.py:98-109`)
- **What it does**: Computes an incremental SHA-256 hash chaining each document to the organization's previously uploaded document: `chain_hash = sha256(prev_chain_hash + ":" + current_file_hash)`.
- **Why it is used**: Provides audit-trail immutability in standard relational databases (SQLite/PostgreSQL) without requiring a distributed blockchain. If an administrator manually replaces a PDF file in storage, the hash chain breaks on subsequent integrity verification (`/verify-chain`).

### 3.2 Hydration on Restart (`backend/app/rag/rag_service.py:353-409`)
- **What it does**: When the FastAPI worker restarts, all in-memory indexes (BM25 token matrices, TF-IDF vectorizers, passage dictionaries) are empty. When a user asks a question, `_load_from_database(document_id)` rehydrates in-memory structures from persisted SQLite `EvidenceRecord` rows, falling back to disk re-parsing if records are missing.
- **Why it is used**: Balances zero-latency in-memory retrieval with cold-start persistence across container or worker restarts.

### 3.3 Abstention Gate (`backend/app/rag/rag_service.py:589-608`)
- **What it does**: Evaluates whether candidate passages exceed strict relevance thresholds (`raw_boost > 2.0`, `bm25 > 0.5`, or `dense > 0.25`). If no passage qualifies, the system halts execution and returns a standardized abstention message (`grounded: False`, `confidence: 0.0`).
- **Why it is used**: In financial filings, fabricating an answer to an unmentioned metric (e.g., asking for "carbon credit liabilities" when none exist) creates high compliance risk. Abstaining safely is superior to guessing.

### 3.4 Factual Guard Fallback (`backend/app/rag/rag_service.py:657-672`)
- **What it does**: First extracts a concise answer deterministically from the top retrieved passage using regex-targeted sentences. It then passes the evidence to the LLM (NVIDIA NIM or OpenAI). Before returning the LLM output, it searches the LLM response for the key numeric entity (e.g. "$85 Million"). If the LLM omits or alters the number, the system discards the LLM text and falls back to the deterministic passage text.
- **Why it is used**: LLMs frequently hallucinate or reformat numbers, flip signs, or drop units. The deterministic parser acts as the final gatekeeper.

### 3.5 Synonym Expansion (`backend/app/rag/rag_service.py:23-41, 523-532`)
- **What it does**: Maps queries containing acronyms or colloquial terms (e.g., "PAT", "net income", "operating cash") to technical disclosures ("profit after tax", "profit for the year", "cash flow from operating activities").
- **Why it is used**: Standard lexical search fails when a user asks "What was the PAT?" but the 10-K only uses the line item "Profit for the financial year".

### 3.6 DuckDB Analytical Role (`backend/app/engine/duckdb_engine.py`)
- **What it does**: Runs an in-memory vectorized columnar database instance (`duckdb.connect(":memory:")`). When a document is analyzed, extracted metrics and table records are loaded into DuckDB tables (`document_metrics`, `financial_time_series`).
- **Why it is used**: Powering sub-millisecond SQL queries and aggregations from the frontend UI (`Visualizations.jsx`), allowing analysts to run arbitrary SQL over parsed statements. **Crucial clarification**: DuckDB is used for financial ratio analytics and SQL exploration, NOT as the vector retrieval index.

### 3.7 LangGraph Role (`backend/app/agents/supervisor.py`)
- **What it does**: Defines a multi-agent StateGraph DAG with 5 specialized extraction nodes (`section_locator`, `financial_agent`, `guidance_agent`, `risk_agent`, `interpretation_agent`) supervised by a `grounding_validator_node` with conditional retry (`should_retry`).
- **Why it is used**: Orchestrates asynchronous document processing when a document is first uploaded or when deep analysis is requested via `/analyze/{document_id}`. It is NOT invoked during per-turn chat (`/chat`), which uses the lightweight `AgenticRAGService`.

---

## 4. Honest Findings List

### 4.1 Dead Code & Unused Dependencies / Config
1. **ChromaDB**: `CHROMA_PERSIST_DIR` is defined in `config.py:45` and created on disk (`config.py:71`), and `chromadb>=0.5.0` is in `requirements.txt`. However, Chroma is never initialized, populated, or queried anywhere in backend application code.
2. **Fabricated Benchmark Script (`eval/run_eval.py`)**:
   Lines 95-101 contain:
   ```python
   # Simulate evaluation accuracy
   # Clean tabular has ~98.3% accuracy
   # Dense prose has ~86.7% accuracy
   # Large 10-K has ~88.8% accuracy
   if fmt == "clean_tabular":
       is_correct = (total_fields % 60 != 0)
   ```
   The script does not execute the RAG pipeline or test against real PDFs; it computes synthetic modulo math. The figures cited in `README.md` originate from this mock simulation.
3. **Fabricated Visual Trend Synthesis (`backend/app/agents/supervisor.py:95-100`)**:
   ```python
   rev_val = curr_rev if curr_rev else 10000.0
   revenues = [round(rev_val * 0.88, 1), round(rev_val * 0.92, 1), round(rev_val * 0.96, 1), round(rev_val, 1)]
   ```
   Instead of extracting historical quarters from filings, the visualization node invents past revenues by scaling current revenue by 88%, 92%, and 96%.

### 4.2 Misleading Naming
1. **"Dense Semantic Vector Indexing"**: `_score_dense` in `rag_service.py:337-351` uses `sklearn.feature_extraction.text.TfidfVectorizer` with cosine similarity. TF-IDF is a sparse bag-of-words representation, not a dense embedding vector space (such as BGE, OpenAI `text-embedding-3`, or NVIDIA NIM embeddings).
2. **"Blockchain SHA-256 Seal"**: The UI and comments describe document hashing as "Blockchain-grade Cryptographic Seal". It is an internal single-node hash chain stored in SQLite/Postgres columns (`prev_hash`, `chain_hash`), not a distributed ledger or consensus blockchain.

### 4.3 Hard-Coded Values
1. **BM25 Parameters**: `k1 = 1.5`, `b = 0.75` hardcoded in `rag_service.py:316-317`.
2. **RRF Hyperparameters**: Constant `60.0` and multiplier `50.0` hardcoded in `rag_service.py:553, 583`.
3. **Arbitrary Boost Weights**: Exact phrase (`+12.0`), synonym match (`+8.0`), token overlap (`+3.0`), visual query (`+10.0`), table query (`+8.0`) hardcoded in `rag_service.py:561-582`.
4. **Relevance Thresholds**: `raw_boost > 2.0`, `bm25 > 0.5`, `dense > 0.25` hardcoded in `rag_service.py:586`.
5. **Micro-Chunk Size**: Hardcoded sentence buffer threshold `buffer_len >= 160` characters (`rag_service.py:152`), generating fragments of only ~25-30 words.
6. **Table Row Cap**: Truncation at `rows[:15]` (`rag_service.py:207`) silently drops rows 16+ of financial schedules.
7. **Candidate Count**: Fixed `top_ranked = scored_passages[:4]` (`rag_service.py:612`).

### 4.4 Missing Error Handling & Dependencies
1. **Missing `scikit-learn` in `requirements.txt`**: `rag_service.py` imports `TfidfVectorizer` from `sklearn`, but `scikit-learn` was not listed in `backend/requirements.txt`.
2. **Tesseract Binary Failure on Windows**: In `pdf_parser.py:258`, OCR fallback assumes `tesseract` binary is installed in system PATH. If missing on Windows, pytesseract raises uncaught `TesseractNotFoundError`.
3. **Cross-Page Table Splitting**: `_extract_tables` in `pdf_parser.py` parses tables on a per-page basis. If a financial statement spans pages 45 and 46, page 46 is parsed without table headers.

### 4.5 Broken & Weak Tests
1. **Broken Test (`tests/test_rag_and_chat.py::test_prompt_injection_defense`)**: Fails with `403 Forbidden` (`SUBSCRIPTION_REQUIRED`) because the test creates a dummy user with no active subscription, triggering `SubscriptionService.check_question_limit` before the prompt injection defense executes.
2. **Shallow Unit Tests**: Most RAG tests (`test_rag_and_chat.py`, `test_hybrid_retrieval.py`) pass tiny 2-sentence synthetic strings rather than complex financial filings.
3. **No Metric-Driven Harness**: No tests compute Recall@k, Mean Reciprocal Rank (MRR), nDCG, citation precision, or numerical calibration on gold-standard Q&A pairs.

### 4.6 Security Gaps
1. **Default Secret Key**: `SECRET_KEY = "supersecretkey_for_development_replace_in_production_1234567890"` in `config.py:15`.
2. **Hardcoded Demo Accounts**: `seed_default_users_and_samples` in `database.py` seeds known credentials (`AnalystPass123!`, `AdminPass123!`).

### 4.7 Performance Analysis (Why Tests Take ~32-142 Seconds)
Profiled test run with `--durations=10`:
1. **`test_e2e_pipeline.py::test_end_to_end_sample_pdf_pipeline` (8.27s)**: Executes complete PyMuPDF parsing, table extraction, full 6-node LangGraph execution, SQLite writes, and DuckDB initialization.
2. **CPU-Intensive Password Hashing (`bcrypt` with 12 rounds)**: 23 individual tests in `test_saas_platform.py` and `test_rbac.py` call `get_password_hash` repeatedly. On Windows without hardware-accelerated bcrypt builds, each hash takes 100-300ms, accumulating over 15 seconds across the suite.
3. **Repeated DB Migration & Seeding**: Every test invoking `init_db()` runs SQLite PRAGMA table checks, schema migrations, and plan/user seeding synchronously.

---

## 5. Vulnerability to Financial Filing Traps

| Trap / Vulnerability | Root Cause in Current Codebase | Real-World Financial Consequence |
| :--- | :--- | :--- |
| **Table Truncation (>15 rows)** | `rag_service.py:207` (`rows[:15]`) drops all rows beyond row 15. | Segment operating income or detailed debt maturity schedules located at row 20+ are invisible to retrieval. |
| **Multi-Page Table Header Loss** | `pdf_parser.py:97` processes pages independently without header carryover. | Balance sheet continued on next page loses column headers; numbers are indexed without column labels. |
| **Unit Confusion (Millions vs Crores vs Thousands)** | `parse_numeric_financial` (`arithmetic.py`) only parses unit strings attached to the exact token. Table header units (e.g. `(₹ in Crores)` or `(in thousands)`) are not propagated to cell values. | A cell with `450` in a `(₹ in Crores)` table is parsed as `450.0` instead of `4,500 Million` or `₹4,500,000,000`, causing a 10x or 1,000,000x valuation error. |
| **Prior-Year Column Trap** | BM25 and TF-IDF rank passages based on keyword tokens ("Revenue", "PAT"). They do not align column dates ("FY2026" vs "FY2025"). | When asked for Q3 FY26 Net Income, the pipeline retrieves the table row containing both FY26 and FY25; deterministic regex picks the first number, frequently returning the prior year's number. |
| **Micro-Chunk Context Loss** | `rag_service.py:152` cuts passages at `160 characters` (~25 words). | Footnotes detailing accounting changes (e.g., "excluding a one-time impairment charge of $45M") get severed from the metric sentence. |

---

## 6. Prioritized Fix List & Effort Estimates

| Priority | Task Description | Affected Files | Effort |
| :---: | :--- | :--- | :---: |
| **P0** | **Fix Broken Existing Test**: Provide plan fixture in `test_rag_and_chat.py::test_prompt_injection_defense` so 100% of existing tests pass cleanly. | `tests/test_rag_and_chat.py` | 15 mins |
| **P0** | **Fix Dependencies**: Add `scikit-learn` to `backend/requirements.txt` and clean unused Chroma imports. | `backend/requirements.txt` | 10 mins |
| **P0** | **Build Real Golden Dataset & Evaluation Harness (Phase 1)**: Replace mock `eval/run_eval.py` with real schema, CLI verification, and deterministic metrics (Recall@k, MRR, nDCG, exact numeric match). | `evals/golden/*`, `evals/metrics.py`, `evals/run_eval.py` | 3-4 hours |
| **P1** | **Replace TF-IDF with Real Dense Retrieval (Phase 2a)**: Add BGE / sentence-transformers dense vector store alongside BM25 Okapi with persistent hydration. | `backend/app/rag/dense.py`, `backend/app/config.py` | 2-3 hours |
| **P1** | **Cross-Encoder Reranker (Phase 2b)**: Post-RRF reranker (`bge-reranker`) behind config flag to rank candidate chunks semantically. | `backend/app/rag/reranker.py` | 1.5 hours |
| **P1** | **Table-Aware Chunking & Header Retention (Phase 2c)**: Prevent row truncation; propagate table headers and metadata (units, periods) to every cell chunk. | `backend/app/parser/pdf_parser.py`, `backend/app/rag/rag_service.py` | 2-3 hours |
| **P1** | **Period & Unit Normalization (Phase 2d)**: Detect fiscal periods and currencies in query; normalize prior-year vs current-year columns. | `backend/app/engine/arithmetic.py`, `backend/app/rag/rag_service.py` | 2 hours |
| **P2** | **LLM-as-Judge & Calibration (Phase 3)**: Independent judge model with Pydantic output, Cohen's kappa calibration, and Ragas integration. | `backend/app/llm_judge/*`, `evals/calibration/*` | 3 hours |
| **P2** | **Hardened Structured Output (Phase 4)**: Instructor / Pydantic schema validation for extraction with retry counters. | `backend/app/engine/extraction.py` | 2 hours |
| **P2** | **Knowledge Graph Layer (Phase 5)**: NetworkX tenant-partitioned graph mapping entities (`Company`, `Metric`, `Period`, `Segment`) and edges for multi-hop YoY queries. | `backend/app/kg/*` | 4 hours |
| **P3** | **Observability & Langfuse (Phase 6)**: Optional trace instrumentation for latency, token spend, and retrieval diagnostics. | `backend/app/core/observability.py` | 2 hours |
| **P3** | **CI/CD Pipeline & Test Acceleration (Phase 7)**: Mock bcrypt rounds in test env (4 rounds instead of 12) to drop test runtime from 32s to <5s; GitHub Actions workflow with evaluation thresholds. | `.github/workflows/ci.yml`, `tests/conftest.py` | 1.5 hours |

---

*Phase 0 complete. No code modifications made during this phase.*
