import { getProviderForTask } from './registry.js';
import { generateVisionWithGemini } from './geminiProvider.js';

// Mirrors runGeneration.js's GENERATORS table exactly, one modality over —
// image input instead of text-only input. Reuses the SAME
// provider_task_config routing table via getProviderForTask (no new
// persistence, no second routing mechanism), the same way mediaGeneration.js
// (text-to-image output) already does for its own modality.
const VISION_GENERATORS = {
  gemini: generateVisionWithGemini,
};

/**
 * The Social Post Creator's entry point into the AI Provider abstraction
 * for image-analysis (vision) calls — parallel to runGeneration.js, never
 * touching it. Callers pass a task_type (routing only, see registry.js), a
 * composed prompt, and the images to analyze, and get back
 * { provider, model, output }, output already-parsed JSON matching whatever
 * shape the prompt asked for.
 */
export async function runImageAnalysis({ taskType, images, prompt }) {
  const { provider, model } = await getProviderForTask(taskType);
  const generate = VISION_GENERATORS[provider];
  if (!generate) {
    throw new Error(`No vision provider registered for "${provider}".`);
  }

  const output = await generate({ model, prompt, images });
  return { provider, model, output };
}
