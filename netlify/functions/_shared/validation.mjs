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
  planKey: z.enum(['homepage_reveal', 'complete_revamp', 'cinematic_scroll']),
  email: z.string().trim().email().max(254).optional(),
  requestId: z.string().uuid(),
}).strict();

export const outreachDraftSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  websiteUrl: publicHttpUrl.refine(Boolean, 'A public website URL is required.'),
  recipientEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  contactSourceUrl: publicHttpUrl.refine(Boolean, 'A public contact-source URL is required.'),
  subject: z.string().trim().min(8).max(120),
  bodyText: z.string().trim().min(80).max(8000),
}).strict();
