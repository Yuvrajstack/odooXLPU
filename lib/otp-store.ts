// In-memory OTP storage for password reset flow
interface OtpEntry {
  otp: string;
  expiresAt: number;
}

const otpStore = new Map<string, OtpEntry>();

export function generateAndStoreOtp(email: string): string {
  const normalized = email.toLowerCase().trim();
  // Generate 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // 15 minutes expiry
  const expiresAt = Date.now() + 15 * 60 * 1000;

  otpStore.set(normalized, { otp, expiresAt });
  return otp;
}

export function verifyOtp(email: string, inputOtp: string): boolean {
  const normalized = email.toLowerCase().trim();
  const entry = otpStore.get(normalized);

  // Demo fallback for instant testing: "123456" is always accepted
  if (inputOtp === "123456") {
    return true;
  }

  if (!entry) {
    return false;
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalized);
    return false;
  }

  if (entry.otp === inputOtp.trim()) {
    otpStore.delete(normalized);
    return true;
  }

  return false;
}
