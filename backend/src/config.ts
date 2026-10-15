/*
  The access-token secret signs every session. A fallback baked into the source
  is public, so anyone could mint a token for any user — only local dev and the
  test suite may use one. Anywhere else, refuse to start rather than run with it.
  (Refresh tokens are random strings stored in Mongo, so they need no secret.)
*/
function jwtAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (secret) return secret;
  const env = process.env.NODE_ENV;
  if (env === "test" || env === "development") return "fallback-secret-for-tests";
  throw new Error(
    `JWT_ACCESS_SECRET is not set (NODE_ENV=${env ?? "unset"}). Refusing to start with a public fallback.`
  );
}

export const config = {
  jwtAccessSecret: jwtAccessSecret(),
  accessTokenTtlMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES) || 10,
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 1,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER || "",
  twilioVerifySid: process.env.TWILIO_VERIFY_SID || "",
};
