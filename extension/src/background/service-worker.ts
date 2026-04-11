import type { Message } from '../lib/messages';
import type {
  InstagramPost,
  ServerStatus,
  BrainAnalysisResponse,
  BrainMeshData,
} from '../lib/types';

const API_BASE = 'http://localhost:8000';
const STATUS_POLL_INTERVAL = 30_000; // 30 seconds

let serverAvailable = false;
let sidePanelPort: chrome.runtime.Port | null = null;
let analysisQueue: InstagramPost | null = null;
let analyzing = false;

// --- Server health polling ---

async function checkServerStatus(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/status`, { signal: AbortSignal.timeout(5000) });
    const status: ServerStatus = await res.json();
    serverAvailable = status.model_loaded;
    broadcastToSidePanel({
      type: 'SERVER_STATUS',
      payload: status,
    });
  } catch {
    serverAvailable = false;
    broadcastToSidePanel({
      type: 'SERVER_STATUS',
      payload: {
        status: 'error',
        model_loaded: false,
        gpu_available: false,
        gpu_name: null,
      },
    });
  }
}

// Poll on startup and periodically
checkServerStatus();
setInterval(checkServerStatus, STATUS_POLL_INTERVAL);

// --- Side panel connection ---

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    sidePanelPort = port;
    port.onDisconnect.addListener(() => {
      sidePanelPort = null;
    });

    // Handle messages from side panel
    port.onMessage.addListener(async (message: Message) => {
      if (message.type === 'GET_BRAIN_MESH') {
        const meshData = await fetchBrainMesh();
        if (meshData) {
          port.postMessage({
            type: 'BRAIN_MESH_RESPONSE',
            payload: meshData,
          });
        }
      }
    });

    // Send current server status immediately
    checkServerStatus();
  }
});

// --- Message handling from content script ---

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, _sendResponse) => {
    if (message.type === 'POST_DETECTED') {
      // Forward to side panel
      broadcastToSidePanel({
        type: 'ANALYSIS_LOADING',
        payload: { postId: message.payload.postId, post: message.payload },
      });

      // Queue analysis
      if (serverAvailable) {
        analyzePost(message.payload);
      }
    }
    return false;
  }
);

// --- Analysis ---

async function analyzePost(post: InstagramPost): Promise<void> {
  if (analyzing) {
    // Queue the latest request, dropping older queued ones
    analysisQueue = post;
    return;
  }

  analyzing = true;

  try {
    const body = {
      post_id: post.postId,
      image_base64: post.mediaType === 'image' || post.mediaType === 'carousel'
        ? post.mediaSrc
        : null,
      video_base64: post.mediaType === 'video' ? post.mediaSrc : null,
      caption: post.caption,
      media_type: post.mediaType,
    };

    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server returned ${res.status}: ${errorText}`);
    }

    const result: BrainAnalysisResponse = await res.json();

    broadcastToSidePanel({
      type: 'ANALYSIS_RESULT',
      payload: { ...result, post },
    });
  } catch (error) {
    broadcastToSidePanel({
      type: 'ANALYSIS_ERROR',
      payload: { postId: post.postId, error: String(error) },
    });
  } finally {
    analyzing = false;

    // Process queued request
    if (analysisQueue) {
      const next = analysisQueue;
      analysisQueue = null;
      analyzePost(next);
    }
  }
}

// --- Brain mesh fetch ---

async function fetchBrainMesh(): Promise<BrainMeshData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/brain-mesh`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// --- Utility ---

function broadcastToSidePanel(message: Message): void {
  sidePanelPort?.postMessage(message);
}

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
