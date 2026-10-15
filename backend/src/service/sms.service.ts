import twilio from "twilio";
import { config } from "../config";

/*
  Without Twilio Verify there is no way to check a code. Only a local dev
  server may pretend; anywhere else (including a production box whose .env
  lost the keys) verification fails closed instead of approving every code.
*/
const devFallbackAllowed = () => process.env.NODE_ENV === "development";

function notConfigured(): Error {
  return Object.assign(new Error("Mobile verification is temporarily unavailable."), {
    statusCode: 503,
  });
}

function getClient() {
  return twilio(config.twilioAccountSid, config.twilioAuthToken);
}

export async function sendMobileVerification(to: string): Promise<void> {
  if (!config.twilioAccountSid || !config.twilioVerifySid) {
    if (!devFallbackAllowed()) throw notConfigured();
    console.warn(`[SMS] Twilio Verify not configured — skipping OTP for ${to} (dev only)`);
    return;
  }
  await getClient()
    .verify.v2.services(config.twilioVerifySid)
    .verifications.create({ to, channel: "sms" });
}

export async function checkMobileVerification(to: string, code: string): Promise<boolean> {
  if (!config.twilioAccountSid || !config.twilioVerifySid) {
    if (!devFallbackAllowed()) throw notConfigured();
    console.warn(`[SMS] Twilio Verify not configured — auto-approving for ${to} (dev only)`);
    return true;
  }
  const result = await getClient()
    .verify.v2.services(config.twilioVerifySid)
    .verificationChecks.create({ to, code });
  return result.status === "approved";
}
