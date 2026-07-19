const bars = (values) => values.map((value) => `<i style="--v:${value}%"></i>`).join('');

export function lensVisual(key) {
  const visuals = {
    'focus-path': `<span class="lens-ui lens-ui--focus"><i>Skip</i><b>Menu</b><i>Quote</i></span>`,
    'task-flow': `<span class="lens-ui lens-ui--flow"><i></i><b>Choose</b><i></i></span>`,
    'mobile-frame': `<span class="lens-ui lens-ui--phone"><i></i><b></b><i></i></span>`,
    'load-timeline': `<span class="lens-ui lens-ui--bars">${bars([32, 56, 78, 94])}</span>`,
    'content-stack': `<span class="lens-ui lens-ui--copy"><b></b>${bars([92, 76, 54])}</span>`,
    'search-result': `<span class="lens-ui lens-ui--search"><small>accessrevamp.com</small><b>Clear page title</b><i>Useful description matches intent.</i></span>`,
    'cta-path': `<span class="lens-ui lens-ui--path"><i></i><b>Primary action →</b></span>`,
    'pricing-stack': `<span class="lens-ui lens-ui--price"><i>$50</i><b>$200</b><i>$250</i></span>`,
    'event-funnel': `<span class="lens-ui lens-ui--funnel">${bars([96, 72, 48, 28])}</span>`,
    'publishing-rhythm': `<span class="lens-ui lens-ui--calendar">${Array.from({ length: 8 }, () => '<i></i>').join('')}</span>`,
    'secure-form': `<span class="lens-ui lens-ui--secure"><b>✓</b><i>Public form</i><small>Consent recorded</small></span>`,
  };
  return visuals[key] || '';
}
