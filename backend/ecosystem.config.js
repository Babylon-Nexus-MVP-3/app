module.exports = {
  apps: [
    {
      name: "bnexus-backend",
      script: "dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3229,
      },
    },
  ],
};
