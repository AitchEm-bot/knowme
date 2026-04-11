const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const CAPTURE_WIDTH = 640; // Downscale for faster transfer
const JPEG_QUALITY = 0.8;

/**
 * Capture an image element as a base64-encoded JPEG.
 */
export async function captureImage(img: HTMLImageElement): Promise<string | null> {
  try {
    // Wait for image to be loaded
    if (!img.complete) {
      await new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
      });
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Scale down to reduce payload
    const scale = Math.min(1, CAPTURE_WIDTH / img.naturalWidth);
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const base64 = dataUrl.split(',')[1];

    // Check payload size
    if (base64.length > MAX_PAYLOAD_BYTES * 1.37) {
      console.warn('[KnowMe] Image too large, skipping');
      return null;
    }

    return base64;
  } catch (err) {
    // Cross-origin images will fail canvas.toDataURL
    console.warn('[KnowMe] Failed to capture image (likely CORS):', err);
    return null;
  }
}

/**
 * Capture the current frame of a video element as a base64-encoded JPEG.
 * For v1, we capture a single frame rather than the full video.
 */
export async function captureVideoFrame(video: HTMLVideoElement): Promise<string | null> {
  try {
    if (video.readyState < 2) {
      // Wait for enough data
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

/**
 * Capture media from either an image or video element.
 */
export async function captureMedia(
  element: HTMLImageElement | HTMLVideoElement
): Promise<{ base64: string; isVideo: boolean } | null> {
  if (element instanceof HTMLVideoElement) {
    const frame = await captureVideoFrame(element);
    if (!frame) return null;
    return { base64: frame, isVideo: true };
  }

  const image = await captureImage(element);
  if (!image) return null;
  return { base64: image, isVideo: false };
}
