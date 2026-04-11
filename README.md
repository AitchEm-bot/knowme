# KnowMe

A Chrome extension that visualizes predicted brain responses to your Instagram feed using Meta's [TRIBE v2](https://github.com/facebookresearch/tribev2) (TRImodal Brain Encoder).

KnowMe scans your feed, predicts which brain regions would activate in response to each post, and renders the results on an interactive 3D brain in the browser's side panel. The goal is to make the invisible emotional engineering of social media visible.

## How It Works

1. **Content script** detects the currently visible Instagram post and captures media
2. **Background worker** sends the content to a local Python server
3. **TRIBE v2** predicts whole-brain fMRI activation (~20,484 cortical vertices)
4. **Brain mapper** translates vertex activations to named regions (HCP Glasser atlas)
5. **Three.js renderer** lights up the anatomical brain mesh in the side panel

## Requirements

- **Chrome** (Manifest V3)
- **Python 3.11+**
- **NVIDIA GPU** — A100 or H100 recommended (TRIBE v2 requires significant VRAM)
- **~15GB disk** for model weights (downloaded on first run)

## Setup

### 1. Install the extension

```bash
cd extension
npm install
npm run build
```

Load `extension/dist` as an unpacked extension in Chrome:
1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" and select the `extension/dist` folder

### 2. Start the server

```bash
cd server
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The first run downloads TRIBE v2 model weights (~15GB). Subsequent starts are faster.

### 3. Use it

1. Open Instagram in Chrome
2. Click the KnowMe extension icon to open the side panel
3. Scroll your feed — posts are analyzed automatically
4. Hover over the brain to see region names and activation levels

## Architecture

```
Instagram Tab                Chrome Extension                 Local Server
+-----------------+    +-------------------------+    +-------------------+
| Content Script  |--->| Background Service      |--->| FastAPI           |
| - Detect posts  |    | Worker                  |    | - TRIBE v2 model  |
| - Extract media |    | - Route messages        |    | - Brain atlas map |
| - Capture as    |    | - Poll server health    |    | - Mesh export     |
|   base64        |    | - Queue analysis        |    +-------------------+
+-----------------+    +----------||--------------+
                       +----------||--+
                       | Side Panel   |
                       | - Three.js   |
                       |   brain viz  |
                       | - Analysis   |
                       | - History    |
                       +-------------+
```

## Privacy

- All data stays local. Media is only sent to `localhost`.
- Analysis history is stored in IndexedDB (browser-local).
- No telemetry, analytics, or cloud services.

## Brain Regions

KnowMe maps TRIBE v2 predictions to cognitive categories:

| Category | Brain Areas | What It Means |
|----------|-------------|---------------|
| Visual Processing | V1-V4, MT, MST | Low-level visual feature processing |
| Face Recognition | FFC, VVC | Fusiform face area activation |
| Scene Processing | PHA, VMV | Place and environment recognition |
| Social Cognition | TPJ (TPOJ1-3) | Theory of mind, social understanding |
| Reward & Motivation | OFC, pOFC | Reward evaluation, dopamine pathways |
| Language & Semantics | BA44/45, STS | Language comprehension |
| Attention | FEF, IPS | Focus and spatial awareness |
| Memory | Hippocampus, EC | Memory encoding |
| Emotional Regulation | ACC (a24, p24) | Emotion modulation |

## Tech Stack

- **Extension**: TypeScript, Vite, Three.js, Manifest V3
- **Server**: Python, FastAPI, TRIBE v2 (PyTorch), nilearn, nibabel
- **Storage**: IndexedDB (via idb)

## License

CC BY-NC 4.0 — matching the TRIBE v2 model license. Non-commercial use only.

## Credits

- [TRIBE v2](https://github.com/facebookresearch/tribev2) by Meta FAIR
- [HCP Glasser Atlas](https://doi.org/10.1038/nature18933) for brain parcellation
- [fsaverage5](https://surfer.nmr.mgh.harvard.edu/) cortical surface mesh
