/** Normalize Indian mobile to 10 digits (optional +91 / 91 / 0 prefix). */
export const normalizeMobile = (raw) => {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits;
};

export const isValidIndianMobile = (mobile) => /^[6-9]\d{9}$/.test(mobile);
