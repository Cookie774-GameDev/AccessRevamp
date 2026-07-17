const shortenerPattern = /\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|buff\.ly|rebrand\.ly|cutt\.ly)\b/i;
const misleadingPattern = /\b(?:we partnered with|we are partnered with|you requested (?:this|a review)|requested by your team|official partner)\b/i;
const scarePattern = /\b(?:you (?:are|may be) noncompliant|ada noncompliant|wcag noncompliant|could be sued|lawsuit risk|legal violation|security vulnerabilit(?:y|ies)|your site (?:was|has been) hacked|data breach|compromised|lost revenue|losing \$?\d+|guaranteed compliance)\b/i;

export function assertOutreachDraft({ subject, bodyText, reviewedDomain }) {
  const normalizedSubject = String(subject || '').trim();
  const normalizedBody = String(bodyText || '').trim();
  const domain = String(reviewedDomain || '').trim().toLowerCase().replace(/^www\./, '');

  if (/^(?:re|fwd?)\s*:/i.test(normalizedSubject)) {
    throw new Error('Outreach subjects may not imitate a reply or forward.');
  }
  if (shortenerPattern.test(normalizedBody)) {
    throw new Error('Outreach may not use URL-shortening services.');
  }
  if (misleadingPattern.test(`${normalizedSubject}\n${normalizedBody}`)) {
    throw new Error('Outreach may not imply a request, endorsement, or partnership that does not exist.');
  }
  if (scarePattern.test(`${normalizedSubject}\n${normalizedBody}`)) {
    throw new Error('Outreach may not use unsupported security, legal, compliance, or revenue scare claims.');
  }
  if (domain && !normalizedBody.toLowerCase().includes(domain)) {
    throw new Error('The reviewed business domain must appear in the individualized message body.');
  }
  return true;
}
