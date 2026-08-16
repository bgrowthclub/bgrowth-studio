import { useState } from 'react';
import { X, Clipboard, AlertCircle } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';

interface ImportTemplateJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (name: string, configJson: string) => Promise<void>;
}

export function ImportTemplateJsonModal({ isOpen, onClose, onImport }: ImportTemplateJsonModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleFillExample = () => {
    const example = {
      productId: "checklist-custom-import-example",
      brand: {
        name: "Inspeção de Segurança Exemplo",
        companyLabel: "BGrowth",
        primaryColor: "#E11D48"
      },
      footer: {
        proTip: "Verifique todas as mangueiras e lacres.",
        helpText: "Contato com o supervisor em caso de inconformidade."
      },
      sections: [
        {
          id: "sec_info",
          number: 1,
          type: "form",
          title: "Informações Básicas",
          description: "Insira os dados da vistoria e local.",
          fields: [
            { id: "local", label: "Local / Filial", type: "text", required: true, placeholder: "Ex: Ala Sul" },
            { id: "data_inspecao", label: "Data da Inspeção", type: "date", required: true }
          ]
        },
        {
          id: "sec_itens",
          number: 2,
          type: "checklist",
          title: "Checklist de Prevenção de Incêndio",
          description: "Siga as diretrizes de conformidade normativa.",
          items: [
            { id: "item_extintor", label: "Extintores desobstruídos e com pressão na faixa verde", required: true },
            { id: "item_saidas", label: "Saídas de emergência totalmente livres de obstáculos", required: true },
            { id: "item_sinalizacao", label: "Sinalização fotoluminescente visível e sem avarias", required: false }
          ]
        }
      ]
    };
    setJsonText(JSON.stringify(example, null, 2));
    setError(null);
  };

  const handleImport = async () => {
    setError(null);
    if (!jsonText.trim()) {
      setError('Por favor, cole o JSON do modelo primeiro.');
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);

      if (!parsed.brand?.name && !parsed.name && !parsed.templateName) {
        setError('O JSON deve conter pelo menos um atributo "name", "templateName" ou "brand.name".');
        return;
      }
      if (!Array.isArray(parsed.sections)) {
        setError('O modelo deve conter uma lista "sections" válida.');
        return;
      }

      setImporting(true);
      const name = parsed.brand?.name || parsed.name || parsed.templateName || 'Checklist Customizado Importado';

      const normalizedSections = parsed.sections.map((s: any, si: number) => ({
        ...s,
        id: s.id || `sec_${si + 1}`,
        number: s.number || si + 1,
        items: Array.isArray(s.items)
          ? s.items.map((item: any, ii: number) =>
              typeof item === 'string'
                ? { id: `item_${si}_${ii}`, label: item, required: false }
                : item
            )
          : [],
      }));

      const normalized = {
        ...parsed,
        brand: parsed.brand ?? { name, companyLabel: 'BGrowth', primaryColor: '#1061EC' },
        sections: normalizedSections,
      };

      await onImport(name, JSON.stringify(normalized));
      setJsonText('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? `Erro de sintaxe JSON: ${err.message}` : 'JSON inválido.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-navy-100 bg-white shadow-xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-50 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-navy-900">Importar Modelo de Checklist (JSON)</h3>
            <p className="text-xs text-navy-400">Cole uma configuração em JSON para criar o checklist instantaneamente</p>
          </div>
          <button
            type="button"
            onClick={() => { setJsonText(''); setError(null); onClose(); }}
            className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-50 hover:text-navy-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-4 flex justify-between items-center">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
              Conteúdo JSON do Modelo
            </label>
            <button
              type="button"
              onClick={handleFillExample}
              className="text-xs font-semibold text-brand hover:text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg transition-colors"
            >
              Preencher Exemplo
            </button>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setError(null); }}
            placeholder={`{\n  "brand": {\n    "name": "Meu Checklist Customizado",\n    "companyLabel": "Empresa",\n    "primaryColor": "#1061EC"\n  },\n  "sections": []\n}`}
            className="h-72 w-full rounded-xl border border-navy-100 bg-white p-3 font-mono text-xs text-navy-800 placeholder-navy-300 shadow-sm focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
          />

          <p className="mt-3 text-xs text-navy-400 leading-relaxed bg-navy-50/50 rounded-xl p-3">
            💡 <strong>Dica:</strong> Você pode exportar qualquer checklist existente como JSON usando o botão de download, alterar os campos ou estrutura, e importá-lo novamente aqui para criar novos modelos rapidamente.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-navy-50 px-5 py-4 bg-navy-50/30">
          <SecondaryButton size="sm" onClick={() => { setJsonText(''); setError(null); onClose(); }}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton
            size="sm"
            onClick={handleImport}
            disabled={!jsonText.trim() || importing}
          >
            {importing ? 'Importando...' : 'Importar Modelo'}
          </PrimaryButton>
        </div>

      </div>
    </div>
  );
}