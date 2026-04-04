import dotenv from "dotenv";
dotenv.config(); // Load it here!

export const config = {
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "fallback-secret-for-tests",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "fallback-refresh-for-tests",
  accessTokenTtlMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS),
};
