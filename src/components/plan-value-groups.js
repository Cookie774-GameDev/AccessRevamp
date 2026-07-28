import { escapeHtml } from './icons.js';

export function planValueGroups(plan, className = 'plan-value-groups') {
  const groups = plan.valueGroups || [];
  return `<ul class="${escapeHtml(className)}" aria-label="${escapeHtml(plan.name)} included value">${groups.map((group) => `<li><strong>${escapeHtml(group.label)}</strong><span>${escapeHtml(group.detail)}</span></li>`).join('')}</ul>`;
}
