export const EMAIL_OTP_PATTERN = /^[0-9]{6,8}$/;

export function normalizeEmailOtp(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 8);
}

export function isEmailOtp(value) {
  return EMAIL_OTP_PATTERN.test(value);
}
