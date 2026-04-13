# KnowMe

A Chrome extension that visualizes predicted brain responses to your Instagram feed using Meta's [TRIBE v2](https://github.com/facebookresearch/tribev2) (TRImodal Brain Encoder).

KnowMe scans your feed, predicts which brain regions would activate in response to each post, and renders the results on an interactive 3D brain in the browser's side panel. It also predicts emotional responses derived from brain activation patterns using neuroscience-informed heuristics mapped to the [Feelings Wheel](https://feelingswheel.com/) taxonomy (60 emotions across 7 families). The goal is to make the invisible emotional engineering of social media visible.

## How It Works

1. **Content script** detects the currently visible Instagram post and captures media
2. **Background worker** sends the content to the inference server (local or cloud)
3. **TRIBE v2** predicts whole-brain fMRI activation (~20,484 cortical vertices)
4. **Brain mapper** translates vertex activations to named regions (HCP Glasser atlas) and derives emotion scores
5. **Three.js renderer** lights up the anatomical brain mesh in the side panel
6. **Analysis panel** displays cognitive engagement scores, predicted emotional responses, and top activated brain regions with interactive highlighting

## Requirements

- **Chrome** (Manifest V3)
- **Node.js 18+** and **npm** (to build the extension)
- **Python 3.11+** (for the server)
- **NVIDIA GPU** with CUDA support — A100 recommended (TRIBE v2 requires significant VRAM)
- **~15 GB disk** for model weights (downloaded on first run)
- **HuggingFace account** with access to [meta-llama/Llama-3.2-3B](https://huggingface.co/meta-llama/Llama-3.2-3B) (gated model, free access after license agreement)
- **ffmpeg** installed and on PATH

## Setup

The extension is the same regardless of where the inference server runs. Do Part 1 and Part 2 once, then pick **one** backend in Part 3, then wire them together in Part 4.

### Part 1 — Build the extension (always required)

From the repo root:

```bash
cd extension
npm install
npm run build
```

This writes the built extension to `extension/dist/`.

### Part 2 — Load the extension in Chrome (always required)

1. Open Chrome and navigate to `chrome://extensions`
2. Toggle **Developer mode** on (top-right corner of that page)
3. Click **Load unpacked** (top-left)
4. In the file picker, select the `extension/dist` folder (not `extension/` — it must be `dist`)
5. The extension card for **KnowMe** now appears. Note its extension ID (not required, just useful for debugging).
6. Click the puzzle-piece icon in the Chrome toolbar → click the pin icon next to **KnowMe** so it's always visible.
7. Click the pinned KnowMe icon — the side panel opens on the right. The status badge at the top will say **Disconnected** until Part 4 is done. This is expected.

### Part 3 — Start a backend (pick ONE of A / B / C)

#### Option A — Local GPU server (requires NVIDIA GPU, ~15 GB disk)

A1. Get HuggingFace access to Meta Llama-3.2-3B:
   1. Sign up at [huggingface.co/join](https://huggingface.co/join) if you don't have an account.
   2. Visit [meta-llama/Llama-3.2-3B](https://huggingface.co/meta-llama/Llama-3.2-3B) and click **Agree and access repository** (free, instant).
   3. Create a token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) with **Read** permission. Copy it (starts with `hf_`).

A2. Export the token in the terminal you'll run the server from:
   ```bash
   export HF_TOKEN=hf_your_token_here      # Linux/macOS
   set HF_TOKEN=hf_your_token_here         # Windows CMD
   $env:HF_TOKEN = "hf_your_token_here"    # Windows PowerShell
   ```

A3. Create and activate a Python venv, then install deps:
   ```bash
   cd server
   python -m venv .venv
   source .venv/bin/activate        # Linux/macOS
   .venv\Scripts\activate           # Windows

   pip install -r requirements.txt
   ```
   If pip errors on `torch`, install a CUDA build first from [pytorch.org](https://pytorch.org/get-started/locally/) and re-run the command above.

A4. Make sure `ffmpeg` is on PATH (`ffmpeg -version` should print a version).

A5. Start the server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   First run downloads ~15 GB of weights + atlas data; leave it running until you see `Uvicorn running on http://0.0.0.0:8000`.

→ Your server URL for Part 4 is **`http://localhost:8000`**.

#### Option B — Modal cloud (no local GPU)

B1. Complete step A1 above to get an HF token (required; TRIBE v2 pulls Llama-3.2-3B on Modal too).

B2. Install Modal and authenticate:
   ```bash
   pip install modal
   modal setup
   ```
   `modal setup` opens a browser for login — finish it.

B3. Store the HF token as a Modal secret (name must be exactly `huggingface`):
   ```bash
   modal secret create huggingface HF_TOKEN=hf_your_token_here
   ```

B4. Deploy (run from the repo root):
   ```bash
   modal deploy modal/deploy.py
   ```
   Modal prints a URL like `https://<your-username>--knowme-serve.modal.run`. Copy it — this is your server URL.

→ Your server URL for Part 4 is the **Modal URL** you just copied.

> **Cost:** A100 billed per second, 5-minute keepalive (`scaledown_window=300`), scales to $0 when idle. Expect ~$0.03–0.05 per cold-start request, less when warm.

#### Option C — Mock server (no GPU, random data, for UI work only)

C1. From the repo root:
   ```bash
   cd server
   pip install fastapi uvicorn pydantic
   python mock_server.py
   ```

Brain activations are random — do not draw conclusions from them. Only useful for working on the extension UI.

→ Your server URL for Part 4 is **`http://localhost:8000`**.

### Part 4 — Point the extension at your server (always required)

1. Click the pinned KnowMe icon to open the side panel.
2. At the top of the panel there is a connection-status pill (says **Disconnected** right now). **Click it** — a Server Settings overlay slides in.
3. In the **Server URL** field, paste the URL from Part 3:
   - Option A or C: `http://localhost:8000`
   - Option B: the `https://…modal.run` URL
4. Click **Save**. The overlay closes.
5. Within a few seconds the status pill flips to **Connected**. If it doesn't, open DevTools on the side panel (right-click → Inspect) and check the console — most commonly the server isn't running yet, or (Option A) the port is firewalled.

You're done — go to [Usage](#usage).

## Usage

1. Open Instagram in Chrome (`https://www.instagram.com`)
2. Click the KnowMe extension icon to open the side panel
3. Scroll your feed — the currently visible post is analyzed automatically
4. **Hover** over the 3D brain to see region names and activation levels
5. **Click** any emotion bar, engagement bar, or brain region in the analysis panel to highlight the corresponding brain area with rotation and color
6. **Scroll** the analysis panel or click away to clear the highlight
7. Switch to the **History** tab to review past analyses

## Architecture

```
Instagram Tab               Chrome Extension                 Inference Server
+------------------+    +--------------------------+    +--------------------+
| Content Script   |--->| Background Service       |--->| FastAPI            |
| - Detect posts   |    | Worker                   |    | - TRIBE v2 model   |
| - Extract media  |    | - Route messages         |    | - Brain atlas map  |
| - Capture frames |    | - Poll server health     |    | - Emotion scoring  |
+------------------+    | - Queue analysis         |    +--------------------+
                        +----------||--------------+
                        +----------||--+
                        | Side Panel   |
                        | - Three.js   |
                        |   brain viz  |
                        | - Emotions   |
                        | - Analysis   |
                        | - History    |
                        +--------------+
```

### Key Files

| Path | Purpose |
|------|---------|
| `extension/src/content/extractor.ts` | Extracts post data from Instagram DOM |
| `extension/src/content/media-capture.ts` | Captures images (srcset) and video frames |
| `extension/src/background/service-worker.ts` | Routes messages, manages server connection |
| `extension/src/sidepanel/brain-renderer.ts` | Three.js brain visualization with per-vertex coloring |
| `extension/src/sidepanel/analysis-panel.ts` | Engagement bars, emotion bars, region list |
| `extension/src/sidepanel/main.ts` | Wires everything together, handles interaction |
| `server/app/tribe_runner.py` | TRIBE v2 model loading and inference |
| `server/app/brain_mapper.py` | HCP Glasser atlas mapping, engagement/emotion scoring |
| `server/app/main.py` | FastAPI endpoints |
| `modal/deploy.py` | Modal serverless GPU deployment |

## Known Limitations

### Media Capture

- **Video/Reels**: Instagram serves video content via `blob:` URLs, which cannot be accessed from a content script. KnowMe falls back to capturing a **single video frame as a JPEG** and converting it to a 4-second still video. This means video analysis only uses the visual content of one frame — **audio, speech, music, and motion are lost**.
- **Carousels**: Only the currently visible slide is captured.
- **Stories**: Not supported (different DOM structure).
- **DMs and Explore pages**: Not supported.

### TRIBE v2 Model

- TRIBE v2 was designed for **naturalistic, long-form stimuli** (movies, TV shows, podcasts). It expects full video files with audio and processes three modalities: visual frames, audio/speech, and text. Instagram posts are inherently short-form and static, so the model is operating outside its intended domain.
- The text extractor requires **Meta Llama-3.2-3B** (gated model). If HuggingFace access is not configured, text/caption processing will fail with a 500 error. Visual-only analysis still works.
- Caption text processing uses TTS (text-to-speech) to synthesize audio from the caption, then runs it through the audio pipeline. This adds ~1-2 minutes of processing time and downloads a ~400 MB spaCy model on first use.
- **Cold starts** take 30-60 seconds (model loading). Subsequent requests on a warm server take 10-30 seconds.

### Emotion Predictions

- Emotion scores are **not predicted by the TRIBE v2 model directly**. They are derived from engagement scores using neuroscience-informed heuristic weights (weighted combinations of the 10 cognitive categories). These are approximations, not ground-truth measurements.
- The 60-emotion mapping is based on the Feelings Wheel taxonomy. While the category weights are informed by neuroscience literature, they have not been validated against fMRI data for emotional responses specifically.

### Brain Visualization

- Brain regions are assigned per-vertex using the HCP Glasser atlas on the fsaverage5 mesh (~20,484 vertices). The 3D brain model is a separate `.glb` mesh with regions assigned by approximate spatial mapping, not precise atlas registration. Region boundaries are approximate.
- Interactive highlighting operates at the **category level** (e.g., "Memory Encoding"), not individual sub-regions (e.g., "Hippocampus" specifically). All vertices in a category light up together.

### General

- All predictions are **in-silico estimates**, not real brain measurements. They represent what TRIBE v2 predicts an average brain would do, not any individual's actual neural response.
- The extension only works on `instagram.com` in Chrome.
- Analysis history is stored in IndexedDB (browser-local) and is lost if browser data is cleared.

## Privacy

- Media is sent only to your configured server (localhost or your own Modal deployment).
- No data is sent to third parties. No telemetry, analytics, or tracking.
- Analysis history is stored in IndexedDB (browser-local only).
- When using Modal, media transits through Modal's infrastructure. Review [Modal's privacy policy](https://modal.com/privacy) if this is a concern.

## Brain Regions

KnowMe maps TRIBE v2's ~20,484 vertex predictions to 10 cognitive categories using the HCP Glasser atlas:

| Category | Brain Areas | Description |
|----------|-------------|-------------|
| Visual Processing | V1-V4, V6, V7, V8, MT, MST, LO1-3 | Primary and secondary visual cortex |
| Face Recognition | FFC, VVC, PIT, TE2p | Fusiform face area and ventral stream |
| Scene & Place Processing | PHA1-3, VMV1-3 | Parahippocampal place area |
| Social & Emotional Processing | TPOJ1-3, STV, STS | Temporoparietal junction, theory of mind |
| Reward & Motivation | OFC, pOFC, 10v, 10r | Orbitofrontal reward evaluation |
| Language & Semantics | BA44/45, IFS, STS, PSL | Broca's area, language comprehension |
| Attention & Spatial Awareness | FEF, PEF, IPS, LIP, VIP | Frontoparietal attention networks |
| Memory Encoding | EC, PreS, H, ProS, PeEc | Hippocampal and parahippocampal regions |
| Emotional Regulation | a24, p24, a32pr, d32, s32 | Anterior cingulate cortex |
| Body & Motion Processing | MT, MST, FST, PH | Biological motion processing |

## Emotion Taxonomy

Predicted emotions are organized by Feelings Wheel families:

| Family | Emotions |
|--------|----------|
| Happy | Happy, Joy, Playful, Content, Curiosity, Proud, Care, Gratitude, Inspiration, Arousal, Confident, Powerful, Creative, Trust, Tenderness |
| Surprise | Surprise, Excitement, Confusion, Shock, Eager, Awe |
| Bad | Stressed, Apathy, Overwhelmed, Boredom, Helpless |
| Afraid | Afraid, Anxious, Insecure, Mistrust, Worry, Empty, Embarrassment |
| Angry | Angry, Jealous, Irritation, Frustration, Bitter, Shame, Withdrawn, Numb |
| Disgust | Disgust, Disdain, Horror |
| Sad | Sad, Lonely, Vulnerable, Guilty, Depression, Hurt, Disappointment, Longing, Grief, Regret |

Plus extra emotions not on the standard wheel: Empathy, Nostalgia, Desire, Calm, Melancholy, Humor.

## Citation

If you use KnowMe in academic work, please cite both this project and the underlying model:

```bibtex
@software{knowme2026,
  title     = {KnowMe: Visualizing Predicted Brain Responses to Social Media},
  author    = {Moustafa, Hani},
  year      = {2026},
  url       = {https://github.com/AitchEm-bot/knowme},
  note      = {Chrome extension using TRIBE v2 for Instagram brain activation visualization}
}
```

You **must** also cite TRIBE v2, as KnowMe depends on it for all brain activation predictions:

```bibtex
@article{le2024tribe,
  title     = {A Trimodal Foundation Model to Predict Brain Responses},
  author    = {Le, Phong and Duquenne, Paul-Ambroise and Schwartz, Gabrielle and King, Jean-R{\'e}mi},
  journal   = {arXiv preprint arXiv:2406.17526},
  year      = {2024},
  url       = {https://github.com/facebookresearch/tribev2}
}
```

If your work involves the brain atlas parcellation, cite the HCP Glasser atlas:

```bibtex
@article{glasser2016multi,
  title     = {A multi-modal parcellation of human cerebral cortex},
  author    = {Glasser, Matthew F and Coalson, Timothy S and Robinson, Emma C and others},
  journal   = {Nature},
  volume    = {536},
  pages     = {171--178},
  year      = {2016},
  doi       = {10.1038/nature18933}
}
```

## Tech Stack

- **Extension**: TypeScript, Vite, Three.js, Chrome Manifest V3, IndexedDB
- **Server**: Python, FastAPI, TRIBE v2 (PyTorch), nilearn, nibabel
- **Deployment**: Modal (serverless GPU), or local with uvicorn
- **Brain data**: HCP Glasser atlas, fsaverage5 cortical surface mesh

## License

CC BY-NC 4.0 — matching the TRIBE v2 model license. Non-commercial use only.

See [LICENSE](LICENSE) for full text.

## Credits

- [TRIBE v2](https://github.com/facebookresearch/tribev2) by Meta FAIR (Le et al., 2024)
- [HCP Glasser Atlas](https://doi.org/10.1038/nature18933) for brain parcellation (Glasser et al., 2016)
- [fsaverage5](https://surfer.nmr.mgh.harvard.edu/) cortical surface mesh (FreeSurfer)
- [Feelings Wheel](https://feelingswheel.com/) emotion taxonomy (Gloria Willcox)
- ["Neural Networks of the Brain"](https://skfb.ly/oq8Bs) 3D brain model by Universal Design for Learning, licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
