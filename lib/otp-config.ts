/**
 * In-memory / database backing for the website download OTP gate toggle.
 */

let isOtpEnabled = true;

export async function getOtpDownloadEnabled(): Promise<boolean> {
  return isOtpEnabled;
}

export async function setOtpDownloadEnabled(enabled: boolean, updatedBy?: string): Promise<boolean> {
  isOtpEnabled = enabled;
  return isOtpEnabled;
}
