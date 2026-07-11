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
 * - Graceful fallback: returns original file on any error
 *
 * Returns { file, originalSize, compressedSize }.
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<{ file: File; originalSize: number; compressedSize: number }> {
  const {
    maxSize = DEFAULT_MAX_SIZE,
    quality = DEFAULT_QUALITY,
    format = "image/jpeg",
    maxBytes = DEFAULT_MAX_BYTES,
  } = opts;

  const originalSize = file.size;

  try {
    // Skip if file is already small enough and within dimensions
    const dims = await getImageDimensions(file);
    if (dims.width <= maxSize && dims.height <= maxSize && file.size <= maxBytes) {
      return { file, originalSize, compressedSize: file.size };
    }

    // Load image (with timeout safety — 10s max)
    const img = await Promise.race([
      loadImage(file),
      new Promise<HTMLImageElement>((_, reject) =>
        setTimeout(() => reject(new Error("Image load timeout")), 10000)
      ),
    ]);

    const { width, height } = calculateDimensions(img.width, img.height, maxSize);

    // Try compressing with decreasing quality until under maxBytes
    let q = quality;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      blob = await canvasCompress(img, width, height, format, q);
      if (blob.size <= maxBytes) break;
      q = Math.max(0.3, q - 0.2);
    }

    if (!blob) {
      blob = file.slice(); // fallback to original
    }

    // Clean up
    URL.revokeObjectURL(img.src);

    const ext = format === "image/webp" ? "webp" : file.name.split(".").pop() ?? "jpg";
    const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
    const compressedFile = new File([blob], name, { type: format });

    return { file: compressedFile, originalSize, compressedSize: blob.size };
  } catch {
    // Graceful fallback: return original file on any error
    return { file, originalSize, compressedSize: originalSize };
  }
}

/** Human-readable file size */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
