function percent(score) {
  return typeof score === 'number' ? Math.round(score * 100) : null;
}

export function classifyLighthouseResult({ exitCode, report, stderr }) {
  let parsed;
  try {
    parsed = JSON.parse(report);
  } catch {
    return {
      status: 'failed',
      reason: String(stderr || 'Lighthouse report was missing or invalid.').slice(0, 500),
    };
  }

  if (!parsed?.lighthouseVersion || !parsed?.categories) {
    return {
      status: 'failed',
      reason: String(stderr || 'Lighthouse report was missing or invalid.').slice(0, 500),
    };
  }

  if (parsed.runtimeError?.code || parsed.runtimeError?.message) {
    const runtimeCode = parsed.runtimeError.code || 'LIGHTHOUSE_RUNTIME_ERROR';
    const runtimeMessage = parsed.runtimeError.message || 'Lighthouse could not audit the requested page.';
    return {
      status: 'failed',
      reason: `${runtimeCode}: ${runtimeMessage}`.slice(0, 500),
    };
  }

  const result = {
    status: exitCode === 0 ? 'captured' : 'captured-with-runtime-warning',
    lighthouseVersion: parsed.lighthouseVersion,
    scores: {
      performance: percent(parsed.categories.performance?.score),
      accessibility: percent(parsed.categories.accessibility?.score),
      bestPractices: percent(parsed.categories['best-practices']?.score),
      seo: percent(parsed.categories.seo?.score),
    },
  };

  if (exitCode !== 0 && /EPERM[\s\S]*lighthouse\./i.test(String(stderr))) {
    result.status = 'captured-with-cleanup-warning';
    result.warning = 'Lighthouse produced a valid report but could not remove its temporary Chrome profile.';
  } else if (exitCode !== 0) {
    result.warning = String(stderr || `Lighthouse exited with code ${exitCode}.`).slice(0, 500);
  }

  return result;
}
