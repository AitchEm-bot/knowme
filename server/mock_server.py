"""
Mock KnowMe server for local extension testing.
Returns fake brain analysis results instantly — no GPU needed.

Usage:
    cd server
    .venv/Scripts/python mock_server.py
"""

import random
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalysisRequest(BaseModel):
    post_id: str
    image_url: str | None = None
    video_url: str | None = None
    image_base64: str | None = None
    video_base64: str | None = None
    caption: str | None = None
    media_type: str | None = None


def _normalize(scores: dict[str, float]) -> dict[str, float]:
    """Normalize scores to sum to 100% with a 1% floor."""
    total = sum(scores.values())
    if total <= 0:
        n = len(scores)
        return {k: round(1.0 / n, 4) for k in scores}
    normed = {k: max(v / total, 0.01) for k, v in scores.items()}
    new_total = sum(normed.values())
    return {k: round(v / new_total, 4) for k, v in normed.items()}


@app.get("/api/status")
async def status():
    return {
        "status": "ready",
        "model_loaded": True,
        "gpu_available": True,
        "gpu_name": "Mock GPU",
    }


@app.post("/api/analyze")
async def analyze(req: AnalysisRequest):
    n_vertices = 20484
    vertex_activations = [random.random() for _ in range(n_vertices)]

    raw_regions = [
        {"region_name": "L_V1", "full_name": "Primary Visual Cortex", "hemisphere": "left", "activation": random.random(), "category": "visual_processing", "description": "Primary visual cortex"},
        {"region_name": "R_FFC", "full_name": "Fusiform Face Complex", "hemisphere": "right", "activation": random.random(), "category": "face_recognition", "description": "Face processing"},
        {"region_name": "L_TPOJ1", "full_name": "Temporoparietal-Occipital Junction 1", "hemisphere": "left", "activation": random.random(), "category": "social_cognition", "description": "Social cognition"},
        {"region_name": "R_OFC", "full_name": "Orbitofrontal Cortex", "hemisphere": "right", "activation": random.random(), "category": "reward_motivation", "description": "Reward evaluation"},
        {"region_name": "L_H", "full_name": "Hippocampus", "hemisphere": "left", "activation": random.random(), "category": "memory", "description": "Memory formation"},
    ]
    reg_total = sum(r["activation"] for r in raw_regions)
    for r in raw_regions:
        r["activation"] = max(r["activation"] / reg_total, 0.01)
    reg_new_total = sum(r["activation"] for r in raw_regions)
    regions = [
        {**r, "activation": round(r["activation"] / reg_new_total, 4)}
        for r in sorted(raw_regions, key=lambda x: x["activation"], reverse=True)
    ]

    raw_engagement = {
        "Visual Processing": random.uniform(0.3, 0.9),
        "Face Recognition": random.uniform(0.2, 0.8),
        "Scene & Place Processing": random.uniform(0.1, 0.6),
        "Social & Emotional Processing": random.uniform(0.2, 0.7),
        "Reward & Motivation": random.uniform(0.1, 0.6),
        "Language & Semantics": random.uniform(0.1, 0.5),
        "Attention & Spatial Awareness": random.uniform(0.2, 0.7),
        "Memory Encoding": random.uniform(0.1, 0.5),
        "Emotional Regulation": random.uniform(0.1, 0.4),
        "Body & Motion Processing": random.uniform(0.1, 0.5),
    }
    engagement_scores = _normalize(raw_engagement)

    raw_emotions = {
        "Joy": random.uniform(0.3, 0.8),
        "Awe": random.uniform(0.2, 0.7),
        "Curiosity": random.uniform(0.3, 0.7),
        "Excitement": random.uniform(0.2, 0.6),
        "Empathy": random.uniform(0.2, 0.6),
        "Content": random.uniform(0.25, 0.65),
        "Surprise": random.uniform(0.25, 0.55),
        "Gratitude": random.uniform(0.25, 0.6),
        "Inspiration": random.uniform(0.3, 0.7),
        "Calm": random.uniform(0.2, 0.5),
    }
    emotion_scores = _normalize(raw_emotions)

    print(f"[Mock] Analyzed post {req.post_id} | media_type={req.media_type} | has_url={bool(req.image_url or req.video_url)}")

    return {
        "post_id": req.post_id,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "regions": regions,
        "vertex_activations": vertex_activations,
        "summary": "This content engages strong visual processing (72%), moderate face recognition (58%), and mild social cognition (34%).",
        "engagement_scores": engagement_scores,
        "emotion_scores": emotion_scores,
        "processing_time_ms": random.randint(50, 200),
    }


if __name__ == "__main__":
    import uvicorn
    print("[Mock] Starting mock KnowMe server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
