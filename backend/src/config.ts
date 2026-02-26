export const config = {
  jwtAccessSecret:
    process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTokenTtlMinutes: Number(
    process.env.ACCESS_TOKEN_TTL_MINUTES ?? "10",
  ),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? "1"),
};

