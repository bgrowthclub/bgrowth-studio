import { useEffect, useState } from 'react';
import { searchWorkspaces } from '../api/accessManagementClient';
import type { WorkspaceOption } from '../types';

interface WorkspacePickerProps {
  value: WorkspaceOption | null;
  onChange: (workspace: WorkspaceOption | null) => void;
}

/** Search/select a Workspace by name — reads portal.catalog_index directly (public data), never a manual UUID field. */
export function WorkspacePicker({ value, onChange }: WorkspacePickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WorkspaceOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (value) return; // already selected — no need to keep searching
    setIsSearching(true);
    const timer = setTimeout(() => {
      searchWorkspaces(query)
        .then(setResults)
        .finally(() => setIsSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, value]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-navy-100 bg-navy-50 px-3 py-2">
        <div>
          <p className="text-sm font-semibold text-navy-900">{value.name}</p>
          <p className="text-xs text-navy-400">{value.slug}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-brand-600 hover:underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search Workspace by name..."
        className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-900 outline-none focus:border-brand-500"
      />
      {isSearching && <p className="mt-1.5 text-xs text-navy-400">Searching…</p>}
      {!isSearching && results.length > 0 && (
        <ul className="mt-1.5 max-h-48 divide-y divide-navy-100 overflow-y-auto rounded-lg border border-navy-100 bg-white">
          {results.map((workspace) => (
            <li key={workspace.productId}>
              <button
                type="button"
                onClick={() => onChange(workspace)}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-navy-50"
              >
                <span className="text-sm font-medium text-navy-900">{workspace.name}</span>
                <span className="text-xs text-navy-400">{workspace.slug}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!isSearching && results.length === 0 && (
        <p className="mt-1.5 text-xs text-navy-400">No published Workspaces match.</p>
      )}
    </div>
  );
}
