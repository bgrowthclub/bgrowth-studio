import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Map as MapIcon, Plus, Route } from 'lucide-react';
import { PrimaryButton } from '../../components/ui/Button';
import { releaseLabel } from '../downloads/ReleasePanel';
import { getJourney, listJourneyResources, listJourneys } from './api';
import { JourneyEditor } from './JourneyEditor';
import { toDraft } from './model';
import type { JourneyCheck, JourneyDraft, JourneyListItem, JourneyResources } from './types';

interface Props {
  ownerEmail: string;
  onHome?: () => void;
}

const STAGE_FILTERS: [string, string][] = [
  ['all', 'All'],
  ['draft', 'Draft'],
  ['ready_for_review', 'Waiting for approval'],
  ['approved', 'Approved / scheduled'],
  ['published', 'Published'],
];

/**
 * Studio → Journeys: guided paths to a goal (stages → actions) shown only on
 * bgrowth.app. Any number of Journeys; each has its own name, address,
 * stages, actions, status and members' progress. Actions point to existing
 * products and Knowledge articles — never copies of them.
 */
export function Journeys({ ownerEmail, onHome }: Props) {
  const [items, setItems] = useState<JourneyListItem[] | null>(null);
  const [resources, setResources] = useState<JourneyResources | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: JourneyDraft; check: JourneyCheck | null } | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [stage, setStage] = useState('all');

  const load = useCallback(() => {
    listJourneys()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the Journeys.'));
  }, []);
  useEffect(load, [load]);

  // The real status of every product/article an action can point to —
  // reloaded each time a Journey is opened.
  const loadResources = useCallback(() => {
    listJourneyResources()
      .then(setResources)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load products and articles.'));
  }, []);

  async function open(id: string) {
    setOpening(id);
    setError(null);
    try {
      const { journey, check } = await getJourney(id);
      loadResources();
      setEditing({ draft: toDraft(journey), check });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the Journey.');
    } finally {
      setOpening(null);
    }
  }

  function create() {
    loadResources();
    setEditing({ draft: toDraft(null), check: null });
  }

  const visible = items?.filter((j) => stage === 'all' || j.status === stage || (stage === 'draft' && j.status === 'archived'));

  return (
    <div className="min-h-screen bg-[#f4f6fb] font-sans">
      <header className="flex items-center gap-3 border-b border-navy-100 bg-white px-4 py-4 sm:px-6">
        <button type="button" onClick={onHome} className="flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
          <ArrowLeft className="h-4 w-4" /> Home
        </button>
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-brand-600" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">BGrowth Studio</p>
            <h1 className="text-sm font-extrabold text-navy-900">Journeys</h1>
          </div>
        </div>
      </header>

      {editing ? (
        <JourneyEditor
          key={editing.draft.studioProductId}
          initial={editing.draft}
          initialCheck={editing.check}
          resources={resources}
          ownerEmail={ownerEmail}
          onBack={() => setEditing(null)}
          onSaved={load}
        />
      ) : (
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-sm text-navy-500">
              Guided paths to a goal, shown only on bgrowth.app. Each Journey has its own stages and actions, pointing to products and articles you already have.
            </p>
            <PrimaryButton type="button" size="sm" onClick={create}>
              <Plus className="h-4 w-4" /> New Journey
            </PrimaryButton>
          </div>
          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
          {items && items.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {STAGE_FILTERS.map(([key, label]) => {
                const count = key === 'all' ? items.length : items.filter((j) => j.status === key).length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStage(key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      stage === key ? 'bg-navy-900 text-white' : 'bg-white text-navy-500 ring-1 ring-navy-100 hover:bg-navy-50'
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          )}
          <div className="overflow-hidden rounded-xl border border-navy-100 bg-white">
            {items === null && !error && <p className="p-6 text-sm text-navy-400">Loading…</p>}
            {items?.length === 0 && <p className="p-6 text-sm text-navy-400">No Journeys yet.</p>}
            {visible?.map((j) => (
              <button
                key={j.id}
                type="button"
                disabled={opening !== null}
                onClick={() => void open(j.id)}
                className="flex w-full items-center gap-3 border-t border-navy-50 px-4 py-3 text-left first:border-t-0 hover:bg-navy-50/50 disabled:opacity-60"
              >
                {j.cover_image_url ? (
                  <img src={j.cover_image_url} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                ) : (
                  <MapIcon className="h-5 w-5 shrink-0 text-brand-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy-900">{j.name}</p>
                  <p className="truncate text-xs text-navy-400">
                    /journeys/{j.slug} · {j.stageCount} {j.stageCount === 1 ? 'stage' : 'stages'} · {j.actionCount} {j.actionCount === 1 ? 'action' : 'actions'}
                  </p>
                </div>
                {opening === j.id && <span className="text-xs text-navy-400">Opening…</span>}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    j.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700'
                      : j.status === 'approved'
                        ? 'bg-brand-50 text-brand-700'
                        : j.status === 'ready_for_review'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-navy-50 text-navy-500'
                  }`}
                >
                  {releaseLabel(j.status, j.scheduled_publish_at)}
                </span>
              </button>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
