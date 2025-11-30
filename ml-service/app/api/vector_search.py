"""FAISS vector search endpoints."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from app.api.embeddings import generate_embedding
from app.services.faiss_index import FaissIndexService
from app.utils.data_fetcher import DataFetcher
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)
faiss_service = FaissIndexService()


class FaissRebuildRequest(BaseModel):
    """Request payload for rebuilding the FAISS index."""

    limit: Optional[int] = Field(None, ge=1, le=10000, description="Maximum destinations to include")
    cities: Optional[List[str]] = Field(None, description="Restrict embeddings to these cities")
    categories: Optional[List[str]] = Field(None, description="Restrict embeddings to these categories")


class FaissSearchRequest(BaseModel):
    """Search payload supporting either a vector or free text query."""

    query_vector: Optional[List[float]] = Field(None, description="Embedding vector to search with")
    query_text: Optional[str] = Field(None, description="Raw text to embed and search")
    model: str = Field(default="text-embedding-3-small", description="Embedding model to use for query_text")
    top_k: int = Field(default=5, ge=1, le=50, description="Number of nearest neighbors to return")

    @model_validator(mode="after")
    def ensure_query(self) -> "FaissSearchRequest":
        if not self.query_vector and not self.query_text:
            raise ValueError("Provide either query_vector or query_text")
        return self


class FaissSearchResult(BaseModel):
    """Single FAISS search hit."""

    score: float
    metadata: Dict[str, Any]


class FaissSearchResponse(BaseModel):
    """Response for FAISS semantic search."""

    results: List[FaissSearchResult]
    top_k: int
    model: Optional[str]


def _ensure_faiss_available() -> None:
    if not faiss_service.available:
        raise HTTPException(
            status_code=503,
            detail="FAISS is not installed in this environment. Install faiss-cpu to enable vector search.",
        )


@router.get("/vector/faiss/status")
async def faiss_status() -> Dict[str, Any]:
    """Return FAISS index availability and size for monitoring."""
    return faiss_service.status()


@router.post("/vector/faiss/rebuild")
async def rebuild_faiss_index(request: FaissRebuildRequest) -> Dict[str, Any]:
    """Rebuild the FAISS index from destination embeddings stored in Postgres."""

    _ensure_faiss_available()

    records = DataFetcher.fetch_destination_embeddings(
        limit=request.limit, cities=request.cities, categories=request.categories
    )

    if not records:
        raise HTTPException(status_code=404, detail="No destination embeddings available to index.")

    try:
        count = faiss_service.build_from_records(records)
        faiss_service.save()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Failed to rebuild FAISS index: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred while rebuilding the FAISS index.")

    return {
        "status": "ok",
        "vectors_indexed": count,
        "filters": {
            "limit": request.limit,
            "cities": request.cities,
            "categories": request.categories,
        },
        "index_size": faiss_service.index.ntotal if faiss_service.index else 0,
    }


@router.post("/vector/faiss/search", response_model=FaissSearchResponse)
async def search_faiss(request: FaissSearchRequest) -> FaissSearchResponse:
    """Perform semantic search using the FAISS index."""

    _ensure_faiss_available()

    if not faiss_service.is_ready:
        raise HTTPException(status_code=503, detail="FAISS index is empty. Rebuild it before searching.")

    query_vector = request.query_vector

    if request.query_text:
        try:
            query_vector = generate_embedding(request.query_text, request.model)
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Failed to embed query text for FAISS search: %s", exc, exc_info=True)
            raise HTTPException(status_code=500, detail="An internal error occurred during query text embedding.")

    if not query_vector:
        raise HTTPException(status_code=400, detail="Query vector is required for FAISS search.")

    try:
        results = faiss_service.search(query_vector, top_k=request.top_k)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("FAISS search failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    return FaissSearchResponse(
        results=[FaissSearchResult(**result) for result in results],
        top_k=request.top_k,
        model=request.model,
    )

