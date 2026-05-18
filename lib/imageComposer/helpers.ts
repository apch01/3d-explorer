/**
 * Image Composer – canvas helper utilities
 *
 * All functions here are pure and run exclusively in the browser.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompositionOptions {
  /** Background image (layer 1) */
  background: HTMLImageElement | null;
  /** Human cutout with transparent background (layer 2) */
  portrait: HTMLImageElement | null;
  /** Overlay PNG (layer 3) */
  overlay: HTMLImageElement | null;
  /** Scale factor applied to the portrait (1 = fit-to-canvas height) */
  scale: number;
  /** Portrait offset in canvas pixels relative to its centered position */
  position: { x: number; y: number };
}

// ---------------------------------------------------------------------------
// loadImage
// ---------------------------------------------------------------------------

/**
 * Load a URL or data-URL into an HTMLImageElement and wait until it is ready.
 * Sets crossOrigin so cross-origin images don't taint the canvas.
 * Revokes object URLs automatically after load (pass revokeAfterLoad=true).
 */
export function loadImage(
  src: string,
  revokeAfterLoad = false
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (revokeAfterLoad) URL.revokeObjectURL(src);
      resolve(img);
    };
    img.onerror = () =>
      reject(new Error(`Failed to load image: ${src.slice(0, 60)}`));
    img.src = src;
  });
}

// ---------------------------------------------------------------------------
// drawComposition
// ---------------------------------------------------------------------------

/**
 * Draw all three layers onto the provided canvas.
 *
 * Layer order:
 *   1. Background image – stretched to fill the canvas
 *   2. Portrait cutout  – centred, scaled, offset by `position`
 *   3. Overlay PNG      – stretched to fill the canvas
 */
export function drawComposition(
  canvas: HTMLCanvasElement,
  opts: CompositionOptions
): void {
  const { background, portrait, overlay, scale, position } = opts;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Determine canvas dimensions from the background image, or fall back to
  // the current canvas size if no background has been loaded yet.
  if (background) {
    canvas.width = background.naturalWidth;
    canvas.height = background.naturalHeight;
  }

  const W = canvas.width;
  const H = canvas.height;

  // Clear previous frame
  ctx.clearRect(0, 0, W, H);

  // --- Layer 1: Background ---
  if (background) {
    ctx.drawImage(background, 0, 0, W, H);
  } else {
    // Placeholder dark gradient when no background is loaded
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0f0f1a");
    grad.addColorStop(1, "#1a0f2e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // --- Layer 2: Portrait cutout ---
  if (portrait) {
    // Base size: fit portrait height to canvas height (keeping aspect ratio)
    const baseHeight = H * scale;
    const baseWidth =
      (portrait.naturalWidth / portrait.naturalHeight) * baseHeight;

    // Centre the portrait, then apply the user-defined offset
    const x = (W - baseWidth) / 2 + position.x;
    const y = (H - baseHeight) / 2 + position.y;

    ctx.drawImage(portrait, x, y, baseWidth, baseHeight);
  }

  // --- Layer 3: Overlay ---
  if (overlay) {
    ctx.drawImage(overlay, 0, 0, W, H);
  }
}

// ---------------------------------------------------------------------------
// exportCanvas
// ---------------------------------------------------------------------------

/**
 * Export the canvas contents as a PNG Blob suitable for download.
 * Uses canvas.toBlob() internally and wraps it in a Promise.
 */
export function exportCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob() returned null."));
      },
      "image/png",
      1.0
    );
  });
}

// ---------------------------------------------------------------------------
// createObjectURL helper
// ---------------------------------------------------------------------------

/**
 * Create an object URL for a File and return a cleanup function.
 * Callers must invoke the returned revoke() when done to avoid memory leaks.
 */
export function createObjectUrl(
  file: File
): { url: string; revoke: () => void } {
  const url = URL.createObjectURL(file);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}
