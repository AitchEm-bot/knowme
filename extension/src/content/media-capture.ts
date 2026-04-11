const CAPTURE_WIDTH = 640;
const JPEG_QUALITY = 0.8;

/**
 * Extract the best direct URL from an image or video element.
 * For images, parses srcset to pick the highest resolution.
 * For videos, tries to find a non-blob URL.
 */
export function extractMediaUrl(element: HTMLImageElement | HTMLVideoElement): string | null {
  if (element instanceof HTMLImageElement) {
    // Parse srcset for the highest resolution URL
    if (element.srcset) {
      const sources = element.srcset.split(',').map(s => {
        const parts = s.trim().split(/\s+/);
        const url = parts[0];
        const width = parseInt(parts[1]) || 0;
        return { url, width };
      });
      sources.sort((a, b) => b.width - a.width);
      if (sources.length > 0 && sources[0].url) return sources[0].url;
    }
    // Fall back to src (skip data: URIs)
    if (element.src && !element.src.startsWith('data:')) {
      return element.src;
    }
    return null;
  }

  if (element instanceof HTMLVideoElement) {
    // Try non-blob src
    if (element.src && !element.src.startsWith('blob:')) {
      return element.src;
    }
    // Check <source> elements
    const source = element.querySelector<HTMLSourceElement>('source');
    if (source?.src && !source.src.startsWith('blob:')) {
      return source.src;
    }
    return null;
  }

  return null;
}

/**
 * Capture the current frame of a video element as a base64-encoded JPEG.
 * Used as a fallback when a direct video URL isn't available.
 */
export async function captureVideoFrame(video: HTMLVideoElement): Promise<string | null> {
  try {
    if (video.readyState < 2) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Video load timeout')), 5000);
        video.addEventListener('canplay', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
      });
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const scale = Math.min(1, CAPTURE_WIDTH / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    return dataUrl.split(',')[1];
  } catch (err) {
    console.warn('[KnowMe] Failed to capture video frame:', err);
    return null;
  }
}
