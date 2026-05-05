// PM2 Ecosystem Config — used by Hostinger Node.js hosting
// Upload this file to your server root alongside the backend folder.
// Start with: pm2 start ecosystem.config.cjs
// Or via Hostinger panel: set entry point to "backend/server.js"

module.exports = {
  apps: [
    {
      name: 'bajaj-construction',
      script: './backend/server.js',
      cwd: './',                        // Root of the project
      instances: 1,                     // Hostinger shared plans = 1 instance
      exec_mode: 'fork',
      node_args: '--experimental-vm-modules',

      // ─── Environment ─────────────────────────────────────────────────
      // These are fallback values only.
      // Set real secrets in Hostinger's Environment Variables panel — NOT here.
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      },

      // ─── Logging ─────────────────────────────────────────────────────
      error_file: './logs/err.log',
      out_file:   './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // ─── Reliability ─────────────────────────────────────────────────
      watch: false,                     // Never watch in production (causes restarts)
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // ─── Memory guard ────────────────────────────────────────────────
      max_memory_restart: '512M',
    },
  ],
}
