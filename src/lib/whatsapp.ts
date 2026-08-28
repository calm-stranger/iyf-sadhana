/** Build a wa.me deep link that opens a 1:1 chat with an optional prefilled message. */
export function whatsappLink(phoneE164: string, message?: string): string {
  const digits = phoneE164.replace(/[^\d]/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function weekNudgeMessage(name: string, weekLabel: string): string {
  return `Hare Krishna ${name} 🙏\nJust checking in on your sadhana card for ${weekLabel}. Let me know if I can help.`;
}
