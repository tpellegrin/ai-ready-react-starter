import { consumeFault, injectFault } from './faults';

describe('mock fault injection', () => {
  it('fails the next matching request once per injected fault', () => {
    expect(consumeFault('items.list')).toBe(false);

    injectFault('items.list');
    injectFault('items.list');
    injectFault('items.save');

    expect(consumeFault('items.list')).toBe(true);
    expect(consumeFault('items.list')).toBe(true);
    expect(consumeFault('items.list')).toBe(false);
    expect(consumeFault('items.save')).toBe(true);
  });
});
