export class SetupGuide {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(): void {
    this.container.innerHTML = `
      <div class="setup-guide">
        <h2>Welcome to KnowMe</h2>
        <p>A local Python server with TRIBE v2 is required for brain analysis.</p>

        <div class="step">
          <span class="step-num">1</span>
          <div>
            <strong>Clone & install</strong>
            <code>cd knowme/server<br>pip install -r requirements.txt</code>
            <p class="note">Requires Python 3.11+, NVIDIA GPU (A100/H100), ~15GB disk for model weights</p>
          </div>
        </div>

        <div class="step">
          <span class="step-num">2</span>
          <div>
            <strong>Start the server</strong>
            <code>uvicorn app.main:app --host 0.0.0.0 --port 8000</code>
            <p class="note">First run downloads model weights (~15GB). Subsequent starts are faster.</p>
          </div>
        </div>

        <div class="step">
          <span class="step-num">3</span>
          <div>
            <strong>Browse Instagram</strong>
            <p class="note">Open instagram.com and scroll your feed. KnowMe will analyze posts automatically.</p>
          </div>
        </div>

        <div id="server-check" style="
          margin-top: 20px;
          padding: 12px;
          border-radius: 6px;
          background: rgba(244, 67, 54, 0.1);
          color: #f44336;
          font-size: 13px;
          text-align: center;
        ">
          Waiting for local server...
        </div>

        <div class="license-badge" style="margin-top: 16px;">
          TRIBE v2 is licensed CC BY-NC (non-commercial use only)
        </div>
      </div>
    `;
  }

  hide(): void {
    this.container.innerHTML = '';
  }

  updateStatus(connected: boolean): void {
    const el = this.container.querySelector('#server-check');
    if (!el) return;

    if (connected) {
      (el as HTMLElement).style.background = 'rgba(76, 175, 80, 0.1)';
      (el as HTMLElement).style.color = '#4caf50';
      el.textContent = 'Server connected! Navigate to Instagram to begin.';
    } else {
      (el as HTMLElement).style.background = 'rgba(244, 67, 54, 0.1)';
      (el as HTMLElement).style.color = '#f44336';
      el.textContent = 'Waiting for local server...';
    }
  }
}
