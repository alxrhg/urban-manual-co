"""
Urban Manual Intelligence - Modal Application

Algorithm-first ML platform for travel intelligence.
Designed to evolve and improve over time.
"""

import modal

# Create the Modal app
app = modal.App("urban-manual-intelligence")

# Base image with common dependencies
base_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        # Core ML
        "numpy>=1.24.0",
        "pandas>=2.0.0",
        "scikit-learn>=1.3.0",
        "scipy>=1.11.0",

        # Deep Learning
        "torch>=2.1.0",
        "sentence-transformers>=2.2.0",

        # Time Series
        "prophet>=1.1.4",

        # Recommendations
        "lightfm>=1.17",

        # Database
        "supabase>=2.0.0",
        "psycopg2-binary>=2.9.0",

        # Utils
        "python-dotenv>=1.0.0",
        "pydantic>=2.0.0",
    )
)

# GPU image for embedding generation
gpu_image = base_image.pip_install(
    "faiss-gpu>=1.7.0",
)

# Volume for model artifacts
model_volume = modal.Volume.from_name("urban-manual-models", create_if_missing=True)

# Secrets
secrets = modal.Secret.from_name("urban-manual-secrets")
