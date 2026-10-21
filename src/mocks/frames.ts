/**
 * MSW types an unhandled frame's `data` as unknown; read the HTTP request
 * defensively instead of casting.
 */
export const getUnhandledRequest = (frame: {
  protocol: string;
  data: unknown;
}): Request | null => {
  if (frame.protocol !== 'http') return null;
  const { data } = frame;
  if (typeof data !== 'object' || data === null || !('request' in data)) {
    return null;
  }
  return data.request instanceof Request ? data.request : null;
};
