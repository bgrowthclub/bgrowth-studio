import { SLIDE_FORMATS, type SlideFormat } from '../types';

/**
 * Turns the carousel into real, ready-to-post images in the browser: each
 * photo cropped to the chosen format (centred, like "cover"), with the
 * slide's text drawn on it. Nothing is uploaded anywhere.
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not open this photo.'));
    img.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

const FONT = '"Inter", "Helvetica Neue", Arial, sans-serif';

export async function renderSlide(src: string, text: string, format: SlideFormat): Promise<string> {
  const { width, height } = SLIDE_FORMATS[format];
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not create the image.');

  // White behind transparent PNGs (JPEG has no transparency).
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Cover: fill the whole frame, crop the overflow evenly.
  const scale = Math.max(width / img.width, height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);

  const clean = text.trim();
  if (clean) {
    const pad = Math.round(width * 0.07);
    const fontSize = Math.round(width * 0.058);
    const lineHeight = Math.round(fontSize * 1.22);
    ctx.font = `800 ${fontSize}px ${FONT}`;
    const lines = wrapLines(ctx, clean, width - pad * 2).slice(0, 6);
    const blockHeight = lines.length * lineHeight;

    const gradientTop = Math.max(0, height - blockHeight - pad * 3.2);
    const gradient = ctx.createLinearGradient(0, gradientTop, 0, height);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
    gradient.addColorStop(0.45, 'rgba(15, 23, 42, 0.55)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, gradientTop, width, height - gradientTop);

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = Math.round(fontSize * 0.25);
    let y = height - pad * 1.4 - blockHeight;
    for (const line of lines) {
      ctx.fillText(line, pad, y);
      y += lineHeight;
    }
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

/** A smaller copy of an image (for keeping the AI request under the server's size limit). */
export async function shrinkDataUrl(src: string, maxSide: number, quality: number): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function slideFileName(index: number): string {
  return `slide-${String(index + 1).padStart(2, '0')}.jpg`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  downloadBlob(new Blob([dataUrlToBytes(dataUrl)], { type: 'image/jpeg' }), filename);
}

/** All slides in one .zip (images are already compressed, so stored, not deflated). */
export async function zipSlides(images: string[]): Promise<Blob> {
  const { zipSync } = await import('fflate');
  const files: Record<string, [Uint8Array, { level: 0 }]> = {};
  images.forEach((img, i) => {
    files[slideFileName(i)] = [dataUrlToBytes(img), { level: 0 }];
  });
  return new Blob([zipSync(files)], { type: 'application/zip' });
}

/** Files for the phone's share sheet (Instagram, WhatsApp, Photos…), when the browser supports it. */
export function slideFiles(images: string[]): File[] {
  return images.map((img, i) => new File([dataUrlToBytes(img)], slideFileName(i), { type: 'image/jpeg' }));
}

export function canShareFiles(files: File[]): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files });
}
