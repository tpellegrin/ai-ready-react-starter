import { RESERVED_KEYS } from './fromPaths';

const FLOW_PREFIX = '/flow/';
const FLOW_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type FlowDefinitions = Readonly<
  Record<string, Readonly<Record<string, string | readonly string[]>>>
>;
type RouteGroups = Readonly<Record<string, readonly { path: string }[]>>;

/**
 * Structural checks of the flow contract (docs/flows.md) that would
 * otherwise only fail at runtime, in useFlowNav/useFlowProgress:
 *
 * - flow ids are kebab-case and equal to their URL segment
 *   (`/flow/<flowId>/<step>`), and every step path has that shape;
 * - step paths are unique across all flows;
 * - an explicit `__order` lists every step exactly once, and only steps;
 * - every step is registered in a route group, and every `/flow/` route is
 *   declared in `paths.flow` (otherwise it cannot be ordered).
 *
 * Behavior (navigation, completion, guards, focus, transitions) still needs
 * tests. Returns one message per problem, each naming the fix.
 */
export const validateFlowContract = (
  flows: FlowDefinitions,
  routes: RouteGroups,
): string[] => {
  const problems: string[] = [];
  const groupsByPath = new Map<string, string[]>();
  for (const [group, list] of Object.entries(routes)) {
    for (const { path } of list) {
      groupsByPath.set(path, [...(groupsByPath.get(path) ?? []), group]);
    }
  }

  const declared = new Map<string, string>();
  for (const [flowId, definition] of Object.entries(flows)) {
    const where = `paths.flow["${flowId}"]`;
    if (!FLOW_ID.test(flowId)) {
      problems.push(
        `${where}: flow ids are kebab-case URL segments (/flow/${flowId}/… must match the key); rename the key, e.g. "my-flow" for /flow/my-flow/<step>.`,
      );
    }
    const steps = Object.entries(definition).filter(
      ([key]) => !RESERVED_KEYS.has(key),
    );
    if (steps.length === 0) {
      problems.push(`${where}: a flow needs at least one step.`);
    }

    for (const [step, path] of steps) {
      if (typeof path !== 'string') {
        problems.push(
          `${where}.${step}: a step is a path string, "/flow/${flowId}/<step>".`,
        );
        continue;
      }
      const [, idSegment, stepSegment] =
        /^\/flow\/([^/]+)\/([^/?#]+)$/.exec(path) ?? [];
      if (!idSegment || !stepSegment) {
        problems.push(
          `${where}.${step}: "${path}" must have the shape /flow/${flowId}/<step> (the /flow/ prefix enables the flow shell and step order).`,
        );
      } else if (idSegment !== flowId) {
        problems.push(
          `${where}.${step}: "${path}" uses the flow segment "${idSegment}", but the flow id is "${flowId}"; useFlowNav resolves steps from the URL, so they must match.`,
        );
      }
      const owner = declared.get(path);
      if (owner) {
        problems.push(
          `${where}.${step}: "${path}" is also declared as ${owner}; every step needs its own path.`,
        );
      }
      declared.set(path, `${where}.${step}`);
      if (!groupsByPath.has(path)) {
        problems.push(
          `${where}.${step}: "${path}" is not registered in any route group; add { path: paths.flow["${flowId}"].${step}, Component } to src/views/<group>/index.tsx.`,
        );
      }
    }

    const order = definition.__order;
    if (order !== undefined) {
      const keys = steps.map(([key]) => key);
      if (typeof order === 'string') {
        problems.push(`${where}.__order: list the step keys in an array.`);
      } else {
        const unknown = order.filter((key) => !keys.includes(key));
        const repeated = order.filter((key, i) => order.indexOf(key) !== i);
        const missing = keys.filter((key) => !order.includes(key));
        if (unknown.length) {
          problems.push(
            `${where}.__order: ${unknown.map((k) => `"${k}"`).join(', ')} ${unknown.length > 1 ? 'are' : 'is'} not a step of this flow.`,
          );
        }
        if (repeated.length) {
          problems.push(
            `${where}.__order: ${[...new Set(repeated)].map((k) => `"${k}"`).join(', ')} listed more than once.`,
          );
        }
        if (missing.length) {
          problems.push(
            `${where}.__order: ${missing.map((k) => `"${k}"`).join(', ')} missing, so useFlowNav can never reach ${missing.length > 1 ? 'them' : 'it'}.`,
          );
        }
      }
    }
  }

  for (const [path, groups] of groupsByPath) {
    if (path.startsWith(FLOW_PREFIX) && !declared.has(path)) {
      problems.push(
        `route "${path}" (${groups.join(', ')}) is under /flow/ but not declared in paths.flow (src/globals/paths.ts), so the flow helpers cannot order it.`,
      );
    }
  }
  return problems;
};
