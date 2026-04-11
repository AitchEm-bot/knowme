const DEFAULT_SERVER_URL = 'http://localhost:8000';

export class SetupGuide {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(): void {
    this.container.innerHTML = `
      <div class="setup-guide">
        <h2>Welcome to KnowMe</h2>
        <p>Connect to a TRIBE v2 server to start analyzing brain responses.</p>

        <div class="setup-url-section">
          <label for="setup-server-url">Server URL</label>
          <div class="setup-url-row">
            <input
              id="setup-server-url"
              type="url"
              placeholder="https://your-name--knowme-serve.modal.run"
              spellcheck="false"
            >
            <button id="setup-save-url" class="btn-primary">Connect</button>
          </div>
          <div id="setup-url-feedback" class="setup-feedback"></div>
        </div>

        <div class="setup-divider"><span>Setup Options</span></div>

        <details class="setup-option" open>
          <summary>Deploy on Modal <span class="badge">Recommended</span></summary>
          <div class="setup-option-body">
            <p class="note">Serverless GPU — no hardware needed. Free tier includes GPU credits.</p>
            <div class="step">
              <span class="step-num">1</span>
              <div>
                <strong>Install Modal</strong>
                <code>pip install modal && modal setup</code>
              </div>
            </div>
            <div class="step">
              <span class="step-num">2</span>
              <div>
                <strong>Deploy the server</strong>
                <code>cd knowme && modal deploy modal/app.py</code>
                <p class="note">First deploy builds the container image (~10 min). Model weights are cached for future runs.</p>
              </div>
            </div>
            <div class="step">
              <span class="step-num">3</span>
              <div>
                <strong>Copy your endpoint URL</strong>
                <p class="note">Modal prints the URL after deploy. Paste it in the field above.</p>
              </div>
            </div>
          </div>
        </details>

        <details class="setup-option">
          <summary>Run locally</summary>
          <div class="setup-option-body">
            <p class="note">Requires Python 3.11+, NVIDIA GPU (A100/H100), ~15 GB disk.</p>
            <div class="step">
              <span class="step-num">1</span>
              <div>
                <strong>Install &amp; start</strong>
                <code>cd knowme/server<br>pip install -r requirements.txt<br>uvicorn app.main:app --host 0.0.0.0 --port 8000</code>
              </div>
            </div>
            <div class="step">
              <span class="step-num">2</span>
              <div>
                <strong>Connect</strong>
                <p class="note">Enter <strong>http://localhost:8000</strong> in the URL field above.</p>
              </div>
            </div>
          </div>
        </details>

        <div id="server-check" class="setup-status setup-status-offline">
          Waiting for server...
        </div>

        <div class="license-badge">
          TRIBE v2 is licensed CC BY-NC (non-commercial use only)
        </div>
      </div>
    `;

    this.loadSavedUrl();
    this.bindEvents();
  }

  hide(): void {
    this.container.innerHTML = '';
  }

  updateStatus(connected: boolean): void {
    const el = this.container.querySelector('#server-check') as HTMLElement | null;
    if (!el) return;

    if (connected) {
      el.className = 'setup-status setup-status-online';
      el.textContent = 'Server connected! Navigate to Instagram to begin.';
    } else {
      el.className = 'setup-status setup-status-offline';
      el.textContent = 'Waiting for server...';
    }
  }

  private async loadSavedUrl(): Promise<void> {
    const { serverUrl } = await chrome.storage.sync.get({ serverUrl: '' });
    const input = this.container.querySelector('#setup-server-url') as HTMLInputElement | null;
    if (input && serverUrl) {
      input.value = serverUrl;
    }
  }

  private bindEvents(): void {
    const saveBtn = this.container.querySelector('#setup-save-url');
    const input = this.container.querySelector('#setup-server-url') as HTMLInputElement | null;

    saveBtn?.addEventListener('click', () => this.saveUrl());
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.saveUrl();
    });
  }

  private async saveUrl(): Promise<void> {
    const input = this.container.querySelector('#setup-server-url') as HTMLInputElement | null;
    const feedback = this.container.querySelector('#setup-url-feedback') as HTMLElement | null;
    if (!input || !feedback) return;

    const url = input.value.trim().replace(/\/+$/, '');
    if (!url) {
      feedback.textContent = 'Please enter a server URL.';
      feedback.className = 'setup-feedback setup-feedback-error';
      return;
    }

    feedback.textContent = 'Connecting...';
    feedback.className = 'setup-feedback setup-feedback-loading';

    await chrome.storage.sync.set({ serverUrl: url });

    // Give the service worker a moment to pick up the change and poll
    setTimeout(() => {
      feedback.textContent = 'URL saved. Checking connection...';
    }, 500);
  }
}
