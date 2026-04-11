import type { BrainAnalysisResult, RegionActivation } from '../lib/types';

// Color for each engagement category
const CATEGORY_COLORS: Record<string, string> = {
  'Visual Processing': '#4fc3f7',
  'Face Recognition': '#ba68c8',
  'Scene & Place Processing': '#81c784',
  'Social & Emotional Processing': '#ff8a65',
  'Reward & Motivation': '#ffd54f',
  'Language & Semantics': '#90caf9',
  'Attention & Spatial Awareness': '#ef5350',
  'Memory Encoding': '#a1887f',
  'Emotional Regulation': '#f48fb1',
  'Body & Motion Processing': '#80cbc4',
};

export class AnalysisPanel {
  private container: HTMLElement;
  private onRegionHover?: (regionName: string) => void;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  setRegionHoverCallback(cb: (regionName: string) => void): void {
    this.onRegionHover = cb;
  }

  showAnalysis(result: BrainAnalysisResult): void {
    this.container.innerHTML = '';
    this.container.classList.remove('hidden');

    // Summary
    const summary = document.createElement('div');
    summary.className = 'analysis-summary';
    summary.textContent = result.summary;
    this.container.appendChild(summary);

    // Engagement bars
    const engSection = document.createElement('div');
    engSection.className = 'engagement-section';
    const engTitle = document.createElement('h3');
    engTitle.textContent = 'Cognitive Engagement';
    engSection.appendChild(engTitle);

    const sortedScores = Object.entries(result.engagement_scores)
      .sort(([, a], [, b]) => b - a);

    for (const [label, score] of sortedScores) {
      engSection.appendChild(this.createBar(label, score));
    }
    this.container.appendChild(engSection);

    // Top regions
    const topRegions = result.regions
      .sort((a, b) => b.activation - a.activation)
      .slice(0, 8);

    if (topRegions.length > 0) {
      const regSection = document.createElement('div');
      regSection.className = 'engagement-section';
      const regTitle = document.createElement('h3');
      regTitle.textContent = 'Top Brain Regions';
      regSection.appendChild(regTitle);

      const list = document.createElement('ul');
      list.className = 'region-list';
      for (const region of topRegions) {
        list.appendChild(this.createRegionItem(region));
      }
      regSection.appendChild(list);
      this.container.appendChild(regSection);
    }

    // Processing time
    const meta = document.createElement('div');
    meta.style.cssText = 'font-size: 11px; color: #555; margin-top: 12px;';
    meta.textContent = `Processed in ${result.processing_time_ms}ms`;
    this.container.appendChild(meta);
  }

  showLoading(postId: string): void {
    this.container.innerHTML = '';
    this.container.classList.remove('hidden');

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
      <div class="spinner"></div>
      <span>Analyzing brain response...</span>
    `;
    this.container.appendChild(spinner);
  }

  showError(error: string): void {
    this.container.innerHTML = '';
    this.container.classList.remove('hidden');

    const el = document.createElement('div');
    el.style.cssText = 'padding: 16px; color: #f44336; font-size: 13px;';
    el.textContent = `Analysis failed: ${error}`;
    this.container.appendChild(el);
  }

  clear(): void {
    this.container.innerHTML = '';
  }

  private createBar(label: string, score: number): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'engagement-bar';

    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = label;

    const track = document.createElement('div');
    track.className = 'bar-track';

    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    const pct = Math.round(score * 100);
    fill.style.width = `${pct}%`;
    fill.style.background = CATEGORY_COLORS[label] || '#ff6f00';
    track.appendChild(fill);

    const value = document.createElement('span');
    value.className = 'value';
    value.textContent = `${pct}%`;

    bar.append(labelEl, track, value);
    return bar;
  }

  private createRegionItem(region: RegionActivation): HTMLElement {
    const item = document.createElement('li');
    item.className = 'region-item';

    const dot = document.createElement('span');
    dot.className = 'region-dot';
    const catColor = CATEGORY_COLORS[
      Object.values(CATEGORY_COLORS).length > 0
        ? this.getCategoryLabel(region.category)
        : ''
    ] || '#ff6f00';
    dot.style.background = catColor;

    const name = document.createElement('span');
    name.className = 'region-name';
    name.textContent = region.full_name;

    const val = document.createElement('span');
    val.className = 'region-value';
    val.textContent = `${Math.round(region.activation * 100)}%`;

    item.append(dot, name, val);

    item.addEventListener('mouseenter', () => {
      this.onRegionHover?.(region.region_name);
    });

    return item;
  }

  private getCategoryLabel(categoryKey: string): string {
    const map: Record<string, string> = {
      visual_processing: 'Visual Processing',
      face_recognition: 'Face Recognition',
      scene_processing: 'Scene & Place Processing',
      social_cognition: 'Social & Emotional Processing',
      reward_motivation: 'Reward & Motivation',
      language_semantic: 'Language & Semantics',
      attention: 'Attention & Spatial Awareness',
      memory: 'Memory Encoding',
      emotional_regulation: 'Emotional Regulation',
      body_motion: 'Body & Motion Processing',
    };
    return map[categoryKey] || categoryKey;
  }
}
