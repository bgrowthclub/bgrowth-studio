import { safeHtml, safeUrl } from '../../lib/safeContent';
import { useFormContext } from 'react-hook-form';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { FormField } from '../../components/ui/FormField';
import { getIcon } from '../icons';
import type { FieldConfig } from '../types';
import { RichTextarea } from './RichTextarea';

interface FieldRendererProps {
  sectionId: string;
  field: FieldConfig;
}

export function FieldRenderer({ sectionId, field }: FieldRendererProps) {
  const { register, formState: { errors } } = useFormContext();
  const Icon = getIcon(field.icon);
  const fieldId = `${sectionId}-${field.id}`;
  const path = `${sectionId}.${field.id}`;
  const sectionErrors = (errors[sectionId] as Record<string, { message?: string }> | undefined) ?? {};
  const errorMessage = sectionErrors[field.id]?.message;

  if (field.type === 'title') {
    return (
      <div className="sm:col-span-2 mt-4 first:mt-0 pb-1 border-b border-navy-50/50">
        <h3 className="text-base font-bold text-navy-800 tracking-tight">
          {field.label}
        </h3>
      </div>
    );
  }

  if (field.type === 'static_text') {
    return (
      <div className="sm:col-span-2 pt-1">
        <p className="text-sm text-navy-500 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: safeHtml(field.label) }} />
      </div>
    );
  }

  if (field.type === 'image') {     return (       <div className={field.fullWidth !== false ? 'sm:col-span-2' : undefined}>         {field.placeholder && (           <img src={field.placeholder} alt={field.label} className="w-full rounded-lg object-cover border border-navy-100 max-h-64" />         )}         {field.label && <p className="mt-1 text-center text-xs text-navy-400">{field.label}</p>}       </div>     );   }    if (field.type === 'file') {     return (       <div className={field.fullWidth !== false ? 'sm:col-span-2' : undefined}>         {field.placeholder && (           <a href={safeUrl(field.placeholder)} download={field.label || 'file'}             className="inline-flex items-center gap-2 rounded-lg border border-navy-100 bg-navy-50 px-4 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-100">             {'📎 '}{field.label || 'Download File'}           </a>         )}       </div>     );   }    if (field.type === 'link') {
    const raw = field.placeholder ?? '';     const href = raw && !raw.startsWith('http://') && !raw.startsWith('https://') && !raw.startsWith('#')       ? 'https://' + raw       : raw || '#';
    const linkLabel = field.label || field.placeholder || href;
    return (
      <div className={field.fullWidth ? 'sm:col-span-2' : undefined}>
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
          {'🔗 '}{linkLabel}
        </a>
      </div>
    );
  }
  
  return (
    <FormField
      label={field.label}
      icon={<Icon />}
      required={field.required}
      error={errorMessage}
      htmlFor={fieldId}
      className={field.fullWidth ? 'sm:col-span-2' : undefined}
    >
      {field.type === 'checkbox' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            id={fieldId}
            type="checkbox"
            className="h-4 w-4 rounded accent-brand"
            {...register(path)}
          />
          <span className="text-sm text-navy-700">{field.placeholder || field.label}</span>
        </label>
      ) : field.type === 'select' ? (
        <Select id={fieldId} hasError={!!errorMessage} {...register(path)}>
          <option value="">Select…</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      ) : field.type === 'textarea' ? (
        <RichTextarea
          id={fieldId}
          placeholder={field.placeholder}
          hasError={!!errorMessage}
          path={path}
        />
      ) : (
        <Input
          id={fieldId}
          type={field.type === 'phone' ? 'tel' : field.type}
          placeholder={field.placeholder}
          hasError={!!errorMessage}
          {...register(path)}
        />
      )}
    </FormField>
  );
}
