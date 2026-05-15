import twilio from "twilio";
import { config } from "../config";

export async function sendOtpSms(to: string, code: string): Promise<void> {
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioFromNumber) {
    console.warn(`[SMS] Twilio not configured — OTP for ${to}: ${code}`);
    return;
  }
  const client = twilio(config.twilioAccountSid, config.twilioAuthToken);
  await client.messages.create({
    body: `Your VouchPay code is ${code}. Valid for 10 minutes.`,
    from: config.twilioFromNumber,
    to,
  });
}
