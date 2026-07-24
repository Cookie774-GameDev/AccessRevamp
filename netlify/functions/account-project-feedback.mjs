import { z } from 'zod';
import { requireConfirmedUser } from './_shared/auth.mjs';
import {
  assertJsonSize,
  assertMethod,
  assertSameOrigin,
  handleError,
  HttpError,
  json,
  readJsonBody,
} from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const UUID = z.string().uuid();
const feedbackSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('select_designs'),
    projectId: UUID,
    requestId: UUID,
    optionGroup: z.string().trim().min(1).max(80),
    selectedOptionIds: z.array(UUID).min(1).max(3),
    revisionRound: z.number().int().min(0).max(2),
    notes: z.string().trim().max(3000).optional().default(''),
  }).strict(),
  z.object({
    action: z.literal('request_more'),
    projectId: UUID,
    requestId: UUID,
    optionGroup: z.string().trim().min(1).max(80),
    selectedOptionIds: z.array(UUID).max(0).optional().default([]),
    revisionRound: z.number().int().min(0).max(2),
    notes: z.string().trim().max(3000).optional().default(''),
  }).strict(),
  z.object({
    action: z.literal('special_request'),
    projectId: UUID,
    requestId: UUID,
    selectedOptionIds: z.array(UUID).max(0).optional().default([]),
    revisionRound: z.number().int().min(0).max(2).optional().default(0),
    notes: z.string().trim().min(10).max(3000),
  }).strict(),
]);

function feedbackError(error) {
  if (String(error?.code || '') === '28000') {
    return new HttpError(403, 'This project is not available to the signed-in account.');
  }
  if (String(error?.code || '') === '22023') {
    return new HttpError(422, String(error?.message || 'Project feedback is invalid.'));
  }
  return new HttpError(503, 'Project feedback could not be saved.');
}

export function createAccountProjectFeedbackHandler({
  getClient = getSupabaseAdmin,
} = {}) {
  return async function accountProjectFeedback(request) {
    try {
      assertMethod(request, 'POST');
      assertSameOrigin(request);
      assertJsonSize(request);
      const client = getClient();
      await requireConfirmedUser(request, client);
      const input = feedbackSchema.parse(await readJsonBody(request));
      const result = await client.rpc('submit_accessrevamp_dashboard_feedback', {
        p_project_id: input.projectId,
        p_request_id: input.requestId,
        p_action: input.action,
        p_option_group: input.optionGroup || null,
        p_selected_option_ids: input.selectedOptionIds,
        p_notes: input.notes || null,
        p_revision_round: input.revisionRound,
      });
      if (result.error || result.data?.ok !== true) throw feedbackError(result.error);
      return json({ feedback: result.data }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleError(new HttpError(422, 'Project feedback is invalid.'));
      }
      return handleError(error);
    }
  };
}

export default createAccountProjectFeedbackHandler();
