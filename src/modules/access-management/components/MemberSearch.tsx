import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { searchMembers } from '../api/accessManagementClient';
import type { MemberSummary } from '../types';

interface MemberSearchProps {
  onSelect: (member: MemberSummary) => void;
}

/**
 * The Access Management landing screen — search by email only (per the
 * audited plan: authoritative auth.users email, resolved server-side by
 * /api/access-management?resource=members, never a client-side dump of all users).
 */
export function MemberSearch({ onSelect }: MemberSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setError(null);
      return;
    }
    setIsSearching(true);
    setError(null);
    const timer = setTimeout(() => {
      searchMembers(trimmed)
        .then(setResults)
        .catch((err) => setError(err instanceof Error ? err.message : 'Search failed.'))
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="mx-auto max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
        <input
          type="email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search member by email..."
          className="w-full rounded-xl border border-navy-100 py-2.5 pl-9 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
          autoFocus
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isSearching && <p className="mt-3 text-sm text-navy-400">Searching…</p>}

      {!isSearching && query.trim().length >= 3 && results.length === 0 && !error && (
        <p className="mt-3 text-sm text-navy-400">No member found for that email.</p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100 bg-white">
          {results.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => onSelect(member)}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-navy-50"
              >
                <span className="text-sm font-semibold text-navy-900">{member.fullName || member.email}</span>
                {member.fullName && <span className="text-xs text-navy-400">{member.email}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
