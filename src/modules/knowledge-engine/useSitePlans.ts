import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export interface SitePlan {
  slug: string;
  name: string;
  rank: number;
}

// The paid plans set up in the Website's Admin → Plans (portal.membership_plans,
// public read), for "Who can read it": an article can be for members on a
// plan or a higher one. Empty until Portal migration 0057 has run.
export function useSitePlans(): SitePlan[] {
  const [plans, setPlans] = useState<SitePlan[]>([]);
  useEffect(() => {
    supabase
      .schema('portal')
      .from('membership_plans')
      .select('slug, name, rank, is_free')
      .order('rank')
      .then(({ data, error }) => {
        if (error || !data) return;
        setPlans((data as (SitePlan & { is_free: boolean })[]).filter(p => !p.is_free).map(({ slug, name, rank }) => ({ slug, name, rank })));
      });
  }, []);
  return plans;
}
