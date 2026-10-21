/**
 * Report an error that no UI state is responsible for. Keep this the single
 * place to wire an error-reporting service later.
 */
export const reportUnexpectedError = (error: unknown): void => {
  console.error('[unexpected]', error);
};

/**
 * Start async work from a synchronous callback (event handler, effect,
 * timer) without leaving a floating promise. Rejections go to `onError`
 * (default: reportUnexpectedError) instead of becoming unhandled.
 *
 * Prefer awaiting inside an async function or letting TanStack Query own the
 * promise. Never use `void promise`, which hides rejections.
 */
export const runDetached = (
  task: PromiseLike<unknown>,
  onError: (error: unknown) => void = reportUnexpectedError,
): void => {
  Promise.resolve(task).catch(onError);
};
