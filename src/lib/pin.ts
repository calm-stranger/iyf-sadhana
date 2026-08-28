import "server-only";

/**
 * The user authenticates with WhatsApp number + 4-digit PIN. Underneath we use
 * Supabase email/password auth: a synthetic email from the phone digits, and a
 * password derived from the PIN + a server-side pepper (so it clears Supabase's
 * 6-char minimum). The real entropy is still only the 4 digits — acceptable for
 * a small closed community, and login attempts are rate limited.
 */

export function syntheticEmail(phoneE164: string): string {
  const digits = phoneE164.replace(/[^\d]/g, "");
  return `${digits}@sadhana.iyf`;
}

export function derivePassword(pin: string): string {
  const pepper = process.env.PIN_PEPPER;
  if (!pepper) throw new Error("PIN_PEPPER is not set");
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be exactly 4 digits");
  return `${pepper}:${pin}`;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** Very light E.164 check: leading + and 8–15 digits. */
export function normalizePhone(input: string): string | null {
  const trimmed = input.replace(/[\s()-]/g, "");
  if (/^\+\d{8,15}$/.test(trimmed)) return trimmed;
  if (/^\d{10}$/.test(trimmed)) return `+91${trimmed}`; // default to India
  return null;
}
