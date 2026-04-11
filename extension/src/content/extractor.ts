import type { InstagramPost } from '../lib/types';

/**
 * Extracts post data from an Instagram article element.
 * Uses semantic selectors for resilience against Instagram DOM changes.
 */
export function extractPostData(article: HTMLElement): InstagramPost | null {
  const postId = extractPostId(article);
  if (!postId) return null;

  const username = extractUsername(article);
  const caption = extractCaption(article);
  const mediaInfo = extractMediaInfo(article);
  if (!mediaInfo) return null;

  return {
    postId,
    username: username || 'unknown',
    caption,
    mediaType: mediaInfo.type,
    mediaSrc: '',
    mediaUrl: '',
    permalink: `https://www.instagram.com/p/${postId}/`,
    timestamp: new Date().toISOString(),
  };
}

function extractPostId(article: HTMLElement): string | null {
  // Look for permalink links containing /p/ or /reel/
  const links = article.querySelectorAll<HTMLAnchorElement>('a[href*="/p/"], a[href*="/reel/"]');
  for (const link of links) {
    const match = link.href.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
    if (match) return match[2];
  }
  return null;
}

function extractUsername(article: HTMLElement): string | null {
  // Look for profile links anywhere in the article (not just header — Instagram DOM changes)
  const profileLinks = article.querySelectorAll<HTMLAnchorElement>('a[href^="/"][role="link"]');
  for (const link of profileLinks) {
    const href = link.getAttribute('href');
    if (!href) continue;
    const username = href.replace(/\//g, '');
    if (
      username &&
      username.length < 50 &&
      !username.startsWith('p/') &&
      !username.startsWith('reel/') &&
      !username.includes('explore') &&
      /^[a-zA-Z0-9._]+$/.test(username)
    ) {
      return username;
    }
  }

  // Fallback: look for spans/links with username-like text
  const spans = article.querySelectorAll('span, a');
  for (const el of spans) {
    const text = el.textContent?.trim();
    if (text && text.length > 0 && text.length < 30 && /^[a-zA-Z0-9._]+$/.test(text)) {
      return text;
    }
  }

  return null;
}

function extractCaption(article: HTMLElement): string | null {
  // Captions are usually in a span within a section below the media
  const sections = article.querySelectorAll('section');
  for (const section of sections) {
    const spans = section.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent?.trim();
      // Caption text is typically longer than button labels
      if (text && text.length > 20) {
        return text;
      }
    }
  }

  // Fallback: look for elements with role or aria describing captions
  const captionEl = article.querySelector('[role="button"] + span, li span');
  if (captionEl) {
    const text = captionEl.textContent?.trim();
    if (text && text.length > 10) return text;
  }

  return null;
}

export interface MediaInfo {
  type: 'image' | 'video' | 'carousel';
  element: HTMLImageElement | HTMLVideoElement;
}

function extractMediaInfo(article: HTMLElement): MediaInfo | null {
  // Check for video first
  const video = article.querySelector<HTMLVideoElement>('video');
  if (video) {
    return { type: 'video', element: video };
  }

  // Check for carousel (multiple images/videos in a slider)
  const carouselDots = article.querySelectorAll('[role="tablist"] > *');
  if (carouselDots.length > 1) {
    // Carousel detected - get the currently visible image
    const img = article.querySelector<HTMLImageElement>('img[srcset], img[src*="instagram"]');
    if (img) {
      return { type: 'carousel', element: img };
    }
  }

  // Single image - find the main post image
  // Instagram images typically have srcset for responsive loading
  const images = article.querySelectorAll<HTMLImageElement>('img[srcset]');
  for (const img of images) {
    // Skip profile pictures (small, usually in header)
    if (img.closest('header')) continue;
    // Skip tiny images (likely icons)
    if (img.naturalWidth > 0 && img.naturalWidth < 50) continue;

    return { type: 'image', element: img };
  }

  // Broader fallback
  const anyImg = article.querySelector<HTMLImageElement>('img:not(header img)');
  if (anyImg && anyImg.naturalWidth > 100) {
    return { type: 'image', element: anyImg };
  }

  return null;
}

export function getMediaElement(article: HTMLElement): HTMLImageElement | HTMLVideoElement | null {
  const info = extractMediaInfo(article);
  return info?.element ?? null;
}
