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

  async init(): Promise<void> {
    // Connect to service worker
    this.port = chrome.runtime.connect({ name: 'sidepanel' });
    this.port.onMessage.addListener((msg: Message) => this.handleMessage(msg));

    // Initialize UI components
    this.analysisPanel = new AnalysisPanel(document.getElementById('analysis-panel')!);
    this.historyPanel = new HistoryPanel(document.getElementById('history-panel')!);
    this.setupGuide = new SetupGuide(document.getElementById('analysis-panel')!);

    this.historyPanel.setSelectCallback((result) => this.showAnalysis(result));
    this.setupNavTabs();

    // Load the brain model (bundled GLB — no server needed)
    const container = document.getElementById('brain-container')!;
    this.renderer = new BrainRenderer(container);

    try {
      await this.renderer.loadModel(BRAIN_MODEL_URL);
      const tooltip = document.getElementById('tooltip')!;
      this.renderer.setupHoverDetection(tooltip);
    } catch (err) {
      console.error('[KnowMe] Failed to load brain model:', err);
    }

    // Show setup guide until server connects
    this.setupGuide.show();
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

    nav.append(analysisTab, historyTab);
    header.after(nav);

    nav.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).dataset.tab;
      if (!tab) return;
      this.switchTab(tab as 'analysis' | 'history');
      nav.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
      (e.target as HTMLElement).classList.add('active');
    });
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
    switch (message.type) {
      case 'SERVER_STATUS':
        this.onServerStatus(message.payload);
        break;

      case 'ANALYSIS_LOADING':
        if (this.activeTab === 'analysis') {
          this.analysisPanel.showLoading(message.payload.postId);
        }
        break;

      case 'ANALYSIS_RESULT':
        await this.onAnalysisResult(message.payload);
        break;

      case 'ANALYSIS_ERROR':
        if (this.activeTab === 'analysis') {
          this.analysisPanel.showError(message.payload.error);
        }
        break;
    }
  }

  private onServerStatus(status: ServerStatus): void {
    const statusEl = document.getElementById('server-status')!;
    this.serverConnected = status.model_loaded;

    if (status.model_loaded) {
      statusEl.textContent = 'Connected';
      statusEl.className = 'online';
      this.setupGuide.hide();
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
    // Use engagement scores for per-region coloring
    this.renderer.updateFromEngagement(result.engagement_scores);

    // Update analysis panel
    if (this.activeTab === 'analysis') {
      this.analysisPanel.showAnalysis(result);
    }

    // Save to IndexedDB
    await db.saveAnalysis(result);
  }

  private async showAnalysis(result: BrainAnalysisResult): Promise<void> {
    this.renderer.updateFromEngagement(result.engagement_scores);
    this.switchTab('analysis');
    this.analysisPanel.showAnalysis(result);

    document.querySelectorAll('.nav-tab').forEach((t) => {
      t.classList.toggle('active', t.textContent === 'Analysis');
    });
  }
}

// Boot
const app = new SidePanelApp();
app.init().catch(console.error);
