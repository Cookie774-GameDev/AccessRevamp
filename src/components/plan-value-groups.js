import { escapeHtml } from './icons.js';

export function planValueGroups(plan, className = 'plan-value-groups') {
  const groups = plan.valueGroups || [];
  return `<div class="${escapeHtml(className)}" role="list" aria-label="${escapeHtml(plan.name)} included value">${groups.map((group) => `<div role="listitem"><strong>${escapeHtml(group.label)}</strong><span>${escapeHtml(group.detail)}</span></div>`).join('')}</div>`;
}
