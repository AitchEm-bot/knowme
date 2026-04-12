"""
KnowMe — Modal deployment for TRIBE v2 brain encoding.

Deploy:
    modal deploy modal/deploy.py

The deploy command prints the endpoint URL. Paste it into the
KnowMe Chrome extension settings to connect.
"""

from pathlib import Path

import modal

server_path = Path(__file__).parent.parent / "server"

# ---------------------------------------------------------------------------
# Container image — bake all Python deps + server source code
# ---------------------------------------------------------------------------
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libgl1-mesa-glx", "libglib2.0-0", "git")
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
    .run_commands(
        "python -c \"import mne; mne.datasets.sample.data_path()\"",
        "python -c \"from nilearn.datasets import fetch_surf_fsaverage; fetch_surf_fsaverage('fsaverage5')\"",
    )
    .add_local_dir(server_path, remote_path="/root/server")
)

# Persistent volume to cache TRIBE v2 model weights (~15 GB) across restarts
volume = modal.Volume.from_name("knowme-model-cache", create_if_missing=True)

app = modal.App("knowme", image=image)


@app.function(
    gpu="A100",
    volumes={"/cache": volume},
    secrets=[modal.Secret.from_name("huggingface")],
    scaledown_window=300,        # keep warm for 5 min after last request
    timeout=600,                 # allow up to 10 min per request (first-run model download)
    max_containers=1,            # only one A100 container at a time
)
@modal.concurrent(max_inputs=10)
@modal.asgi_app()
def serve():
    """Serve the KnowMe FastAPI app on a Modal A100 GPU."""
    import os
    import sys

    # Point all data/model downloads at the persistent volume
    os.environ["KNOWME_CACHE_DIR"] = "/cache"
    os.environ["HF_HOME"] = "/cache/huggingface"

    # Limit DataLoader workers to available CPUs (TRIBE v2 defaults to 20)
    import multiprocessing
    os.environ["KNOWME_NUM_WORKERS"] = str(min(multiprocessing.cpu_count(), 16))
    os.makedirs("/cache/huggingface", exist_ok=True)
    os.makedirs("/cache/nilearn", exist_ok=True)
    os.makedirs("/cache/mne", exist_ok=True)
    os.environ["NILEARN_DATA"] = "/cache/nilearn"
    os.environ["MNE_DATA"] = "/cache/mne"

    # Make the server package importable
    sys.path.insert(0, "/root/server")

    from app.main import app as fastapi_app

    return fastapi_app
