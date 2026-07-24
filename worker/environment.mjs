export function installWorkerEnvironment(bindings, target = process.env) {
  for (const [name, value] of Object.entries(bindings || {})) {
    if (typeof value === 'string') target[name] = value;
  }
  return target;
}
