import type { InstagramPost } from '../lib/types';
import type { PostDetectedMessage } from '../lib/messages';
import { extractPostData, getMediaElement } from './extractor';
import { extractMediaUrl, captureVideoFrame } from './media-capture';

/**
 * Observes the Instagram feed for currently visible posts.
 *
 * Uses IntersectionObserver to detect which article is in the viewport,
 * and MutationObserver to catch new posts loaded via infinite scroll.
 */
export class InstagramObserver {
  private intersectionObserver: IntersectionObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private currentPostId: string | null = null;
  private analyzedPosts = new Set<string>();

  start(): void {
    console.log('[KnowMe] Starting Instagram feed observer');

    this.intersectionObserver = new IntersectionObserver(
      (entries) => this.onIntersection(entries),
      { threshold: 0.5 }
    );

    this.observeArticles();

    this.mutationObserver = new MutationObserver(() => {
      this.observeArticles();
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  stop(): void {
    this.intersectionObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.intersectionObserver = null;
    this.mutationObserver = null;
  }

  private observeArticles(): void {
    if (!this.intersectionObserver) return;

    const articles = document.querySelectorAll('article');
    for (const article of articles) {
      if (!article.hasAttribute('data-knowme-observed')) {
        article.setAttribute('data-knowme-observed', 'true');
        this.intersectionObserver.observe(article);
      }
    }
  }

  private async onIntersection(entries: IntersectionObserverEntry[]): Promise<void> {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const article = entry.target as HTMLElement;
      const postData = extractPostData(article);
      if (!postData) continue;

      // Skip if it's the same post we're already showing
      if (postData.postId === this.currentPostId) continue;

      // For previously analyzed posts, notify side panel to re-display cached result
      if (this.analyzedPosts.has(postData.postId)) {
        this.currentPostId = postData.postId;
        this.sendMessage({
          type: 'POST_DETECTED',
          payload: postData,
        });
        continue;
      }

      this.currentPostId = postData.postId;

      // Extract media — prefer direct URL (avoids CORS), fall back to canvas for videos
      const mediaElement = getMediaElement(article);
      if (mediaElement) {
        const url = extractMediaUrl(mediaElement);
        if (url) {
          postData.mediaUrl = url;
        }

        // For videos without a fetchable URL, try canvas frame capture
        if (!url && mediaElement instanceof HTMLVideoElement) {
          const frame = await captureVideoFrame(mediaElement);
          if (frame) {
            postData.mediaSrc = frame;
            postData.mediaType = 'image'; // sending a still frame
          }
        }
      }

      this.analyzedPosts.add(postData.postId);

      this.sendMessage({
        type: 'POST_DETECTED',
        payload: postData,
      });
    }
  }

  private sendMessage(message: PostDetectedMessage): void {
    try {
      chrome.runtime.sendMessage(message);
    } catch (err) {
      console.warn('[KnowMe] Failed to send message:', err);
    }
  }
}
