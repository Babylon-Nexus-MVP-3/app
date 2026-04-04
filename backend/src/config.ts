export const config = {
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenTtlMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS),
};
