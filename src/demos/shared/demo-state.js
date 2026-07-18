export function createDemoState(initialState, reducer) {
  let state = structuredClone(initialState);
  const listeners = new Set();
  return { get: () => state, dispatch(action) { state = reducer(state, action); listeners.forEach((fn) => fn(state)); return state; }, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
}
