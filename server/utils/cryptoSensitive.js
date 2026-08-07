import crypto from "crypto";

const ALGO = "aes-256-gcm";

const getKey = () => {
  const raw = process.env.SENSITIVE_DATA_KEY || process.env.JWT_SECRET || "dev-sensitive-key-change-me";
  return crypto.createHash("sha256").update(String(raw)).digest();
};

export const encryptSensitive = (plain) => {
  if (plain == null || plain === "") return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
};

export const decryptSensitive = (payload) => {
  if (!payload || typeof payload !== "string" || !payload.includes(":")) return "";
  try {
    const [ivHex, tagHex, dataHex] = payload.split(":");
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final()
    ]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
};

export const maskAadhaar = (aadhaar) => {
  const digits = String(aadhaar || "").replace(/\D/g, "");
  if (digits.length < 4) return "XXXX";
  return `XXXX-XXXX-${digits.slice(-4)}`;
};

export const maskAccount = (account) => {
  const digits = String(account || "").replace(/\D/g, "");
  if (digits.length < 4) return "XXXX";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

export const hashOtp = (code) =>
  crypto.createHash("sha256").update(String(code) + (process.env.JWT_SECRET || "otp-salt")).digest("hex");

export const normalizeIndianMobile = (raw) => {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits;
};

export const isValidIndianMobile = (value) => /^[6-9]\d{9}$/.test(normalizeIndianMobile(value));

export const isValidPin = (value) => /^\d{6}$/.test(String(value || "").trim());
