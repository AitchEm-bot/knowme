import type { InstagramPost } from '../lib/types';
import type { PostDetectedMessage } from '../lib/messages';
import { extractPostData, getMediaElement } from './extractor';
import { captureMedia } from './media-capture';

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

    // Set up IntersectionObserver for viewport detection
    this.intersectionObserver = new IntersectionObserver(
      (entries) => this.onIntersection(entries),
      { threshold: 0.5 } // 50% visible
    );

    // Observe existing articles
    this.observeArticles();

    // Watch for new articles added to the DOM (infinite scroll)
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

      // Skip if we already analyzed this post or it's the current one
      if (postData.postId === this.currentPostId) continue;
      if (this.analyzedPosts.has(postData.postId)) {
        // Still notify the side panel to re-show cached results
        this.currentPostId = postData.postId;
        this.sendMessage({
          type: 'POST_DETECTED',
          payload: postData,
        });
        continue;
      }

      this.currentPostId = postData.postId;

      // Capture media
      const mediaElement = getMediaElement(article);
      if (mediaElement) {
        const captured = await captureMedia(mediaElement);
        if (captured) {
          // For v1, video frames are sent as images
          postData.mediaSrc = captured.base64;
          if (captured.isVideo) {
            // We captured a frame, but mark as image since we're
            // sending a still frame to the server
            postData.mediaType = 'image';
          }
        }
      }

      this.analyzedPosts.add(postData.postId);

      // Send to background service worker
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
      // Extension context may be invalidated if the extension was reloaded
      console.warn('[KnowMe] Failed to send message:', err);
    }
  }
}
