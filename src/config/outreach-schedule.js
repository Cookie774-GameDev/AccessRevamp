export const OUTREACH_HARD_CAP = 20;
export const SENDING_ENABLED = false;

export function requestedDailyTarget(programDay) {
  if (!Number.isInteger(programDay) || programDay < 1) throw new RangeError('Program day must be a positive integer.');
  if (programDay <= 4) return 15;
  if (programDay <= 14) return 20;
  return 22;
}

export function enforcedDailyDraftLimit(programDay) {
  return Math.min(requestedDailyTarget(programDay), OUTREACH_HARD_CAP);
}

