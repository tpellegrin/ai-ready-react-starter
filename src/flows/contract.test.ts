import { validateFlowContract } from './contract';

const page = { path: '' };
const routesFor = (...paths: string[]) => ({
  onboarding: paths.map((path) => ({ ...page, path })),
});

describe('validateFlowContract', () => {
  it('accepts a flow whose ids, paths, order and routes agree', () => {
    const flows = {
      setup: {
        start: '/flow/setup/start',
        finish: '/flow/setup/finish',
        __order: ['start', 'finish'],
      },
    };
    expect(
      validateFlowContract(
        flows,
        routesFor('/flow/setup/start', '/flow/setup/finish'),
      ),
    ).toEqual([]);
  });

  it('rejects a flow id that does not match its URL segment', () => {
    const problems = validateFlowContract(
      { myFlow: { start: '/flow/my-flow/start' } },
      routesFor('/flow/my-flow/start'),
    );
    expect(problems).toEqual([
      expect.stringContaining('flow ids are kebab-case URL segments'),
      expect.stringContaining(
        'uses the flow segment "my-flow", but the flow id is "myFlow"',
      ),
    ]);
  });

  it('rejects step paths outside /flow/<id>/<step> and duplicated paths', () => {
    const problems = validateFlowContract(
      {
        setup: { start: '/setup/start', again: '/flow/setup/start' },
        other: { start: '/flow/setup/start' },
      },
      routesFor('/setup/start', '/flow/setup/start'),
    );
    expect(problems).toEqual([
      expect.stringContaining(
        '"/setup/start" must have the shape /flow/setup/<step>',
      ),
      expect.stringContaining(
        '"/flow/setup/start" uses the flow segment "setup", but the flow id is "other"',
      ),
      expect.stringContaining('is also declared as paths.flow["setup"].again'),
    ]);
  });

  it('rejects an explicit order with unknown, repeated or missing steps', () => {
    const problems = validateFlowContract(
      {
        setup: {
          start: '/flow/setup/start',
          middle: '/flow/setup/middle',
          finish: '/flow/setup/finish',
          __order: ['start', 'start', 'end'],
        },
      },
      routesFor(
        '/flow/setup/start',
        '/flow/setup/middle',
        '/flow/setup/finish',
      ),
    );
    expect(problems).toEqual([
      'paths.flow["setup"].__order: "end" is not a step of this flow.',
      'paths.flow["setup"].__order: "start" listed more than once.',
      'paths.flow["setup"].__order: "middle", "finish" missing, so useFlowNav can never reach them.',
    ]);
  });

  it('requires every step to be routed and every /flow/ route to be declared', () => {
    const problems = validateFlowContract(
      { setup: { start: '/flow/setup/start' } },
      routesFor('/flow/setup/extra'),
    );
    expect(problems).toEqual([
      expect.stringContaining(
        '"/flow/setup/start" is not registered in any route group',
      ),
      expect.stringContaining(
        'route "/flow/setup/extra" (onboarding) is under /flow/ but not declared in paths.flow',
      ),
    ]);
  });

  it('rejects a flow without steps', () => {
    expect(
      validateFlowContract({ empty: { __order: [] } }, routesFor()),
    ).toEqual(['paths.flow["empty"]: a flow needs at least one step.']);
  });
});
