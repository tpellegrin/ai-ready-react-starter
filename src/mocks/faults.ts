/**
 * One-shot fault injection for the reference API (dev/demo/tests).
 *
 *   sessionStorage.setItem('starter.mocks.faults', 'resources.list')
 *
 * The next matching request fails with a 500; the fault is then consumed, so
 * "Try again" in the UI succeeds. Handlers call consumeFault('<name>').
 */
const FAULTS_KEY = 'starter.mocks.faults';

export const consumeFault = (name: string): boolean => {
  try {
    const faults = (sessionStorage.getItem(FAULTS_KEY) ?? '')
      .split(',')
      .filter(Boolean);
    const index = faults.indexOf(name);
    if (index === -1) return false;
    faults.splice(index, 1);
    sessionStorage.setItem(FAULTS_KEY, faults.join(','));
    return true;
  } catch {
    return false;
  }
};

export const injectFault = (name: string) => {
  const current = sessionStorage.getItem(FAULTS_KEY);
  sessionStorage.setItem(FAULTS_KEY, current ? `${current},${name}` : name);
};
