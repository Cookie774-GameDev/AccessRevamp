export function createLifecycle() {
  const cleanupCallbacks = new Set();

  return {
    add(cleanup) {
      if (typeof cleanup === 'function') cleanupCallbacks.add(cleanup);
      return cleanup;
    },
    cleanup() {
      for (const callback of cleanupCallbacks) callback();
      cleanupCallbacks.clear();
    },
  };
}
