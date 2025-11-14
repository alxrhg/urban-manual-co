"""Embedding API endpoints for generating vector embeddings."""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Optional, List
import os

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

router = APIRouter()

# Initialize OpenAI client
openai_client = None
if OpenAI and os.getenv('OPENAI_API_KEY'):
    openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# API Key for authentication (optional)
API_KEY = os.getenv('ML_SERVICE_API_KEY')

class TextEmbeddingRequest(BaseModel):
    """Request model for text embedding."""
    text: str = Field(..., description="Text to generate embedding for")
    model: Optional[str] = Field(
        default="text-embedding-3-small",
        description="Embedding model to use"
    )

class DestinationEmbeddingRequest(BaseModel):
    """Request model for destination embedding."""
    name: str = Field(..., description="Destination name")
    city: str = Field(..., description="City name")
    category: Optional[str] = Field(None, description="Category")
    description: Optional[str] = Field(None, description="Description")
    tags: Optional[List[str]] = Field(None, description="Tags")
    ai_description: Optional[str] = Field(None, description="AI-generated description")
    model: Optional[str] = Field(
        default="text-embedding-3-small",
        description="Embedding model to use"
    )

class EmbeddingResponse(BaseModel):
    """Response model for embeddings."""
    embedding: List[float] = Field(..., description="Vector embedding")
    model: str = Field(..., description="Model used for embedding")
    dimension: int = Field(..., description="Dimension of the embedding")

def verify_api_key(x_api_key: Optional[str] = Header(None)) -> bool:
    """Verify API key if configured."""
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True

def generate_embedding(text: str, model: str = "text-embedding-3-small") -> List[float]:
    """Generate embedding using OpenAI."""
    if not openai_client:
        raise HTTPException(
            status_code=500,
            detail="OpenAI client not initialized. Please set OPENAI_API_KEY."
        )
    
    try:
        response = openai_client.embeddings.create(
            model=model,
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate embedding: {str(e)}"
        )

@router.post("/embed/text", response_model=EmbeddingResponse)
async def embed_text(
    request: TextEmbeddingRequest,
    authenticated: bool = verify_api_key
) -> EmbeddingResponse:
    """
    Generate embedding for arbitrary text.
    
    This endpoint generates a vector embedding for any text input,
    useful for query embeddings in semantic search.
    """
    embedding = generate_embedding(request.text, request.model)
    
    return EmbeddingResponse(
        embedding=embedding,
        model=request.model,
        dimension=len(embedding)
    )

@router.post("/embed/destination", response_model=EmbeddingResponse)
async def embed_destination(
    request: DestinationEmbeddingRequest,
    authenticated: bool = verify_api_key
) -> EmbeddingResponse:
    """
    Generate embedding for a destination document.
    
    This endpoint generates a vector embedding for a destination by
    combining its various attributes (name, city, category, description, tags).
    """
    # Construct text from destination fields
    text_parts = [
        request.name,
        request.city,
    ]
    
    if request.category:
        text_parts.append(request.category)
    
    if request.ai_description:
        text_parts.append(request.ai_description)
    elif request.description:
        text_parts.append(request.description)
    
    if request.tags:
        text_parts.extend(request.tags)
    
    # Join with periods to create a coherent text
    text = '. '.join(filter(None, text_parts))
    
    embedding = generate_embedding(text, request.model)
    
    return EmbeddingResponse(
        embedding=embedding,
        model=request.model,
        dimension=len(embedding)
    )

@router.get("/embed/status")
async def embedding_status():
    """Check embedding service status."""
    return {
        "status": "operational" if openai_client else "not configured",
        "openai_configured": openai_client is not None,
        "api_key_required": API_KEY is not None,
        "default_model": "text-embedding-3-small",
        "dimension": 1536
    }
