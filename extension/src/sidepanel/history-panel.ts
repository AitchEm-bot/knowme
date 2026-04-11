import type { BrainAnalysisResult } from '../lib/types';
import { db } from '../lib/database';

export class HistoryPanel {
  private container: HTMLElement;
  private onSelect?: (result: BrainAnalysisResult) => void;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  setSelectCallback(cb: (result: BrainAnalysisResult) => void): void {
    this.onSelect = cb;
  }

  async render(): Promise<void> {
    this.container.innerHTML = '';

    const history = await db.getHistory(100);

    if (history.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 32px; text-align: center; color: #555; font-size: 13px;';
      empty.textContent = 'No analyses yet. Browse Instagram to get started.';
      this.container.appendChild(empty);
      return;
    }

    // Stats summary
    const stats = this.computeStats(history);
    const statsEl = document.createElement('div');
    statsEl.style.cssText = 'padding: 12px 0; margin-bottom: 12px; border-bottom: 1px solid #1a1a2e;';
    statsEl.innerHTML = `
      <div style="font-size: 12px; color: #888; margin-bottom: 4px;">
        ${history.length} posts analyzed
      </div>
      <div style="font-size: 11px; color: #666;">
        Most engaged: ${stats.topCategory}
      </div>
    `;
    this.container.appendChild(statsEl);

    // History list
    for (const result of history) {
      this.container.appendChild(this.createHistoryItem(result));
    }
  }

  private createHistoryItem(result: BrainAnalysisResult): HTMLElement {
    const item = document.createElement('div');
    item.className = 'history-item';

    const meta = document.createElement('div');
    meta.className = 'history-meta';

    const user = document.createElement('div');
    user.className = 'history-user';
    user.textContent = `@${result.post.username}`;

    const time = document.createElement('div');
    time.className = 'history-time';
    time.textContent = this.formatTime(result.timestamp);

    const summary = document.createElement('div');
    summary.style.cssText = 'font-size: 11px; color: #888; margin-top: 2px;';
    // Show top engagement
    const topScore = Object.entries(result.engagement_scores)
      .sort(([, a], [, b]) => b - a)[0];
    if (topScore) {
      summary.textContent = `${topScore[0]}: ${Math.round(topScore[1] * 100)}%`;
    }

    meta.append(user, time, summary);
    item.appendChild(meta);

    item.addEventListener('click', () => {
      this.onSelect?.(result);
    });

    return item;
  }

  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return date.toLocaleDateString();
  }

  private computeStats(
    history: BrainAnalysisResult[]
  ): { topCategory: string } {
    const categoryTotals: Record<string, number> = {};
    let count = 0;

    for (const result of history) {
      for (const [cat, score] of Object.entries(result.engagement_scores)) {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + score;
      }
      count++;
    }

    let topCategory = 'None';
    let maxAvg = 0;
    for (const [cat, total] of Object.entries(categoryTotals)) {
      const avg = total / count;
      if (avg > maxAvg) {
        maxAvg = avg;
        topCategory = cat;
      }
    }

    return { topCategory };
  }
}
