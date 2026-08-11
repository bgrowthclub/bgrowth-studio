import { type PlannerConfig } from './types';
import { PlannerFill } from './PlannerFill';

/**
 * Builder → Preview → Fill, made an explicit pipeline node.
 *
 * This is deliberately a thin pass-through, not a second renderer: Preview
 * must show exactly what a member filling out this planner would see, off
 * the same canonical `sections[].blocks[]` the Builder edits and Fill
 * renders for real — never a separate preview-only data model or layout
 * engine. Reusing PlannerFill directly is what guarantees that; a
 * genuinely read-only variant would mean maintaining a second renderer
 * that could quietly drift from Fill, which is exactly what this avoids.
 *
 * The `preview-` id prefix routes any in-preview fill interactions to
 * their own localStorage key, so previewing never touches the real
 * planner's own saved fill progress (`bgrowth.planner.fill.<real id>`).
 * No `onBack` is passed — PlannerFill hides its Back button when omitted;
 * the Builder/Preview/Fill Preview tab strip is how you leave.
 */
export function PlannerPreview({ planner }: { planner: PlannerConfig }) {
  return <PlannerFill planner={{ ...planner, id: `preview-${planner.id}` }} />;
}
