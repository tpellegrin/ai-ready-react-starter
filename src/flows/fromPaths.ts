import { flowPaths } from 'globals/paths';

// Reserved keys that should not be treated as step keys inside a flow object
const RESERVED_KEYS = new Set<string>(['_meta', '__order']);

// Generic Flow Definition based on paths
// Note: This expects a 'flow' object in paths if you want to use these helpers
export type FlowId = string;
type FlowDef = Readonly<Record<string, string | readonly string[]>>;
type FlowStepKey = string;

const FLOWS: Readonly<Record<FlowId, FlowDef>> = flowPaths;

const isFlowStepKey = (key: string): key is FlowStepKey =>
  !RESERVED_KEYS.has(key);

const getFlowDef = (flowId: FlowId): FlowDef => FLOWS[flowId] ?? {};

export const isFlowId = (value: string): value is FlowId =>
  Object.hasOwn(FLOWS, value);

/**
 * Parse the current pathname into flowId and step SEGMENT as it appears in the URL.
 * Expected shape: /flow/:flowId/:step
 */
export function parseFlowFromPath(pathname: string): {
  flowId?: string | undefined;
  step?: string | undefined;
} {
  const [prefix, flowId, step] = pathname.split('/').filter(Boolean);
  if (prefix !== 'flow' || !flowId || !step) {
    return { flowId: undefined, step: undefined };
  }
  return { flowId, step };
}

/**
 * Returns the ordered list of STEP KEYS for a given flow (object keys order or explicit __order).
 */
export function getOrderedStepKeys(flowId: FlowId): FlowStepKey[] {
  const def = getFlowDef(flowId);
  const explicit = def.__order;
  if (typeof explicit !== 'string' && explicit?.length) return [...explicit];
  return Object.keys(def).filter(isFlowStepKey);
}

/**
 * Internal: Given a flow and a URL segment, find the corresponding step KEY from paths.ts.
 */
function getKeyByPathSegment(
  flowId: FlowId,
  segment: string,
): FlowStepKey | null {
  const def = getFlowDef(flowId);
  for (const key of getOrderedStepKeys(flowId)) {
    const value = def[key];
    if (typeof value !== 'string') continue;
    const last = value.split('/').filter(Boolean).pop();
    if (last === segment) return key;
  }
  return null;
}

/**
 * Normalize a provided step segment to a step KEY.
 */
function ensureStepKey(flowId: FlowId, stepOrSegment: string): FlowStepKey {
  const steps = getOrderedStepKeys(flowId);
  if (steps.includes(stepOrSegment)) {
    return stepOrSegment;
  }
  const mapped = getKeyByPathSegment(flowId, stepOrSegment);
  return mapped ?? stepOrSegment;
}

export function getStepIndex(
  flowId: FlowId,
  step: string,
): { steps: FlowStepKey[]; idx: number } {
  const steps = getOrderedStepKeys(flowId);
  const key = ensureStepKey(flowId, step);
  return { steps, idx: steps.findIndex((s) => s === key) };
}

export function getNextStepPath(flowId: FlowId, step: string): string | null {
  const { steps, idx } = getStepIndex(flowId, step);
  if (idx < 0) return null;
  const nextKey = steps[idx + 1];
  if (!nextKey) return null;
  const def = getFlowDef(flowId);
  const path = def[nextKey];
  return typeof path === 'string' ? path : null;
}

export function getPrevStepPath(flowId: FlowId, step: string): string | null {
  const { steps, idx } = getStepIndex(flowId, step);
  if (idx <= 0) return null;
  const prevKey = steps[idx - 1];
  if (!prevKey) return null;
  const def = getFlowDef(flowId);
  const path = def[prevKey];
  return typeof path === 'string' ? path : null;
}

/**
 * Optional centralized dynamic step skipping.
 */
export type CanEnterFn<State = unknown> = (state: State) => boolean;

/**
 * Find the next applicable step path, skipping steps whose guard denies entry.
 * If no applicable step is found, returns null.
 */
export function getNextApplicableStepPath<T = unknown>(
  flowId: FlowId,
  step: string,
  state?: T,
  guards?: Partial<Record<string, CanEnterFn<T>>>,
): string | null {
  const { steps, idx } = getStepIndex(flowId, step);
  if (idx < 0) return null;
  const def = getFlowDef(flowId);

  for (const key of steps.slice(idx + 1)) {
    const guard = guards?.[key];
    if (guard && state && !guard(state)) continue;
    const path = def[key];
    if (typeof path === 'string') return path;
  }
  return null;
}
