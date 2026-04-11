import type { Message } from '../lib/messages';
import type {
  InstagramPost,
  ServerStatus,
  BrainAnalysisResponse,
  BrainMeshData,
} from '../lib/types';

const DEFAULT_SERVER_URL = 'http://localhost:8000';

let apiBase = DEFAULT_SERVER_URL;
let serverAvailable = false;
let sidePanelPort: chrome.runtime.Port | null = null;
let analysisQueue: InstagramPost | null = null;
let analyzing = false;

// --- Settings ---

async function loadSettings(): Promise<void> {
  const { serverUrl } = await chrome.storage.sync.get({ serverUrl: DEFAULT_SERVER_URL });
  apiBase = serverUrl.replace(/\/+$/, ''); // strip trailing slashes
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.serverUrl) {
    apiBase = (changes.serverUrl.newValue || DEFAULT_SERVER_URL).replace(/\/+$/, '');
    serverAvailable = false;
    checkServerStatus();
  }
});

// --- Server status check (on-demand, retries on failure) ---

let statusRetryTimer: ReturnType<typeof setTimeout> | null = null;

async function checkServerStatus(retries = 5): Promise<void> {
  // Clear any pending retry
  if (statusRetryTimer) {
    clearTimeout(statusRetryTimer);
    statusRetryTimer = null;
  }

  try {
    const res = await fetch(`${apiBase}/api/status`, { signal: AbortSignal.timeout(30_000) });
    const status: ServerStatus = await res.json();
    serverAvailable = status.model_loaded;
    broadcastToSidePanel({
      type: 'SERVER_STATUS',
      payload: status,
    });

    // If model is still loading, keep retrying
    if (!status.model_loaded && retries > 0) {
      console.log('[KnowMe:SW] Model still loading, retrying in 10s...');
      statusRetryTimer = setTimeout(() => checkServerStatus(retries - 1), 10_000);
    }
  } catch {
    broadcastToSidePanel({
      type: 'SERVER_STATUS',
      payload: {
        status: 'error',
        model_loaded: false,
        gpu_available: false,
        gpu_name: null,
      },
    });

    // Server unreachable — retry with backoff (cold start can take 1-2 min)
    if (retries > 0) {
      const delay = retries > 3 ? 10_000 : 20_000;
      console.log(`[KnowMe:SW] Server unreachable, retrying in ${delay / 1000}s (${retries} left)...`);
      statusRetryTimer = setTimeout(() => checkServerStatus(retries - 1), delay);
    }
  }
}

// Initialize settings — keep the promise so analyzePost can await it
const settingsReady = loadSettings();

// --- Side panel connection ---

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    sidePanelPort = port;
    port.onDisconnect.addListener(() => {
      sidePanelPort = null;
    });

    port.onMessage.addListener(async (message: Message) => {
      if (message.type === 'CHECK_STATUS') {
        checkServerStatus();
      } else if (message.type === 'GET_BRAIN_MESH') {
        const meshData = await fetchBrainMesh();
        if (meshData) {
          port.postMessage({
            type: 'BRAIN_MESH_RESPONSE',
            payload: meshData,
          });
        }
      }
    });

    checkServerStatus();
  }
});

// --- Message handling from content script ---

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === 'POST_DETECTED') {
      const post = message.payload;
      const hasMedia = post.mediaUrl || post.mediaSrc;
      const hasCaption = post.caption;

      if (!hasMedia && !hasCaption) {
        console.warn('[KnowMe] Skipping post with no media or caption:', post.postId);
        return false;
      }

      console.log('[KnowMe:SW] POST_DETECTED received:', post.postId, '| port alive:', !!sidePanelPort);

      broadcastToSidePanel({
        type: 'ANALYSIS_LOADING',
        payload: { postId: post.postId, post },
      });

      // Return true to keep service worker alive until analysis completes.
      // Chrome MV3 kills the SW 30s after event handlers return —
      // this keeps the message channel (and the worker) alive.
      analyzePost(post).then(() => sendResponse({ done: true }));
      return true;
    }
    return false;
  }
);

// --- Analysis ---

async function analyzePost(post: InstagramPost): Promise<void> {
  if (analyzing) {
    analysisQueue = post;
    return;
  }

  analyzing = true;
  console.log('[KnowMe:SW] analyzePost starting for:', post.postId, '| apiBase:', apiBase);

  try {
    // Ensure settings (serverUrl) are loaded before fetching — critical after SW restart
    await settingsReady;
    console.log('[KnowMe:SW] Settings loaded, apiBase:', apiBase);

    const isImage = post.mediaType === 'image' || post.mediaType === 'carousel';
    const isVideo = post.mediaType === 'video';

    const body = {
      post_id: post.postId,
      image_url: isImage && post.mediaUrl ? post.mediaUrl : null,
      video_url: isVideo && post.mediaUrl ? post.mediaUrl : null,
      image_base64: isImage && post.mediaSrc ? post.mediaSrc : null,
      video_base64: isVideo && post.mediaSrc ? post.mediaSrc : null,
      caption: post.caption || null,
      media_type: post.mediaType,
    };

    const res = await fetch(`${apiBase}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300_000), // 5 min max per analysis
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server returned ${res.status}: ${errorText}`);
    }

    const result: BrainAnalysisResponse = await res.json();

    // Server responded — confirm it's available
    serverAvailable = true;

    const payload = { ...result, post };
    console.log('[KnowMe:SW] Analysis SUCCESS for:', post.postId, '| port alive:', !!sidePanelPort);

    broadcastToSidePanel({
      type: 'ANALYSIS_RESULT',
      payload,
    });

    // Fallback: persist to storage so the side panel can pick it up even if the port is dead
    chrome.storage.local.set({ lastResult: { type: 'ANALYSIS_RESULT', payload, ts: Date.now() } });
    console.log('[KnowMe:SW] Wrote result to storage fallback');
  } catch (error) {
    console.error('[KnowMe:SW] Analysis FAILED for:', post.postId, error);
    const errorPayload = { postId: post.postId, error: String(error) };

    broadcastToSidePanel({
      type: 'ANALYSIS_ERROR',
      payload: errorPayload,
    });

    chrome.storage.local.set({ lastResult: { type: 'ANALYSIS_ERROR', payload: errorPayload, ts: Date.now() } });
  } finally {
    analyzing = false;

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
    const res = await fetch(`${apiBase}/api/brain-mesh`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// --- Utility ---

function broadcastToSidePanel(message: Message): void {
  if (!sidePanelPort) {
    console.warn('[KnowMe:SW] broadcastToSidePanel: port is NULL, msg type:', message.type);
    return;
  }
  try {
    sidePanelPort.postMessage(message);
    console.log('[KnowMe:SW] broadcastToSidePanel sent:', message.type);
  } catch (err) {
    console.warn('[KnowMe:SW] broadcastToSidePanel FAILED:', message.type, err);
    sidePanelPort = null;
  }
}

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
