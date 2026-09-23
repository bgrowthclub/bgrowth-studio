import html2pdf from 'html2pdf.js';

/**
 * Two options below (pagebreakMode, margin) were added to match
 * bgrowth-portal's own copy of this file (its own doc comment there has
 * the full derivation): they're the two levers that actually control
 * html2pdf's usable page height and page-break behavior, needed for the
 * Document V1 visual/pagination redesign now shared into
 * PrintableSummary.tsx. Both default to the exact previous values, so any
 * existing caller that doesn't pass them is unaffected.
 *
 * Pre-existing bug fixed here (present before this redesign, and
 * independent of it — reproduced against the untouched, pre-redesign
 * PrintableSummary.tsx too): this function used to force
 * `element.style.width = '800px'` right before handing `element` to
 * html2pdf. html2pdf's own internal toContainer() (node_modules/html2pdf.js/
 * src/worker.js) clones that element into ITS OWN wrapper, sized to the
 * actual printable page width (`pageSize.inner.width`, e.g. ~726px CSS-px
 * equivalent for the old default margin, ~740px for the margin this repo
 * now passes — always less than 800px for a portrait Letter/A4 page at any
 * realistic margin). Since cloneNode() copies inline styles, the clone
 * still declared width:800px inside that narrower wrapper, so it
 * overflowed and every line of text within ~60-75px of the right edge was
 * silently cut off in the captured canvas — not just scaled down, actually
 * missing from the image, confirmed by extracting the embedded page image
 * directly from a generated PDF. Leaving `element`'s width unset lets it
 * fall back to its own `max-w-[800px]` class, which is a max, not a fixed
 * width — inside html2pdf's narrower wrapper it now fills exactly 100% of
 * the real printable width, matching what a real browser Print of the same
 * content already correctly produces.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  pdfOptions?: {
    format?: string;
    orientation?: 'portrait' | 'landscape';
    /** Default unchanged: ['avoid-all', 'css', 'legacy']. See pdf.ts in bgrowth-portal for the full derivation of why ['css','legacy'] paginates more predictably. */
    pagebreakMode?: string[];
    /** Default unchanged: [10, 12, 10, 12] (mm, top/left/bottom/right). The one option that actually controls usable page height. */
    margin?: [number, number, number, number];
  }
): Promise<void> {
  const container = element.parentElement;
  const target = container || element;

  const originalWidth = target.style.width;
  const originalHeight = target.style.height;
  const originalOverflow = target.style.overflow;
  const originalPosition = target.style.position;
  const originalLeft = target.style.left;
  const originalTop = target.style.top;
  const originalZIndex = target.style.zIndex;
  const originalOpacity = target.style.opacity;
  const originalVisibility = target.style.visibility;

  target.style.position = 'absolute';
  target.style.top = '0px';
  target.style.left = '-9999px';
  target.style.width = '800px';
  target.style.height = 'auto';
  target.style.overflow = 'visible';
  target.style.zIndex = '99999';
  target.style.opacity = '1';
  target.style.visibility = 'visible';

  const options = {
    margin: pdfOptions?.margin || ([10, 12, 10, 12] as [number, number, number, number]),
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: 824 },
    jsPDF: {
      unit: 'mm',
      format: (pdfOptions?.format || 'letter').toLowerCase(),
      orientation: pdfOptions?.orientation || ('portrait' as const),
    },
    pagebreak: { mode: pdfOptions?.pagebreakMode || ['avoid-all', 'css', 'legacy'] },
  };

  try {
    await html2pdf().set(options).from(element).save();
  } finally {
    target.style.width = originalWidth;
    target.style.height = originalHeight;
    target.style.overflow = originalOverflow;
    target.style.position = originalPosition;
    target.style.left = originalLeft;
    target.style.top = originalTop;
    target.style.zIndex = originalZIndex;
    target.style.opacity = originalOpacity;
    target.style.visibility = originalVisibility;
  }
}