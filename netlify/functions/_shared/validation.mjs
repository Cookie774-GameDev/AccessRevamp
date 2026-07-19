import { z } from 'zod';

const publicHttpUrl = z.string().trim().max(2048).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol)
      && !url.username
      && !url.password
      && !['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}, 'Enter a valid public website URL.');

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(80),
  lastName: z.string().trim().max(80).default(''),
  email: z.string().trim().email('Enter a valid email.').max(254).transform((value) => value.toLowerCase()),
  websiteUrl: publicHttpUrl.optional().default(''),
  message: z.string().trim().min(20, 'Please include a little more detail.').max(4000),
  companyFax: z.string().max(0).optional().default(''),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required so we can reply.' }) }),
}).strict();

export const checkoutSchema = z.object({
  targetTier: z.enum(['homepage_reveal', 'complete_revamp', 'cinematic_scroll']),
  requestId: z.string().uuid(),
}).strict();

export const entitlementQuoteSchema = z.object({
  targetTier: z.enum(['homepage_reveal', 'complete_revamp', 'cinematic_scroll']),
}).strict();

export const freeSnapshotSchema = z.object({
  websiteUrl: publicHttpUrl.refine(Boolean, 'A public website URL is required.').refine((value) => {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === 'https:'
      && !/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)
      && !hostname.endsWith('.local') && !hostname.endsWith('.internal');
  }, 'Enter a public HTTPS website URL.'),
  contactEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required.' }) }),
  businessContext: z.string().trim().min(20).max(1200),
  requestId: z.string().uuid(),
}).strict();

const projectReferenceUrl = publicHttpUrl.refine(Boolean, 'Reference links must be public HTTP or HTTPS URLs.');

export const projectIntakeTextSchema = z.object({
  projectId: z.string().uuid(),
  plan: z.enum(['complete_revamp', 'cinematic_scroll']),
  pages: z.array(z.enum(['home', 'about', 'services', 'shop', 'portfolio', 'faq', 'contact', 'custom'])).min(1).max(5),
  styleNotes: z.string().trim().min(20).max(2000),
  contentNotes: z.string().trim().max(4000).default(''),
  cinematicNotes: z.string().trim().max(2000).default(''),
  projectNotes: z.string().trim().max(4000).default(''),
  referenceUrls: z.array(projectReferenceUrl).max(10),
  inspirationChoices: z.array(projectReferenceUrl).max(5),
  rightsConfirmed: z.literal(true),
}).strict();

export const outreachDraftSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  websiteUrl: publicHttpUrl.refine(Boolean, 'A public website URL is required.'),
  recipientEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  contactSourceUrl: publicHttpUrl.refine(Boolean, 'A public contact-source URL is required.'),
  subject: z.string().trim().min(8).max(120),
  bodyText: z.string().trim().min(80).max(8000),
}).strict();

const privatePricingTier = z.enum(['free_snapshot', 'homepage_reveal', 'complete_revamp', 'cinematic_scroll']);
const privatePricingWebsite = z.string().trim().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      && !['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase())
      && !url.hostname.toLowerCase().endsWith('.local')
      && !url.hostname.toLowerCase().endsWith('.internal');
  } catch { return false; }
}, 'Enter a public HTTPS website URL.');

export const privatePricingIssueSchema = z.object({
  action: z.literal('issue'),
  customerLabel: z.string().trim().min(1).max(120),
  websiteUrl: privatePricingWebsite,
  scopeSummary: z.string().trim().min(20).max(800),
  recommendedTier: privatePricingTier,
  internalReference: z.string().trim().max(240).optional().default(''),
  expiresAt: z.string().datetime({ offset: true }),
}).strict();

export const privatePricingRevokeSchema = z.object({
  action: z.literal('revoke'),
  contextId: z.string().uuid(),
  reason: z.string().trim().min(8).max(500),
}).strict();

export const privatePricingResolveSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
}).strict();

export const privatePricingActionSchema = z.discriminatedUnion('action', [
  privatePricingIssueSchema,
  privatePricingRevokeSchema,
]);
