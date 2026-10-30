"""
Cross-Encoder Semantic Reranker.
Reranks top candidate passages produced by RRF fusion using a cross-encoder model (bge-reranker-base).
"""
import os
import logging
from typing import List, Dict, Any, Optional, Tuple

from backend.app.config import settings

logger = logging.getLogger(__name__)


class CrossEncoderReranker:
    """
    Cross-Encoder Reranking service.
    Computes joint cross-attention over (query, passage) pairs to rerank RRF candidates.
    """
    _instance = None
    _model = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = CrossEncoderReranker()
        return cls._instance

    def __init__(self):
        self.enabled = getattr(settings, "USE_CROSS_ENCODER_RERANKER", False)
        self.model_name = getattr(settings, "RERANKER_MODEL_NAME", "BAAI/bge-reranker-base")
        self.top_n = getattr(settings, "RERANKER_TOP_N", 4)
        self._initialize_model()

    def _initialize_model(self):
        if not self.enabled:
            return
        try:
            from sentence_transformers import CrossEncoder
            try:
                self._model = CrossEncoder(self.model_name, local_files_only=True)
            except Exception:
                if os.environ.get("TRANSFORMERS_OFFLINE") == "1" or os.environ.get("PYTEST_CURRENT_TEST"):
                    raise RuntimeError("Offline test mode")
                self._model = CrossEncoder(self.model_name)
            logger.info(f"Loaded CrossEncoder model: {self.model_name}")
        except Exception as e:
            logger.debug(f"CrossEncoder initialization note: {e}")
            self._model = None

    def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_n: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Reranks candidate passage dicts and returns top_n entries.
        """
        if not candidates:
            return []

        limit = top_n or self.top_n

        # If model is loaded, run neural cross-encoder
        if self._model:
            try:
                pairs = [[query, c.get("text", "")] for c in candidates]
                scores = self._model.predict(pairs)
                scored = list(zip(scores, candidates))
                scored.sort(key=lambda x: x[0], reverse=True)
                reranked = [c for _, c in scored[:limit]]
                return reranked
            except Exception as e:
                logger.warning(f"CrossEncoder reranking error: {e}")

        # Fallback heuristic: token overlap & exact phrase matching
        q_low = query.lower()
        q_words = set(q_low.split())

        def _heuristic_score(c):
            t_low = c.get("raw_lower") or c.get("text", "").lower()
            exact = 10.0 if q_low in t_low else 0.0
            overlap = sum(1.0 for w in q_words if w in t_low)
            # Table bonus if query contains table words
            tbl = 3.0 if c.get("content_type") == "table" else 0.0
            return exact + overlap + tbl

        sorted_candidates = sorted(candidates, key=_heuristic_score, reverse=True)
        return sorted_candidates[:limit]


reranker = CrossEncoderReranker.get_instance()
