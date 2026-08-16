import { useState, useRef } from 'react';
import { Save, Upload, X, Plus, Tag } from 'lucide-react';
import { ModuleHeader } from './ModuleHeader';
import { Input } from '../../components/ui/Input';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { BRAND_COLOR_PRESETS } from './builderTypes';
import { Toast } from '../../components/Toast';
import { cn } from '../../lib/utils';

const SETTINGS_KEY = 'bgrowth.checklist-builder.settings';

export interface BuilderSettings {
  companyName: string;
  ownerEmail: string;
  defaultColor: string;
  logoUrl: string | null;
  categories: string[];
}

export function loadSettings(ownerEmail: string): BuilderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    companyName: 'BGrowth',
    ownerEmail,
    defaultColor: '#1061EC',
    logoUrl: null,
    categories: [],
  };
}

export function saveSettings(settings: BuilderSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

interface SettingsScreenProps {
  ownerEmail: string;
  onBack: () => void;
}

export function SettingsScreen({ ownerEmail, onBack }: SettingsScreenProps) {
  const [settings, setSettings] = useState<BuilderSettings>(() => loadSettings(ownerEmail));
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [previewLogo, setPreviewLogo] = useState<string | null>(settings.logoUrl);
  const [newCategory, setNewCategory] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if ((settings.categories ?? []).some(c => c.toLowerCase() === trimmed.toLowerCase())) return;
    setSettings(s => ({ ...s, categories: [...(s.categories ?? []), trimmed] }));
    setNewCategory('');
  };

  const removeCategory = (cat: string) => {
    setSettings(s => ({ ...s, categories: (s.categories ?? []).filter(c => c !== cat) }));
  };

  const showToast = (msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPreviewLogo(url);
      setSettings((s) => ({ ...s, logoUrl: url }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    saveSettings(settings);
    showToast('Settings saved ✓');
    setTimeout(onBack, 800);
  };

  return (
    <div className="flex h-full flex-col">
      <ModuleHeader
        title="Settings"
        subtitle="Customize your Checklist Builder"
        onBack={onBack}
        backLabel="Back"
        actions={
          <PrimaryButton size="sm" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save Settings
          </PrimaryButton>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto flex max-w-xl flex-col gap-5">

          {/* Company Info */}
          <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-wide text-navy-400">Company</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Company Name</label>
                <Input
                  value={settings.companyName}
                  placeholder="BGrowth"
                  onChange={(e) => setSettings((s) => ({ ...s, companyName: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Owner Email</label>
                <Input
                  value={settings.ownerEmail}
                  placeholder="you@email.com"
                  type="email"
                  onChange={(e) => setSettings((s) => ({ ...s, ownerEmail: e.target.value }))}
                />
                <p className="mt-1 text-xs text-navy-400">Used to load your templates from Google Sheets.</p>
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-wide text-navy-400">Logo</p>
            <div className="flex items-center gap-4">
              {previewLogo ? (
                <div className="relative">
                  <img src={previewLogo} alt="Logo" className="h-16 w-16 rounded-xl object-cover shadow-card" />
                  <button
                    type="button"
                    onClick={() => { setPreviewLogo(null); setSettings((s) => ({ ...s, logoUrl: null })); }}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-navy-200 bg-navy-50">
                  <Upload className="h-6 w-6 text-navy-300" />
                </div>
              )}
              <div>
                <SecondaryButton size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  {previewLogo ? 'Change Logo' : 'Upload Logo'}
                </SecondaryButton>
                <p className="mt-1 text-xs text-navy-400">PNG, JPG — appears in all checklist headers.</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-navy-400">Categories</p>
            <p className="mb-4 text-xs text-navy-400">Used to filter and organize your templates.</p>

            {/* Lista de categorias */}
            <div className="mb-3 flex flex-wrap gap-2">
              {(settings.categories ?? []).length === 0 && (
                <p className="text-xs text-navy-300 italic">No categories yet.</p>
              )}
              {(settings.categories ?? []).map((cat) => (
                <span key={cat} className="flex items-center gap-1.5 rounded-full border border-navy-100 bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">
                  <Tag className="h-3 w-3 text-brand" />
                  {cat}
                  <button
                    type="button"
                    onClick={() => removeCategory(cat)}
                    className="ml-0.5 text-navy-300 hover:text-red-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Adicionar nova categoria */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
                placeholder="e.g. Notary, Cleaning, Real Estate..."
                className="flex-1 rounded-xl border border-navy-100 px-3.5 py-2 text-sm text-navy-800 placeholder-navy-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="button"
                onClick={addCategory}
                disabled={!newCategory.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          {/* Default color */}
          <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-wide text-navy-400">Default Brand Color</p>
            <p className="mb-3 text-xs text-navy-400">Applied automatically when you create a new template.</p>
            <div className="flex flex-wrap gap-2.5">
              {BRAND_COLOR_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  title={p.label}
                  onClick={() => setSettings((s) => ({ ...s, defaultColor: p.value }))}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
                    settings.defaultColor === p.value ? 'border-navy-800 scale-110' : 'border-white shadow'
                  )}
                  style={{ background: p.value }}
                >
                  {settings.defaultColor === p.value && (
                    <span className="h-2.5 w-2.5 rounded-full bg-white shadow" />
                  )}
                </button>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.defaultColor}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultColor: e.target.value }))}
                  className="h-9 w-9 cursor-pointer rounded-full border border-navy-100"
                  title="Custom color"
                />
                <span className="font-mono text-sm text-navy-500">{settings.defaultColor}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
