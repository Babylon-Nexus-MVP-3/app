module.exports = {
  apps: [
    {
      // Must match the process running in production. `pm2 restart <file>`
      // starts a second process when the names differ, and the copy can't
      // bind port 3229.
      name: "bnexus-v2",
      script: "dist/server.js",
      // One process on purpose. The overdue-invoice scheduler runs in-process
      // and the rate limiters keep in-memory counts, so cluster mode fired the
      // 08:00 escalations once per CPU and multiplied every rate limit by the
      // worker count. Traffic fits comfortably in one process on a t3.small.
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3229,
      },
    },
  ],
};
