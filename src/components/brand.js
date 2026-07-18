export function brandMonogram({ animated = false } = {}) {
  return `<svg class="brand-monogram${animated ? ' brand-monogram--animated' : ''}" viewBox="0 0 56 56" aria-hidden="true">
    <path class="brand-monogram__tile" d="M12 2h32a10 10 0 0 1 10 10v32a10 10 0 0 1-10 10H12A10 10 0 0 1 2 44V12A10 10 0 0 1 12 2Z"/>
    <path class="brand-monogram__stroke" d="M13 39 25.5 14 38 39M18 30h15"/>
    <path class="brand-monogram__stroke brand-monogram__stroke--r" d="M31.5 17h5.7c5 0 7.8 2.5 7.8 6.2 0 4-3.1 6.3-8.1 6.3h-3.5L45 40"/>
  </svg>`;
}

export function brandLink({ animated = false, className = '' } = {}) {
  return `<a class="brand ${className}" href="/" data-nav aria-label="AccessRevamp home">${brandMonogram({ animated })}<span class="brand-wordmark">Access<span>Revamp</span></span></a>`;
}
