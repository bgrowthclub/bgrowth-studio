import { getSupabaseAdmin } from '../supabaseAdmin.js';

/**
 * The AI Provider abstraction's routing table — content_engine.provider_task_config
 * decides which provider/model handles a given task_type, so reassigning a
 * task later (e.g. moving campaign_strategy to a stronger-reasoning model)
 * is a row update, never a code change. Gemini is the only provider actually
 * implemented in Phase 1 (see geminiProvider.js); falling back to it here
 * when a task_type has no row keeps this from ever hard-failing on a
 * missing config row.
 */
export async function getProviderForTask(taskType) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .schema('content_engine')
    .from('provider_task_config')
    .select('provider, model')
    .eq('task_type', taskType)
    .maybeSingle();

  return data ?? { provider: 'gemini', model: 'gemini-2.0-flash' };
}
