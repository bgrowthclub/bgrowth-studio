import { useState } from 'react';
import { useSitePlans } from './useSitePlans';
import { X, Plus, Trash2, Save, Eye, ArrowLeft } from 'lucide-react';
import type { KnowledgeItem, ContentType, DifficultyLevel, VisibilityType, ContentBlock } from './types';
import { KnowledgeReleasePanel } from './KnowledgeReleasePanel';
import { MOCK_AUTHORS, CATEGORIES, INDUSTRIES, TAGS } from './mockData';

const CONTENT_TYPES: ContentType[] = [
  'Article', 'Guide', 'Tutorial', 'Documentation', 'FAQ',
  'Release Notes', 'Changelog', 'Glossary', 'Troubleshooting',
  'Video', 'Resource', 'Announcement', 'Case Study',
];

const BLOCK_TYPES = [
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'heading', label: 'Heading' },
  { type: 'image', label: 'Image' },
  { type: 'quote', label: 'Quote' },
  { type: 'callout', label: 'Callout' },
  { type: 'checklist', label: 'Checklist' },
  { type: 'faq', label: 'FAQ' },
  { type: 'cta', label: 'CTA Block' },
  { type: 'comparison', label: 'Comparison Table' },
  { type: 'download', label: 'Download' },
  { type: 'divider', label: 'Divider' },
  { type: 'code', label: 'Code Block' },
  { type: 'video', label: 'Video' },
];

function newId() {
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function defaultBlockData(type: string): any {
  switch (type) {
    case 'paragraph': return { text: '' };
    case 'heading': return { text: '', level: 2 };
    case 'image': return { url: '', caption: '' };
    case 'quote': return { text: '', citation: '' };
    case 'callout': return { type: 'info', title: '', text: '' };
    case 'checklist': return { title: '', items: [{ text: '' }] };
    case 'faq': return { questions: [{ q: '', a: '' }] };
    case 'cta': return { type: 'Download Free Checklist', title: '', description: '', buttonText: 'Learn More', linkUrl: '' };
    case 'comparison': return { headers: ['Feature', 'Option A', 'Option B'], rows: [['Item 1', '', '']] };
    case 'download': return { filename: '', size: '', url: '' };
    case 'divider': return { style: 'solid' };
    case 'code': return { language: 'javascript', code: '' };
    case 'video': return { url: '' };
    default: return {};
  }
}

interface AssetEditorProps {
  item: KnowledgeItem;
  onSave: (item: KnowledgeItem) => void;
  /** Saves without leaving the editor (used before a release step). */
  onSaveInPlace: (item: KnowledgeItem) => Promise<boolean>;
  onReleaseChanged: (item: KnowledgeItem) => void;
  onPreview: () => void;
  onBack: () => void;
}

type EditorTab = 'general' | 'content' | 'attachments' | 'related' | 'featured' | 'seo' | 'publishing';

// The release fields come from the server (release flow), not from the form.
function pickRelease(i: KnowledgeItem) {
  const { status, reviewedBy, approvedBy, scheduledAt, publishedAt } = i.publishing;
  return { status, reviewedBy, approvedBy, scheduledAt, publishedAt };
}

export function AssetEditor({ item, onSave, onSaveInPlace, onReleaseChanged, onPreview, onBack }: AssetEditorProps) {
  const [draft, setDraft] = useState<KnowledgeItem>({ ...item });
  const sitePlans = useSitePlans();
  const [activeTab, setActiveTab] = useState<EditorTab>('general');
  const [tagInput, setTagInput] = useState('');

  const set = (key: keyof KnowledgeItem, val: any) => setDraft(d => ({ ...d, [key]: val }));
  const setSeo = (key: string, val: any) => setDraft(d => ({ ...d, seo: { ...d.seo, [key]: val } }));
  const setFeatured = (key: string, val: any) => setDraft(d => ({ ...d, featuredOptions: { ...d.featuredOptions, [key]: val } }));
  const setPublishing = (key: string, val: any) => setDraft(d => ({ ...d, publishing: { ...d.publishing, [key]: val } }));

  const addBlock = (type: string) => {
    const block: ContentBlock = { id: newId(), type: type as any, data: defaultBlockData(type) };
    setDraft(d => ({ ...d, blocks: [...d.blocks, block] }));
  };

  const updateBlock = (id: string, data: any) => {
    setDraft(d => ({ ...d, blocks: d.blocks.map(b => b.id === id ? { ...b, data } : b) }));
  };

  const deleteBlock = (id: string) => {
    setDraft(d => ({ ...d, blocks: d.blocks.filter(b => b.id !== id) }));
  };

  const addTag = () => {
    if (tagInput.trim() && !draft.tags.includes(tagInput.trim())) {
      set('tags', [...draft.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => set('tags', draft.tags.filter(t => t !== tag));

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'content', label: 'Content' },
    { id: 'attachments', label: 'Attachments' },
    { id: 'related', label: 'Related' },
    { id: 'featured', label: 'Featured' },
    { id: 'seo', label: 'SEO' },
    { id: 'publishing', label: 'Publishing' },
  ];

  const inputCls = 'w-full rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
  const labelCls = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-navy-100 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
            <ArrowLeft className="h-4 w-4" /> Library
          </button>
          <span className="text-navy-200">/</span>
          <span className="text-sm font-semibold text-navy-800 truncate max-w-[200px]">{draft.title || 'Untitled'}</span>
          <button type="button" onClick={() => setActiveTab('publishing')} className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold text-navy-500 hover:text-brand">
            {draft.publishing.status === 'In Review' ? 'Reviewed' : draft.publishing.status}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPreview} className="flex items-center gap-1.5 rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50">
            <Eye className="h-4 w-4" /> Preview
          </button>
          <button type="button" onClick={() => onSave(draft)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-navy-100 bg-white px-4 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-3 text-xs font-bold border-b-2 transition-all ${activeTab === tab.id ? 'border-brand text-brand' : 'border-transparent text-navy-400 hover:text-navy-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-5">

          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <>
              <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card space-y-4">
                <p className={labelCls.replace('mb-1 block', 'block mb-3 text-[13px]')}>Core Information</p>
                <div>
                  <label className={labelCls}>Title *</label>
                  <input className={inputCls} value={draft.title} onChange={e => set('title', e.target.value)} placeholder="Article title..." />
                </div>
                <div>
                  <label className={labelCls}>Slug</label>
                  <input className={inputCls + ' font-mono text-xs'} value={draft.slug} onChange={e => set('slug', e.target.value)} placeholder="article-slug" />
                </div>
                <div>
                  <label className={labelCls}>Excerpt / Summary</label>
                  <textarea className={inputCls} rows={3} value={draft.excerpt} onChange={e => set('excerpt', e.target.value)} placeholder="Short description shown in listings..." />
                </div>
                <div>
                  <label className={labelCls}>Featured Image URL</label>
                  <input className={inputCls} value={draft.featuredImage} onChange={e => set('featuredImage', e.target.value)} placeholder="https://..." />
                  {draft.featuredImage && <img src={draft.featuredImage} alt="Preview" className="mt-2 h-32 w-full rounded-lg object-cover border border-navy-100" />}
                </div>
              </div>

              <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card space-y-4">
                <p className="block mb-3 text-[13px] font-bold text-navy-800">Classification</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Content Type</label>
                    <select className={inputCls} value={draft.contentType} onChange={e => set('contentType', e.target.value as ContentType)}>
                      {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Language</label>
                    <select className={inputCls} value={draft.language} onChange={e => set('language', e.target.value as 'en' | 'pt')}>
                      <option value="en">English</option>
                      <option value="pt">Portuguese</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Category</label>
                    <select className={inputCls} value={draft.category} onChange={e => set('category', e.target.value)}>
                      <option value="">Select category...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Industry</label>
                    <select className={inputCls} value={draft.industry} onChange={e => set('industry', e.target.value)}>
                      <option value="">Select industry...</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Difficulty</label>
                    <select className={inputCls} value={draft.difficulty} onChange={e => set('difficulty', e.target.value as DifficultyLevel)}>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Reading Time</label>
                    <input className={inputCls} value={draft.readingTime} onChange={e => set('readingTime', e.target.value)} placeholder="5 min read" />
                  </div>
                  <div>
                    <label className={labelCls}>Author</label>
                    <select className={inputCls} value={draft.authorId} onChange={e => set('authorId', e.target.value)}>
                      {MOCK_AUTHORS.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className={labelCls}>Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input className={inputCls} value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      placeholder="Add tag and press Enter..." list="tag-suggestions" />
                    <datalist id="tag-suggestions">{TAGS.map(t => <option key={t} value={t} />)}</datalist>
                    <button type="button" onClick={addTag} className="rounded-lg border border-navy-100 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand-50">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {draft.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CONTENT TAB */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-navy-800">Content Blocks</p>
                <div className="relative group">
                  <button type="button" className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
                    <Plus className="h-3.5 w-3.5" /> Add Block
                  </button>
                  <div className="absolute right-0 top-8 z-20 hidden group-hover:block w-48 rounded-xl border border-navy-100 bg-white shadow-lg py-1">
                    {BLOCK_TYPES.map(bt => (
                      <button key={bt.type} type="button" onClick={() => addBlock(bt.type)}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-navy-700 hover:bg-brand-50 hover:text-brand">
                        {bt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {draft.blocks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-navy-200 py-12 text-center">
                  <p className="text-sm text-navy-400">No blocks yet. Add your first block above.</p>
                </div>
              )}

              {draft.blocks.map((block, idx) => (
                <div key={block.id} className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-navy-500">{block.type}</span>
                    <button type="button" onClick={() => deleteBlock(block.id)} className="text-navy-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Block-specific editors */}
                  {block.type === 'paragraph' && (
                    <textarea className={inputCls} rows={4} value={block.data?.text || ''} onChange={e => updateBlock(block.id, { ...block.data, text: e.target.value })} placeholder="Paragraph text..." />
                  )}
                  {block.type === 'heading' && (
                    <div className="flex gap-2">
                      <select className={inputCls + ' w-24'} value={block.data?.level || 2} onChange={e => updateBlock(block.id, { ...block.data, level: Number(e.target.value) })}>
                        <option value={1}>H1</option>
                        <option value={2}>H2</option>
                        <option value={3}>H3</option>
                      </select>
                      <input className={inputCls} value={block.data?.text || ''} onChange={e => updateBlock(block.id, { ...block.data, text: e.target.value })} placeholder="Heading text..." />
                    </div>
                  )}
                  {block.type === 'image' && (
                    <div className="space-y-2">
                      <input className={inputCls} value={block.data?.url || ''} onChange={e => updateBlock(block.id, { ...block.data, url: e.target.value })} placeholder="Image URL..." />
                      <input className={inputCls} value={block.data?.caption || ''} onChange={e => updateBlock(block.id, { ...block.data, caption: e.target.value })} placeholder="Caption (optional)..." />
                      {block.data?.url && <img src={block.data.url} alt="Preview" className="h-32 w-full rounded-lg object-cover border border-navy-100" />}
                    </div>
                  )}
                  {block.type === 'quote' && (
                    <div className="space-y-2">
                      <textarea className={inputCls} rows={3} value={block.data?.text || ''} onChange={e => updateBlock(block.id, { ...block.data, text: e.target.value })} placeholder="Quote text..." />
                      <input className={inputCls} value={block.data?.citation || ''} onChange={e => updateBlock(block.id, { ...block.data, citation: e.target.value })} placeholder="— Author, Source" />
                    </div>
                  )}
                  {block.type === 'callout' && (
                    <div className="space-y-2">
                      <select className={inputCls} value={block.data?.type || 'info'} onChange={e => updateBlock(block.id, { ...block.data, type: e.target.value })}>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                      </select>
                      <input className={inputCls} value={block.data?.title || ''} onChange={e => updateBlock(block.id, { ...block.data, title: e.target.value })} placeholder="Callout title..." />
                      <textarea className={inputCls} rows={2} value={block.data?.text || ''} onChange={e => updateBlock(block.id, { ...block.data, text: e.target.value })} placeholder="Callout body..." />
                    </div>
                  )}
                  {block.type === 'cta' && (
                    <div className="space-y-2">
                      <select className={inputCls} value={block.data?.type || ''} onChange={e => updateBlock(block.id, { ...block.data, type: e.target.value })}>
                        <option>Download Free Checklist</option>
                        <option>Open Business System</option>
                        <option>Become a Member</option>
                        <option>Start Learning</option>
                        <option>View Related Guide</option>
                      </select>
                      <input className={inputCls} value={block.data?.title || ''} onChange={e => updateBlock(block.id, { ...block.data, title: e.target.value })} placeholder="CTA Title..." />
                      <textarea className={inputCls} rows={2} value={block.data?.description || ''} onChange={e => updateBlock(block.id, { ...block.data, description: e.target.value })} placeholder="CTA Description..." />
                      <div className="flex gap-2">
                        <input className={inputCls} value={block.data?.buttonText || ''} onChange={e => updateBlock(block.id, { ...block.data, buttonText: e.target.value })} placeholder="Button text..." />
                        <input className={inputCls} value={block.data?.linkUrl || ''} onChange={e => updateBlock(block.id, { ...block.data, linkUrl: e.target.value })} placeholder="Link URL..." />
                      </div>
                    </div>
                  )}
                  {block.type === 'download' && (
                    <div className="space-y-2">
                      <input className={inputCls} value={block.data?.filename || ''} onChange={e => updateBlock(block.id, { ...block.data, filename: e.target.value })} placeholder="File name..." />
                      <div className="flex gap-2">
                        <input className={inputCls} value={block.data?.size || ''} onChange={e => updateBlock(block.id, { ...block.data, size: e.target.value })} placeholder="File size (e.g. 1.2 MB)" />
                        <input className={inputCls} value={block.data?.url || ''} onChange={e => updateBlock(block.id, { ...block.data, url: e.target.value })} placeholder="Download URL..." />
                      </div>
                    </div>
                  )}
                  {block.type === 'video' && (
                    <input className={inputCls} value={block.data?.url || ''} onChange={e => updateBlock(block.id, { ...block.data, url: e.target.value })} placeholder="Video URL..." />
                  )}
                  {block.type === 'code' && (
                    <div className="space-y-2">
                      <select className={inputCls} value={block.data?.language || 'javascript'} onChange={e => updateBlock(block.id, { ...block.data, language: e.target.value })}>
                        {['javascript', 'typescript', 'python', 'bash', 'json', 'html', 'css', 'sql'].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <textarea className={inputCls + ' font-mono text-xs'} rows={6} value={block.data?.code || ''} onChange={e => updateBlock(block.id, { ...block.data, code: e.target.value })} placeholder="Code here..." />
                    </div>
                  )}
                  {block.type === 'divider' && (
                    <select className={inputCls} value={block.data?.style || 'solid'} onChange={e => updateBlock(block.id, { ...block.data, style: e.target.value })}>
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                    </select>
                  )}
                  {(block.type === 'checklist') && (
                    <div className="space-y-2">
                      <input className={inputCls} value={block.data?.title || ''} onChange={e => updateBlock(block.id, { ...block.data, title: e.target.value })} placeholder="Checklist title..." />
                      {(block.data?.items || []).map((item: any, i: number) => (
                        <div key={i} className="flex gap-2">
                          <input className={inputCls} value={item.text || ''} onChange={e => {
                            const items = [...(block.data?.items || [])];
                            items[i] = { ...item, text: e.target.value };
                            updateBlock(block.id, { ...block.data, items });
                          }} placeholder={`Item ${i + 1}...`} />
                          <button type="button" onClick={() => {
                            const items = (block.data?.items || []).filter((_: any, j: number) => j !== i);
                            updateBlock(block.id, { ...block.data, items });
                          }} className="text-navy-300 hover:text-red-500"><X className="h-4 w-4" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => updateBlock(block.id, { ...block.data, items: [...(block.data?.items || []), { text: '' }] })}
                        className="text-xs font-semibold text-brand hover:underline">+ Add item</button>
                    </div>
                  )}
                  {block.type === 'faq' && (
                    <div className="space-y-3">
                      {(block.data?.questions || []).map((faq: any, i: number) => (
                        <div key={i} className="rounded-lg border border-navy-50 p-3 space-y-2">
                          <input className={inputCls} value={faq.q || ''} onChange={e => {
                            const questions = [...(block.data?.questions || [])];
                            questions[i] = { ...faq, q: e.target.value };
                            updateBlock(block.id, { ...block.data, questions });
                          }} placeholder="Question..." />
                          <textarea className={inputCls} rows={2} value={faq.a || ''} onChange={e => {
                            const questions = [...(block.data?.questions || [])];
                            questions[i] = { ...faq, a: e.target.value };
                            updateBlock(block.id, { ...block.data, questions });
                          }} placeholder="Answer..." />
                        </div>
                      ))}
                      <button type="button" onClick={() => updateBlock(block.id, { ...block.data, questions: [...(block.data?.questions || []), { q: '', a: '' }] })}
                        className="text-xs font-semibold text-brand hover:underline">+ Add Q&A</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ATTACHMENTS TAB */}
          {activeTab === 'attachments' && (
            <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-navy-800">Attachments & Downloads</p>
                <button type="button" onClick={() => set('attachments', [...draft.attachments, { id: newId(), name: '', size: '', type: 'PDF', url: '' }])}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              {draft.attachments.map((att, i) => (
                <div key={att.id} className="rounded-xl border border-navy-50 p-3 space-y-2">
                  <div className="flex gap-2">
                    <input className={inputCls} value={att.name} onChange={e => {
                      const attachments = [...draft.attachments];
                      attachments[i] = { ...att, name: e.target.value };
                      set('attachments', attachments);
                    }} placeholder="File name..." />
                    <button type="button" onClick={() => set('attachments', draft.attachments.filter((_, j) => j !== i))} className="text-navy-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input className={inputCls} value={att.url} onChange={e => {
                      const attachments = [...draft.attachments];
                      attachments[i] = { ...att, url: e.target.value };
                      set('attachments', attachments);
                    }} placeholder="URL..." />
                    <input className={inputCls + ' w-28'} value={att.size} onChange={e => {
                      const attachments = [...draft.attachments];
                      attachments[i] = { ...att, size: e.target.value };
                      set('attachments', attachments);
                    }} placeholder="Size..." />
                  </div>
                </div>
              ))}
              {draft.attachments.length === 0 && <p className="text-sm text-navy-400 text-center py-4">No attachments yet.</p>}
            </div>
          )}

          {/* RELATED TAB */}
          {activeTab === 'related' && (
            <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-navy-800">Related Content</p>
                <button type="button" onClick={() => set('relatedContent', [...draft.relatedContent, { id: newId(), title: '', type: 'Article', url: '' }])}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              {draft.relatedContent.map((rel, i) => (
                <div key={rel.id} className="rounded-xl border border-navy-50 p-3 space-y-2">
                  <div className="flex gap-2">
                    <input className={inputCls} value={rel.title} onChange={e => {
                      const rc = [...draft.relatedContent];
                      rc[i] = { ...rel, title: e.target.value };
                      set('relatedContent', rc);
                    }} placeholder="Title..." />
                    <button type="button" onClick={() => set('relatedContent', draft.relatedContent.filter((_, j) => j !== i))} className="text-navy-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select className={inputCls} value={rel.type} onChange={e => {
                      const rc = [...draft.relatedContent];
                      rc[i] = { ...rel, type: e.target.value as any };
                      set('relatedContent', rc);
                    }}>
                      {['Article', 'Download', 'Template', 'Product', 'Business System', 'Video', 'Academy Course', 'Journey'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input className={inputCls} value={rel.url} onChange={e => {
                      const rc = [...draft.relatedContent];
                      rc[i] = { ...rel, url: e.target.value };
                      set('relatedContent', rc);
                    }} placeholder="URL..." />
                  </div>
                </div>
              ))}
              {draft.relatedContent.length === 0 && <p className="text-sm text-navy-400 text-center py-4">No related content yet.</p>}
            </div>
          )}

          {/* FEATURED TAB */}
          {activeTab === 'featured' && (
            <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card space-y-4">
              <p className="text-sm font-bold text-navy-800">Featured Options</p>
              {[
                { key: 'featured', label: 'Featured Asset', desc: 'Highlighted across the platform' },
                { key: 'featuredOnHomepage', label: 'Featured on Homepage', desc: 'Shown in the homepage knowledge section' },
                { key: 'featuredOnCategory', label: 'Featured on Category', desc: 'Pinned at the top of its category page' },
                { key: 'trending', label: 'Trending', desc: 'Shown in trending sections' },
                { key: 'editorsPick', label: "Editor's Pick", desc: "Highlighted as a manually curated recommendation" },
              ].map(opt => (
                <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!(draft.featuredOptions as any)[opt.key]}
                    onChange={e => setFeatured(opt.key, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-brand" />
                  <div>
                    <p className="text-sm font-semibold text-navy-800">{opt.label}</p>
                    <p className="text-xs text-navy-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* SEO TAB */}
          {activeTab === 'seo' && (
            <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card space-y-4">
              <p className="text-sm font-bold text-navy-800">Search Engine Optimization</p>
              <div>
                <label className={labelCls}>SEO Title</label>
                <input className={inputCls} value={draft.seo.title} onChange={e => setSeo('title', e.target.value)} placeholder="SEO title (50-60 chars recommended)..." />
                <p className="mt-1 text-[10px] text-navy-400">{draft.seo.title.length} characters</p>
              </div>
              <div>
                <label className={labelCls}>Meta Description</label>
                <textarea className={inputCls} rows={3} value={draft.seo.metaDescription} onChange={e => setSeo('metaDescription', e.target.value)} placeholder="Meta description (150-160 chars)..." />
                <p className="mt-1 text-[10px] text-navy-400">{draft.seo.metaDescription.length} characters</p>
              </div>
              <div>
                <label className={labelCls}>Canonical URL</label>
                <input className={inputCls} value={draft.seo.canonicalUrl} onChange={e => setSeo('canonicalUrl', e.target.value)} placeholder="https://bgrowthclub.com/knowledge/..." />
              </div>
              <div>
                <label className={labelCls}>Open Graph Image URL</label>
                <input className={inputCls} value={draft.seo.ogImage} onChange={e => setSeo('ogImage', e.target.value)} placeholder="https://..." />
                {draft.seo.ogImage && <img src={draft.seo.ogImage} alt="OG Preview" className="mt-2 h-32 w-full rounded-lg object-cover border border-navy-100" />}
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-navy-700">
                  <input type="checkbox" checked={draft.seo.index} onChange={e => setSeo('index', e.target.checked)} className="h-4 w-4 rounded accent-brand" />
                  Index
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-navy-700">
                  <input type="checkbox" checked={draft.seo.follow} onChange={e => setSeo('follow', e.target.checked)} className="h-4 w-4 rounded accent-brand" />
                  Follow
                </label>
              </div>

              {/* OG Preview */}
              <div className="rounded-xl border border-navy-100 overflow-hidden max-w-sm">
                <div className="h-32 bg-navy-100 overflow-hidden">
                  {draft.seo.ogImage ? <img src={draft.seo.ogImage} alt="OG" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-navy-100" />}
                </div>
                <div className="p-3 bg-white border-t border-navy-50">
                  <p className="text-[10px] text-blue-600 font-bold uppercase">bgrowthclub.com</p>
                  <p className="text-xs font-bold text-navy-800 mt-0.5 truncate">{draft.seo.title || draft.title}</p>
                  <p className="text-[11px] text-navy-400 line-clamp-2 mt-0.5">{draft.seo.metaDescription || draft.excerpt}</p>
                </div>
              </div>
            </div>
          )}

          {/* PUBLISHING TAB */}
          {activeTab === 'publishing' && (
            <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card space-y-4">
              <KnowledgeReleasePanel
                item={draft}
                saveFirst={() => onSaveInPlace(draft)}
                onChanged={(saved) => {
                  setDraft(d => ({ ...d, publishing: { ...d.publishing, ...pickRelease(saved) } }));
                  onReleaseChanged(saved);
                }}
              />
              <p className="text-sm font-bold text-navy-800">Publishing Settings</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Who can read it</label>
                  {/* Free by default since 30/10/2026 (Portal migration 0072):
                      an article nobody marks is open to everyone, so the
                      Knowledge hub can be open before launch without sending
                      a reader to the closed sign-up. Mark the restricted
                      ones here. */}
                  <select className={inputCls} value={draft.publishing.access ?? 'everyone'} onChange={e => setPublishing('access', e.target.value)}>
                    <option value="everyone">Everyone — the whole article is open (default)</option>
                    <option value="members">Members — visitors see the start and are asked to sign up</option>
                    {sitePlans.map(p => (
                      <option key={p.slug} value={`plan:${p.slug}`}>{p.name} plan or above — others see the start and the plans</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Visibility</label>
                  <select className={inputCls} value={draft.publishing.visibility} onChange={e => setPublishing('visibility', e.target.value as VisibilityType)}>
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                    <option value="Unlisted">Unlisted</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Original date (shown on the article)</label>
                  <input type="date" className={inputCls} value={draft.publishing.publishDate} onChange={e => setPublishing('publishDate', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Future Website URL</label>
                <input className={inputCls} value={draft.publishing.futureWebsiteUrl} onChange={e => setPublishing('futureWebsiteUrl', e.target.value)} placeholder="https://bgrowthclub.com/knowledge/..." />
              </div>
              <div>
                <label className={labelCls}>Publication Notes</label>
                <textarea className={inputCls} rows={3} value={draft.publishing.publicationNotes} onChange={e => setPublishing('publicationNotes', e.target.value)} placeholder="Internal notes about this publication..." />
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
