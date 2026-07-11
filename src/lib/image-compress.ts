// Client-side image compression using Canvas API.
// Reduces file size for uploads on slow networks.
// No external dependencies.

interface CompressOptions {
  /** Max width/height in pixels (default 1024) */
  maxSize?: number;
  /** JPEG quality 0-1 (default 0.7) */
  quality?: number;
  /** Target format (default "image/jpeg") */
  format?: "image/jpeg" | "image/webp";
  /** Max file size in bytes (default 300KB). Compresses further if exceeds. */
  maxBytes?: number;
}

const DEFAULT_MAX_SIZE = 1024;
const DEFAULT_QUALITY = 0.7;
const DEFAULT_MAX_BYTES = 300 * 1024; // 300KB

/**
 * Compress an image file for upload.
 * - Resizes to maxSize (maintaining aspect ratio)
 * - Converts to JPEG/WebP with quality setting
 * - Iteratively reduces quality if file still exceeds maxBytes
 *
 * Returns a File object ready for upload.
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const {
    maxSize = DEFAULT_MAX_SIZE,
    quality = DEFAULT_QUALITY,
    format = "image/jpeg",
    maxBytes = DEFAULT_MAX_BYTES,
  } = opts;

  // Skip if file is already small enough AND we don't need to resize
  if (file.size <= maxBytes) {
    // Still need to check dimensions — load image to check
    const dims = await getImageDimensions(file);
    if (dims.width <= maxSize && dims.height <= maxSize) {
      return file; // Already perfect, no compression needed
    }
  }

  // Load image
  const img = await loadImage(file);
  const { width, height } = calculateDimensions(img.width, img.height, maxSize);

  // Try compressing with decreasing quality until under maxBytes
  let q = quality;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    blob = await canvasCompress(img, width, height, format, q);
    if (blob.size <= maxBytes) break;
    q = Math.max(0.3, q - 0.15); // Reduce quality and retry
  }

  if (!blob) {
    // Fallback: compress at lowest quality
    blob = await canvasCompress(img, width, height, format, 0.3);
  }

  // Preserve original extension if possible, otherwise use format
  const ext = format === "image/webp" ? "webp" : file.name.split(".").pop() ?? "jpg";
  const name = file.name.replace(/\.[^.]+$/, `.${ext}`);

  return new File([blob], name, { type: format });
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

function calculateDimensions(
  w: number,
  h: number,
  maxSize: number
): { width: number; height: number } {
  if (w <= maxSize && h <= maxSize) return { width: w, height: h };
  const ratio = Math.min(maxSize / w, maxSize / h);
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}

function canvasCompress(
  img: HTMLImageElement,
  width: number,
  height: number,
  format: "image/jpeg" | "image/webp",
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas 2D context not available"));

    // White background for JPEG (handles PNG transparency)
    if (format === "image/jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (b) => {
        if (b) {
          URL.revokeObjectURL(img.src);
          resolve(b);
        } else {
          reject(new Error("Canvas toBlob failed"));
        }
      },
      format,
      quality
    );
  });
}
