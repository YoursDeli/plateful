// Normalises what an admin types ("0803 123 4567", "+234 803…", "234803…")
// into wa.me's format: international digits, no "+". Returns null if it
// can't be a valid number. Nigerian local numbers (0 + 10 digits) get 234.
export function toWhatsAppNumber(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("0") && digits.length === 11) digits = `234${digits.slice(1)}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

// 2348031234567 → +234 803 123 4567 (display only).
export function formatWhatsAppNumber(digits: string) {
  const m = digits.match(/^234(\d{3})(\d{3})(\d{4})$/);
  return m ? `+234 ${m[1]} ${m[2]} ${m[3]}` : `+${digits}`;
}
