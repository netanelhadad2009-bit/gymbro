/**
 * Image Compression Utility
 *
 * Resizes and compresses images for efficient storage and upload.
 * Used for meal photo scanning to avoid sessionStorage limits.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
};

/**
 * Compress an image file to a smaller size
 *
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise resolving to compressed data URL
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    // Create object URL from file
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      // Clean up object URL
      URL.revokeObjectURL(objectUrl);

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > opts.maxWidth) {
        height = (height * opts.maxWidth) / width;
        width = opts.maxWidth;
      }

      if (height > opts.maxHeight) {
        width = (width * opts.maxHeight) / height;
        height = opts.maxHeight;
      }

      // Round to avoid sub-pixel rendering issues
      width = Math.round(width);
      height = Math.round(height);

      canvas.width = width;
      canvas.height = height;

      // Draw with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG data URL
      const dataUrl = canvas.toDataURL("image/jpeg", opts.quality);

      // Log compression results
      const originalSize = file.size;
      const compressedSize = Math.round((dataUrl.length * 3) / 4); // Approximate binary size
      console.log(
        `[ImageCompression] ${originalSize} -> ${compressedSize} bytes (${Math.round(
          (1 - compressedSize / originalSize) * 100
        )}% reduction)`
      );

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}

/**
 * Compress a base64 image string
 *
 * @param base64 - The base64 image data (without data URL prefix)
 * @param mimeType - The MIME type of the image
 * @param options - Compression options
 * @returns Promise resolving to compressed data URL
 */
export async function compressBase64Image(
  base64: string,
  mimeType: string = "image/jpeg",
  options: CompressOptions = {}
): Promise<string> {
  // Convert base64 to blob
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  // Create file from blob
  const file = new File([blob], "image.jpg", { type: mimeType });

  return compressImage(file, options);
}
