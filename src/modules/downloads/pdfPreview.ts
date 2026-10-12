/**
 * "Generate preview" for a Download's gallery: renders the first page of a
 * PDF, keeps only its top part (fading out) and stamps a large diagonal
 * "BGrowth · PREVIEW" watermark — enough to show what the file is, not
 * enough to copy it. Returns a PNG file ready for uploadGalleryFile().
 */
const VISIBLE_SHARE = 0.45; // top 45% of the page
const WIDTH = 1200;

export async function pdfPreviewImage(pdfUrl: string, fileName: string): Promise<File> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const bytes = await (await fetch(pdfUrl)).arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: WIDTH / base.width });

  const full = document.createElement('canvas');
  full.width = Math.round(viewport.width);
  full.height = Math.round(viewport.height);
  const fullCtx = full.getContext('2d');
  if (!fullCtx) throw new Error('Could not draw the preview.');
  fullCtx.fillStyle = '#ffffff';
  fullCtx.fillRect(0, 0, full.width, full.height);
  await page.render({ canvasContext: fullCtx, viewport }).promise;

  const out = document.createElement('canvas');
  out.width = full.width;
  out.height = Math.round(full.height * VISIBLE_SHARE);
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Could not draw the preview.');
  ctx.drawImage(full, 0, 0);

  // Fade the bottom third to white.
  const fadeStart = out.height * 0.55;
  const fade = ctx.createLinearGradient(0, fadeStart, 0, out.height);
  fade.addColorStop(0, 'rgba(255,255,255,0)');
  fade.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, fadeStart, out.width, out.height - fadeStart);

  // Big diagonal watermark, repeated.
  ctx.save();
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(-Math.PI / 7);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(out.width / 9)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(16, 97, 236, 0.16)';
  for (let row = -2; row <= 2; row++) {
    ctx.fillText('BGrowth · PREVIEW', 0, row * (out.width / 6));
  }
  ctx.restore();

  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not create the preview image.');
  return new File([blob], `${fileName.replace(/\.[^.]+$/, '')}-preview.png`, { type: 'image/png' });
}
