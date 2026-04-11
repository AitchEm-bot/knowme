"""
KnowMe — Modal deployment for TRIBE v2 brain encoding.

Deploy:
    modal deploy modal/app.py

The deploy command prints the endpoint URL. Paste it into the
KnowMe Chrome extension settings to connect.
"""

from pathlib import Path

import modal

# ---------------------------------------------------------------------------
# Container image — bake all Python deps so cold starts only load model weights
# ---------------------------------------------------------------------------
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "fastapi>=0.115.0",
        "tribev2 @ git+https://github.com/facebookresearch/tribev2.git",
        "torch>=2.5.1,<2.7",
        "nilearn>=0.11.0",
        "nibabel>=5.0",
        "numpy>=1.26",
        "pydantic>=2.0",
        "Pillow>=10.0",
        "moviepy>=1.0",
        "httpx>=0.27",
    )
)

# Persistent volume to cache TRIBE v2 model weights (~15 GB) across restarts
volume = modal.Volume.from_name("knowme-model-cache", create_if_missing=True)

app = modal.App("knowme", image=image)

# Mount the server/ source tree into the container
server_path = Path(__file__).parent.parent / "server"


@app.function(
    gpu="A100",
    volumes={"/cache": volume},
    mounts=[modal.Mount.from_local_dir(server_path, remote_path="/root/server")],
    container_idle_timeout=300,  # keep warm for 5 min after last request
    timeout=600,                 # allow up to 10 min per request (first-run model download)
)
@modal.asgi_app()
def serve():
    """Serve the KnowMe FastAPI app on a Modal A100 GPU."""
    import os
    import sys

    # Point the server at the Modal volume for model weight caching
    os.environ["KNOWME_CACHE_DIR"] = "/cache"

    # Make the mounted server package importable
    sys.path.insert(0, "/root/server")

    from app.main import app as fastapi_app

    return fastapi_app
