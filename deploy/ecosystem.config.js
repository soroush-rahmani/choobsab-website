// ─────────────────────────────────────────
//  تنظیم PM2 برای اجرای سرور چوبساب (VPS)
//  استفاده:  pm2 start ecosystem.config.js
// ─────────────────────────────────────────
module.exports = {
  apps: [
    {
      name: "choobsab",
      cwd: __dirname + "/../backend",
      script: "server.js",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      // لاگها — نگاه به /root/.pm2/logs
      out_file: "/root/.pm2/logs/choobsab-out.log",
      error_file: "/root/.pm2/logs/choobsab-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};