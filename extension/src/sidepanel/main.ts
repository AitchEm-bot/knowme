import type { Message } from '../lib/messages';
import type { BrainAnalysisResult, ServerStatus } from '../lib/types';
import { db } from '../lib/database';
import { BrainRenderer } from './brain-renderer';
import { AnalysisPanel } from './analysis-panel';
import { HistoryPanel } from './history-panel';
import { SetupGuide } from './setup-guide';

const BRAIN_MODEL_URL = chrome.runtime.getURL('assets/brain.glb');

class SidePanelApp {
  private renderer!: BrainRenderer;
  private analysisPanel!: AnalysisPanel;
  private historyPanel!: HistoryPanel;
  private setupGuide!: SetupGuide;
  private port!: chrome.runtime.Port;
  private serverConnected = false;
  private activeTab: 'analysis' | 'history' = 'analysis';
  private currentAnalyzingPostId: string | null = null;
  private lastProcessedResultTs = 0;

  async init(): Promise<void> {
    this.connectPort();
    this.listenForStorageFallback();
    this.startResultPolling();

    this.analysisPanel = new AnalysisPanel(document.getElementById('analysis-panel')!);
    this.historyPanel = new HistoryPanel(document.getElementById('history-panel')!);
    this.setupGuide = new SetupGuide(document.getElementById('analysis-panel')!);

    this.historyPanel.setSelectCallback((result) => this.showAnalysis(result));
    this.setupGuide.setConnectedCallback(() => {
      this.setupGuide.hide();
    });
    this.setupNavTabs();
    this.setupSettingsToggle();

    const container = document.getElementById('brain-container')!;
    this.renderer = new BrainRenderer(container);

    try {
      await this.renderer.loadModel(BRAIN_MODEL_URL);
      const tooltip = document.getElementById('tooltip')!;
      this.renderer.setupHoverDetection(tooltip);
    } catch (err) {
      console.error('[KnowMe] Failed to load brain model:', err);
    }

    this.setupGuide.show();

    const versionTag = document.getElementById('version-tag');
    if (versionTag) {
      versionTag.textContent = `v${chrome.runtime.getManifest().version}`;
    }
  }

  private setupNavTabs(): void {
    const header = document.getElementById('header')!;

    const nav = document.createElement('div');
    nav.className = 'nav-tabs';

    const analysisTab = document.createElement('button');
    analysisTab.className = 'nav-tab active';
    analysisTab.textContent = 'Analysis';
    analysisTab.dataset.tab = 'analysis';

    const historyTab = document.createElement('button');
    historyTab.className = 'nav-tab';
    historyTab.textContent = 'History';
    historyTab.dataset.tab = 'history';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'nav-action-btn';
    refreshBtn.title = 'Clear current analysis';
    refreshBtn.innerHTML = '&#x21bb;';
    refreshBtn.addEventListener('click', () => {
      this.resetAnalysis();
      this.port.postMessage({ type: 'CHECK_STATUS', payload: null });
    });

    nav.append(analysisTab, historyTab, refreshBtn);
    header.after(nav);

    nav.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).dataset.tab;
      if (!tab) return;
      this.switchTab(tab as 'analysis' | 'history');
      this.syncTabUI(tab as 'analysis' | 'history');
    });
  }

  private setupSettingsToggle(): void {
    const statusEl = document.getElementById('server-status')!;
    statusEl.style.cursor = 'pointer';
    statusEl.title = 'Click to change server URL';

    statusEl.addEventListener('click', () => {
      const settingsEl = document.getElementById('settings-overlay')!;
      const isVisible = !settingsEl.classList.contains('hidden');

      if (isVisible) {
        settingsEl.classList.add('hidden');
      } else {
        this.showSettingsOverlay(settingsEl);
      }
    });
  }

  private async showSettingsOverlay(settingsEl: HTMLElement): Promise<void> {
    const { serverUrl } = await chrome.storage.sync.get({ serverUrl: '' });

    settingsEl.innerHTML = `
      <div class="settings-content">
        <div class="settings-header">
          <strong>Server Settings</strong>
          <button id="settings-close" class="settings-close-btn">&times;</button>
        </div>
        <label for="settings-url">Server URL</label>
        <div class="setup-url-row">
          <input id="settings-url" type="url" value="${serverUrl || ''}"
            placeholder="https://your-name--knowme-serve.modal.run" spellcheck="false">
          <button id="settings-save" class="btn-primary">Save</button>
        </div>
      </div>
    `;
    settingsEl.classList.remove('hidden');

    settingsEl.querySelector('#settings-close')?.addEventListener('click', () => {
      settingsEl.classList.add('hidden');
    });

    settingsEl.querySelector('#settings-save')?.addEventListener('click', async () => {
      const input = settingsEl.querySelector('#settings-url') as HTMLInputElement;
      const url = input.value.trim().replace(/\/+$/, '');
      await chrome.storage.sync.set({ serverUrl: url });
      settingsEl.classList.add('hidden');
    });
  }

  private listenForStorageFallback(): void {
    // Listen for new results written by the service worker
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.lastResult) return;
      const msg = changes.lastResult.newValue;
      if (!msg) return;
      console.log('[KnowMe:SP] Storage fallback fired:', msg.type, 'ts:', msg.ts);
      this.handleStorageResult(msg);
    });
  }

  private handleStorageResult(msg: { type: string; payload: unknown; ts: number }): void {
    // Skip if already processed
    if (msg.ts <= this.lastProcessedResultTs) {
      console.log('[KnowMe:SP] Storage result skipped (already processed), ts:', msg.ts);
      return;
    }
    this.lastProcessedResultTs = msg.ts;

    if (msg.type === 'ANALYSIS_RESULT') {
      this.currentAnalyzingPostId = null;
      this.onAnalysisResult(msg.payload as BrainAnalysisResult);
    } else if (msg.type === 'ANALYSIS_ERROR') {
      this.currentAnalyzingPostId = null;
      const err = msg.payload as { error: string };
      this.analysisPanel.showError(err.error);
    }
  }

  private connectPort(): void {
    try {
      this.port = chrome.runtime.connect({ name: 'sidepanel' });
      console.log('[KnowMe:SP] Port connected');
      this.port.onMessage.addListener((msg: Message) => this.handleMessage(msg));
      this.port.onDisconnect.addListener(() => {
        console.warn('[KnowMe:SP] Port disconnected, reconnecting in 1s...');
        setTimeout(() => {
          this.connectPort();
          this.checkForMissedResults();
        }, 1000);
      });
    } catch (err) {
      console.error('[KnowMe:SP] Port connect FAILED:', err);
    }
  }

  private async checkForMissedResults(): Promise<void> {
    const { lastResult } = await chrome.storage.local.get('lastResult');
    if (!lastResult) return;
    this.handleStorageResult(lastResult);
  }

  private startResultPolling(): void {
    // Poll storage every 5s as ultimate fallback while waiting for analysis
    setInterval(async () => {
      if (!this.currentAnalyzingPostId) return;
      await this.checkForMissedResults();
    }, 5000);
  }

  private switchTab(tab: 'analysis' | 'history'): void {
    this.activeTab = tab;
    const analysisEl = document.getElementById('analysis-panel')!;
    const historyEl = document.getElementById('history-panel')!;

    if (tab === 'analysis') {
      analysisEl.classList.remove('hidden');
      historyEl.classList.add('hidden');
    } else {
      analysisEl.classList.add('hidden');
      historyEl.classList.remove('hidden');
      this.historyPanel.render();
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    console.log('[KnowMe:SP] handleMessage:', message.type);
    switch (message.type) {
      case 'SERVER_STATUS':
        this.onServerStatus(message.payload);
        break;

      case 'ANALYSIS_LOADING': {
        this.currentAnalyzingPostId = message.payload.postId;
        const cached = await db.getAnalysis(message.payload.postId);
        if (cached) {
          this.currentAnalyzingPostId = null;
          await this.onAnalysisResult(cached);
        } else {
          this.switchTab('analysis');
          this.syncTabUI('analysis');
          this.analysisPanel.showLoading(message.payload.postId);
        }
        break;
      }

      case 'ANALYSIS_RESULT':
        this.currentAnalyzingPostId = null;
        await this.onAnalysisResult(message.payload);
        break;

      case 'ANALYSIS_ERROR':
        this.currentAnalyzingPostId = null;
        this.analysisPanel.showError(message.payload.error);
        break;
    }
  }

  private onServerStatus(status: ServerStatus): void {
    const statusEl = document.getElementById('server-status')!;
    this.serverConnected = status.model_loaded;

    if (status.model_loaded) {
      statusEl.textContent = 'Connected';
      statusEl.className = 'online';
      // Only hide setup guide if it's currently showing — never touch analysis-panel otherwise
      if (this.setupGuide.isVisible) {
        this.setupGuide.hide();
      }
    } else if (status.status === 'loading') {
      statusEl.textContent = 'Loading model...';
      statusEl.className = 'loading';
    } else {
      statusEl.textContent = 'Offline';
      statusEl.className = 'offline';
    }

    this.setupGuide.updateStatus(status.model_loaded);
  }

  private async onAnalysisResult(result: BrainAnalysisResult): Promise<void> {
    console.log('[KnowMe:SP] onAnalysisResult:', result.post_id, '| scores:', Object.keys(result.engagement_scores || {}).length);
    try {
      this.renderer.updateFromEngagement(result.engagement_scores);
      this.switchTab('analysis');
      this.syncTabUI('analysis');
      this.analysisPanel.showAnalysis(result);
      await db.saveAnalysis(result);
      console.log('[KnowMe:SP] Analysis displayed and saved');
    } catch (err) {
      console.error('[KnowMe:SP] onAnalysisResult CRASHED:', err);
    }
  }

  private async showAnalysis(result: BrainAnalysisResult): Promise<void> {
    this.renderer.updateFromEngagement(result.engagement_scores);
    this.switchTab('analysis');
    this.syncTabUI('analysis');
    this.analysisPanel.showAnalysis(result);
  }

  private syncTabUI(tab: 'analysis' | 'history'): void {
    document.querySelectorAll('.nav-tab').forEach((t) => {
      const btn = t as HTMLElement;
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
  }

  private resetAnalysis(): void {
    this.currentAnalyzingPostId = null;
    this.analysisPanel.clear();
    this.renderer.updateFromEngagement({});
    this.switchTab('analysis');
    this.syncTabUI('analysis');
  }
}

// Boot
const app = new SidePanelApp();
app.init().catch(console.error);
