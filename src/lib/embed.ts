// Public fill links (?template=, ?calc=, ?planner=) also open inside
// bgrowth.app/t/... (Website Sprint 120): the Website shows them in a frame
// and needs to know whether the link exists, so it can show its own
// "Link not found" page. Only the BGrowth site may receive this.
const SITE_ORIGINS = ['https://bgrowth.app', 'https://www.bgrowth.app'];

export function notifyEmbedParent(status: 'ready' | 'not-found') {
  if (window.parent === window) return;
  for (const origin of SITE_ORIGINS) {
    try {
      window.parent.postMessage({ source: 'bgrowth-studio', status }, origin);
    } catch {
      // not that origin
    }
  }
}

// The links to share (Etsy, Pinterest, e-mail…): bgrowth.app/t/..., which
// never shows the Studio's address. The old studio.bgrowth.app/?template=
// links keep working.
const SITE = 'https://bgrowth.app';

export const publicTemplateUrl = (id: string) => `${SITE}/t/${encodeURIComponent(id)}`;
export const publicCalcUrl = (id: string) => `${SITE}/t/calc/${encodeURIComponent(id)}`;
export const publicPlannerUrl = (id: string, owner: string) =>
  `${SITE}/t/planner/${encodeURIComponent(id)}?owner=${encodeURIComponent(owner)}`;
