/**
 * Core config schema for the Checklist Generator Engine.
 *
 * A ChecklistConfig fully describes a checklist product: its branding,
 * its footer copy, and an ordered list of sections. Every UI component in
 * `src/engine` reads from this shape instead of hardcoded product data —
 * swap the config, get a different product, with no component changes.
 */

// Definição limpa e corrigida dos tipos de campos suportados
export type FieldType = 
  | 'text' 
  | 'email' 
  | 'phone' 
  | 'date' 
  | 'time' 
  | 'number' 
  | 'select' 
  | 'textarea' 
  | 'title' 
  | 'static_text' 
  | 'image' 
  | 'static_image' 
  | 'checkbox' 
  | 'link' 
  | 'file';

export interface FieldConfig {
  id: string;
  label: string;
  type: FieldType;
  icon: string;
  required?: boolean;
  placeholder?: string;
  /** Para o tipo static_image: armazena a imagem de referência em base64 compactada */
  staticImageUrl?: string;
  /** Required for type === 'select'. */
  options?: string[];
  /** sm:col-span-2 style full-width hint for the field grid. */
  fullWidth?: boolean;
}

export interface ChecklistItemConfig {
  id: string;
  label: string;
}

export type SectionType = 'form' | 'checklist' | 'notes' | 'outcome';

interface SectionBase {
  id: string;
  number: number;
  title: string;
  description: string;
  /** lucide-react icon name, e.g. "user", "calendar-days". See engine/icons.ts. */
  icon: string;
  optional?: boolean;
  whyItMatters?: string;
  tip?: string;
}

export interface FormSectionConfig extends SectionBase {
  type: 'form';
  fields: FieldConfig[];
}

export interface ChecklistSectionConfig extends SectionBase {
  type: 'checklist';
  items: ChecklistItemConfig[];
}

export interface NotesSectionConfig extends SectionBase {
  type: 'notes';
}

export interface OutcomeSectionConfig extends SectionBase {
  type: 'outcome';
  items: ChecklistItemConfig[];
}

export type SectionConfig = FormSectionConfig | ChecklistSectionConfig | NotesSectionConfig | OutcomeSectionConfig;

export interface BrandConfig {
  name: string;
  companyLabel: string;
  /** Base hex color; the engine derives a full 50–900 scale from it at runtime. */
  primaryColor: string;
}

export interface FooterConfig {
  proTip: string;
  helpText: string;
  helpUrl?: string;
}

/**
 * Publishing/storefront metadata for this checklist — cover image,
 * description, pricing, and publish state. Lives inside ChecklistConfig
 * (persisted verbatim in configJson via api_saveTemplate, Studio's own
 * template storage) specifically so it round-trips through Studio itself
 * on every save/load, independent of the Portal. Sent to the Portal at
 * publish time too (see draftToConfig/publishToPortal), but the Portal's
 * own content schema (bgrowth-portal's workspaceContentSchema) doesn't
 * recognize this key and silently drops it when storing — harmless,
 * since the Portal already receives the same values as dedicated
 * top-level publish fields (shortDescription/coverImage/priceCents/etc.)
 * and stores those in its own products columns. This object exists purely
 * so Studio remembers what it last published without needing the Portal.
 */
export interface PublishingMetadata {
  shortDescription?: string;
  coverImageUrl?: string;
  isFree?: boolean;
  /** In cents — null/undefined when isFree is true. */
  priceCents?: number | null;
  currency?: string;
  stripePriceId?: string | null;
  /** Whether this checklist has ever been published to the Portal, and its current state there — distinct from ChecklistTemplate.status (Active/Archived), which is Studio's own unrelated template-management lifecycle. */
  status: 'draft' | 'published' | 'archived';
  /** ISO timestamp of the most recent successful publish — set once, never cleared by archiving. Undefined/null until the first publish. */
  publishedAt?: string | null;
}

export interface ChecklistConfig {
  productId: string;
  brand: BrandConfig;
  footer: FooterConfig;
  sections: SectionConfig[];
  publishing?: PublishingMetadata;
}

/** Generic filled-in data shape. Keyed by section id.
 *  - form sections    -> Record<fieldId, string>
 *  - checklist/outcome -> Record<itemId, boolean>
 *  - notes sections   -> string
 */
export type ChecklistData = Record<string, Record<string, string> | Record<string, boolean> | string>;
