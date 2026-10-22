import { validateFlowContract } from 'flows/contract';
import { flowPaths } from 'globals/paths';

import { routeTable } from './routeTable';

/**
 * The app's flows against the app's route groups: a misnamed flow, a step
 * missing from the routes or a stray /flow/ route fails here, before
 * anything renders (rules and limits in src/flows/contract.ts).
 */
describe('flow contract', () => {
  it('paths.flow and the route table agree', () => {
    expect(validateFlowContract(flowPaths, routeTable)).toEqual([]);
  });
});
