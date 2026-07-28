import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * The one place a new section/field/item/checklist-item id (or dnd-kit
 * `_key`) gets generated — random, not Date.now()-based, so two entries
 * created (or duplicated) within the same millisecond can never collide.
 * These ids double as the React key everywhere this content renders, both
 * in Studio's own builder/fill screens and, once published, every
 * customer-facing Workspace screen in bgrowth-portal — a collision here
 * corrupts that keyed reconciliation (see templateIntegrity.ts, which
 * detects and repairs exactly this).
 */
export function newKey() {
  return `k-${Math.random().toString(36).slice(2, 9)}`;
}

// Client-side image compression using HTML5 Canvas
export function compressImage(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.75
): Promise<{ base64: string; sizeKB: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Keep aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context is null'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert and compress to highly optimized JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        const sizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);

        resolve({ base64: compressedBase64, sizeKB });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
