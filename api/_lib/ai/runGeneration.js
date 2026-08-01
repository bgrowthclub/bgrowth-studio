import { getProviderForTask } from './registry.js';
import { generateWithGemini } from './geminiProvider.js';

// Every provider implementation takes the same { model, prompt } shape and
// returns parsed JSON — this is the whole seam a second provider plugs into.
const GENERATORS = {
  gemini: generateWithGemini,
};

/**
 * The Content Engine's single entry point into the AI Provider abstraction.
 * Callers (api/content-engine/generate.js) never know or care which
 * provider/model actually ran — they pass a task_type (used only for
 * routing, see registry.js) and a fully-composed prompt, and get back
 * { provider, model, output }, where output is already-parsed JSON matching
 * whatever shape the prompt asked for.
 */
export async function runGeneration({ taskType, prompt }) {
  const { provider, model } = await getProviderForTask(taskType);
  const generate = GENERATORS[provider];
  if (!generate) {
    throw new Error(`No AI provider registered for "${provider}".`);
  }

  const output = await generate({ model, prompt });
  return { provider, model, output };
}
