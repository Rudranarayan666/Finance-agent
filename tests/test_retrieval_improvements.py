"""
Unit tests for Phase 2 retrieval improvements:
- TableAwareChunker: header retention, unit detection, non-truncation
- QueryNormalizer: period detection, unit detection, contextual boosting
- DenseRetriever: dense vector generation and cosine scoring
"""
import pytest
from backend.app.rag.table_chunker import TableAwareChunker
from backend.app.rag.query_normalizer import QueryNormalizer
from backend.app.rag.dense import DenseEmbeddingEngine, DenseRetriever


def test_table_unit_and_period_detection():
    title = "Statement of Consolidated Operations (in millions)"
    headers = ["Line Item", "FY2024", "FY2023", "FY2022"]
    surrounding = "For the Fiscal Year Ended January 31, 2024"

    unit_name, mult = TableAwareChunker.detect_table_unit(title, headers, surrounding)
    assert unit_name == "USD Millions"
    assert mult == 1.0

    periods = TableAwareChunker.detect_table_periods(headers, surrounding)
    assert any("2024" in p for p in periods)
    assert any("2023" in p for p in periods)


def test_table_aware_chunker_retention_and_no_truncation():
    # Construct a table with 25 rows
    sample_rows = [[f"Metric {i}", f"${i*10}", f"${i*8}"] for i in range(1, 26)]
    table_dict = {
        "table_id": "test_t1",
        "title": "Selected Data (in millions)",
        "headers": ["Line Item", "2024", "2023"],
        "rows": sample_rows,
        "bbox": {"x0": 50, "y0": 100, "x1": 500, "y1": 600}
    }

    chunks = TableAwareChunker.chunk_table(
        table_dict=table_dict,
        document_id="doc_test",
        document_version="v1",
        page_num=5,
        physical_page_idx=4,
        printed_page_label="5",
        rows_per_chunk=8
    )

    # 25 rows / 8 rows per chunk = 4 chunks
    assert len(chunks) == 4
    # All 25 rows must be retained across chunks (no row 15 truncation!)
    total_retained_metrics = sum(c["text"].count("Row: Metric") for c in chunks)
    assert total_retained_metrics == 25

    # Every chunk must have the column headers and unit label
    for c in chunks:
        assert "Columns: Line Item | 2024 | 2023" in c["text"]
        assert "Unit: USD Millions" in c["text"]
        assert c["metadata"]["unit"] == "USD Millions"


def test_query_normalizer_intent_and_boost():
    # 1. Prior year query
    q1 = "What was the total revenue in the prior year quarter?"
    intent1 = QueryNormalizer.analyze_query(q1)
    assert intent1["is_prior_year"] is True
    assert intent1["is_current_year"] is False

    chunk_prior = {
        "raw_lower": "total revenues for prior year ended january 31, 2023 were $31,352 million",
        "metadata": {"primary_period": "2023"}
    }
    boost_prior = QueryNormalizer.compute_contextual_boost(chunk_prior, intent1)
    assert boost_prior >= 12.0  # Big boost for prior-year matches

    # 2. Unit trap query
    q2 = "What was Salesforce's total revenue in Billions?"
    intent2 = QueryNormalizer.analyze_query(q2)
    assert intent2["target_unit"] == "USD Billions"
    assert intent2["unit_multiplier"] == 1000.0

    # 3. Unit conversion
    val_converted = QueryNormalizer.convert_value_to_unit(
        value=34857.0,
        from_unit="USD Millions",
        to_unit="USD Billions"
    )
    assert val_converted == 34.857


def test_dense_retriever_offline_fallback():
    engine = DenseEmbeddingEngine.get_instance()
    texts = ["Total revenue was $94,930 million", "Gross margin reached 46.2%", "Risk factors include macroeconomic volatility"]
    vectors = engine.embed_texts(texts)
    assert vectors.shape[0] == 3
    assert vectors.shape[1] == 384

    retriever = DenseRetriever(doc_id="doc_unit_test")
    passages = [{"chunk_id": f"c_{i}", "text": t, "page": i+1} for i, t in enumerate(texts)]
    retriever.index_passages(passages)

    scores = retriever.score_query("total revenue and profit")
    assert len(scores) == 3
    # Top match should be passage 0
    assert scores[0] >= scores[2]
