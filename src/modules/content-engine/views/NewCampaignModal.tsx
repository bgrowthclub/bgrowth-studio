import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createCampaign, fetchStrategies, searchPublishedProducts } from '../api/contentEngineClient';
import type { Campaign, ContentStrategy, Language, Platform, PublishedProductSummary } from '../types';
import { LANGUAGE_LABELS, PLATFORM_LABELS } from '../types';

interface NewCampaignModalProps {
  onClose: () => void;
  onCreated: (campaign: Campaign) => void;
}

export function NewCampaignModal({ onClose, onCreated }: NewCampaignModalProps) {
  const [strategies, setStrategies] = useState<ContentStrategy[]>([]);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<PublishedProductSummary[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PublishedProductSummary | null>(null);
  const [strategyId, setStrategyId] = useState('');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [language, setLanguage] = useState<Language>('en-US');
  const [channels, setChannels] = useState<Platform[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStrategies()
      .then((list) => {
        setStrategies(list);
        if (list[0]) setStrategyId(list[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPublishedProducts(query)
        .then((results) => {
          setProducts(results);
          setError(null);
        })
        .catch((err) => setError(err.message));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = async () => {
    if (!selectedProduct || !strategyId || !name.trim() || channels.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const campaign = await createCampaign({
        productId: selectedProduct.product_id,
        productSlug: selectedProduct.slug,
        strategyId,
        name: name.trim(),
        goal: goal.trim() || undefined,
        audience: audience.trim() || undefined,
        language,
        channels,
      });
      onCreated(campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleChannel = (platform: Platform) => {
    setChannels((prev) => (prev.includes(platform) ? prev.filter((c) => c !== platform) : [...prev, platform]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-cardHover">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-navy-900">New Campaign</h2>
          <button type="button" onClick={onClose} className="text-navy-400 hover:text-navy-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-navy-600">Published Workspace</label>
            <input
              type="text"
              placeholder="Search by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {products.map((product) => (
                <button
                  key={product.product_id}
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${selectedProduct?.product_id === product.product_id ? 'bg-brand-50 text-brand-700 font-semibold' : 'hover:bg-navy-50 text-navy-700'}`}
                >
                  <span className="truncate">{product.name}</span>
                  <span className="ml-2 shrink-0 text-[11px] text-navy-400">{product.slug}</span>
                </button>
              ))}
              {!error && products.length === 0 && <p className="px-3 py-2 text-xs text-navy-400">No published Workspaces found.</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-navy-600">Content Strategy</label>
            <select
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </select>
            {strategies.find((s) => s.id === strategyId)?.description && (
              <p className="mt-1 text-xs text-navy-400">{strategies.find((s) => s.id === strategyId)?.description}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-navy-600">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Launch Push"
              className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-navy-600">Goal (optional)</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Drive trial sign-ups"
              className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-navy-600">Audience (optional)</label>
            <textarea
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              rows={2}
              placeholder="e.g. Personal trainers and people organizing workout programs"
              className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-navy-600">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-navy-600">Channels</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(PLATFORM_LABELS) as [Platform, string][]).map(([value, label]) => {
                const checked = channels.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleChannel(value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${checked ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-navy-100 text-navy-600 hover:bg-navy-50'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {channels.length === 0 && <p className="mt-1 text-xs text-navy-400">Select at least one channel.</p>}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-navy-100 px-4 py-2 text-sm font-semibold text-navy-600 hover:bg-navy-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedProduct || !strategyId || !name.trim() || channels.length === 0 || isSubmitting}
            onClick={handleSubmit}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
