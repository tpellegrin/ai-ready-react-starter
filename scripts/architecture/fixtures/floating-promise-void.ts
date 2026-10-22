// @fixture-path src/utils/__arch__/fireAndForget.ts
// @expect @typescript-eslint/no-floating-promises: Promises must be awaited
// `void` does not handle a rejection: use runDetached(promise, onError).
export const save = (task: () => Promise<void>) => {
  void task();
};
