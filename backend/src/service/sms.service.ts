import twilio from "twilio";
import { config } from "../config";

function getClient() {
  return twilio(config.twilioAccountSid, config.twilioAuthToken);
}

export async function sendMobileVerification(to: string): Promise<void> {
  if (!config.twilioAccountSid || !config.twilioVerifySid) {
    console.warn(`[SMS] Twilio Verify not configured — skipping OTP for ${to}`);
    return;
  }
  await getClient()
    .verify.v2.services(config.twilioVerifySid)
    .verifications.create({ to, channel: "sms" });
}

export async function checkMobileVerification(to: string, code: string): Promise<boolean> {
  if (!config.twilioAccountSid || !config.twilioVerifySid) {
    console.warn(`[SMS] Twilio Verify not configured — auto-approving for ${to}`);
    return true;
  }
  const result = await getClient()
    .verify.v2.services(config.twilioVerifySid)
    .verificationChecks.create({ to, code });
  return result.status === "approved";
}
