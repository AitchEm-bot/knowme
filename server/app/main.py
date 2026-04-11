import os
import time
from contextlib import asynccontextmanager

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .brain_mapper import BrainMapper
from .mesh_exporter import MeshExporter
from .schemas import (
    AnalysisRequest,
    BrainAnalysisResponse,
    BrainMeshResponse,
    RegionActivation,
    ServerStatus,
)
from .tribe_runner import TribeRunner

# Global instances — cache dir configurable via env for Modal deployment
cache_dir = os.environ.get("KNOWME_CACHE_DIR", "./cache")
tribe_runner = TribeRunner(cache_dir=cache_dir)
brain_mapper = BrainMapper(mesh="fsaverage5")
mesh_exporter = MeshExporter(mesh="fsaverage5")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model and atlas on startup."""
    print("[KnowMe] Loading TRIBE v2 model...")
    await tribe_runner.load_model()
    print("[KnowMe] Loading brain atlas...")
    brain_mapper.load()
    print("[KnowMe] Loading brain mesh...")
    mesh_exporter.load()
    print("[KnowMe] Server ready.")
    yield


app = FastAPI(
    title="KnowMe API",
    description="Local inference server for TRIBE v2 brain encoding",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/status", response_model=ServerStatus)
async def get_status():
    """Check server health and model status."""
    gpu_available = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if gpu_available else None

    return ServerStatus(
        status="ready" if tribe_runner.is_loaded else "loading",
        model_loaded=tribe_runner.is_loaded,
        gpu_available=gpu_available,
        gpu_name=gpu_name,
    )


@app.post("/api/analyze", response_model=BrainAnalysisResponse)
async def analyze_post(request: AnalysisRequest):
    """Analyze Instagram content and return brain activation predictions."""
    if not tribe_runner.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    start = time.time()

    try:
        vertex_activations = await tribe_runner.analyze(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    # Map to brain regions
    regions_data = brain_mapper.get_region_activations(vertex_activations)
    engagement_scores = brain_mapper.get_engagement_scores(vertex_activations)
    summary = brain_mapper.generate_summary(engagement_scores)

    # Normalize vertex activations to 0-1 for the frontend
    vmin, vmax = vertex_activations.min(), vertex_activations.max()
    if vmax - vmin > 0:
        normalized = ((vertex_activations - vmin) / (vmax - vmin)).tolist()
    else:
        normalized = [0.0] * len(vertex_activations)

    elapsed_ms = int((time.time() - start) * 1000)

    regions = [RegionActivation(**r) for r in regions_data]

    return BrainAnalysisResponse(
        post_id=request.post_id,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        regions=regions,
        vertex_activations=normalized,
        summary=summary,
        engagement_scores=engagement_scores,
        processing_time_ms=elapsed_ms,
    )


@app.get("/api/brain-mesh", response_model=BrainMeshResponse)
async def get_brain_mesh():
    """Return the fsaverage5 cortical surface mesh for Three.js rendering."""
    mesh_data = mesh_exporter.get_mesh_data()
    vertex_region_map = brain_mapper.get_vertex_region_map()

    return BrainMeshResponse(
        vertices=mesh_data["vertices"],
        faces=mesh_data["faces"],
        vertex_region_map=vertex_region_map,
    )
