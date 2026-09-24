import { TemplatesScreen } from '../modules/checklist-builder/TemplatesScreen';

/**
 * Isolated, dev-only preview for TemplatesScreen (see ../../templates-preview.html
 * — a separate Vite HTML entry point, not linked from index.html and not part
 * of the production build's rollupOptions.input, so this harness's code never
 * ships to production and can never be reached in production).
 *
 * Renders the real TemplatesScreen component directly, bypassing App.tsx's
 * module graph entirely (App.tsx eagerly imports every tool, including an
 * unrelated, pre-existing Calculator Builder module that throws at import
 * time in `npm run dev` — see the mobile-responsiveness validation report).
 * api_getTemplates still makes its real dev-mode request to
 * http://localhost:8787; a test harness supplies the response via Playwright
 * route interception, exactly like the real GAS backend would.
 */
export function TemplatesScreenDevPreview() {
  return (
    <TemplatesScreen
      ownerEmail="benterprisesusa@gmail.com"
      onOpen={() => {}}
      onNew={() => {}}
      onEdit={() => {}}
    />
  );
}
