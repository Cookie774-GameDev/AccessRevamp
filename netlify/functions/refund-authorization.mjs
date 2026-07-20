import { z, ZodError } from 'zod';
import { assertJsonSize, assertMethod, assertSameOrigin, handleError, HttpError, json, readJsonBody } from './_shared/http.mjs';
import { requireOperator } from './_shared/operator-auth.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('request'), refundRequestId: z.string().uuid() }).strict(),
  z.object({ action: z.literal('approve'), authorizationId: z.string().uuid() }).strict(),
]);

export default async function refundAuthorization(request) {
  try {
    assertMethod(request, 'POST');
    assertSameOrigin(request);
    assertJsonSize(request);
    let input;
    try {
      input = schema.parse(await readJsonBody(request));
    } catch (error) {
      if (error instanceof ZodError) throw new HttpError(422, 'Refund authorization request is invalid.');
      throw error;
    }

    const admin = getSupabaseAdmin();
    const operator = await requireOperator(request, admin);
    if (input.action === 'request') {
      const { data, error } = await admin.rpc('create_accessrevamp_refund_authorization', {
        p_refund_request_id: input.refundRequestId,
        p_operator_id: operator.id,
      });
      if (error || !data) throw new HttpError(409, 'The refund request could not be authorized.');
      return json({ authorizationId: data, status: 'pending_second_approval' }, 201);
    }

    const { error } = await admin.rpc('approve_accessrevamp_refund_authorization', {
      p_authorization_id: input.authorizationId,
      p_operator_id: operator.id,
    });
    if (error) throw new HttpError(409, 'The refund authorization could not be approved.');
    return json({ authorizationId: input.authorizationId, status: 'approved' });
  } catch (error) {
    return handleError(error);
  }
}
