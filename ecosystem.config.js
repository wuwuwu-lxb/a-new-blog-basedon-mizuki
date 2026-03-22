/**
 * PM2 生态系统配置文件
 * 用于非 Docker 环境的生产部署
 *
 * 使用方法:
 * 1. 安装 PM2: npm install -g pm2
 * 2. 安装依赖：pnpm install --prod
 * 3. 构建项目：pnpm build
 * 4. 启动服务：pm2 start ecosystem.config.js
 * 5. 设置开机自启：pm2 startup && pm2 save
 */

module.exports = {
  apps: [
    {
      name: 'mizuki-blog',
      script: './dist/server/entry.mjs',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 4321,
        HOSTNAME: '0.0.0.0',
        DATABASE_URL: 'file:./prisma/dev.db',
      },

      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_file: './logs/pm2-combined.log',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      auto_restart: true,

      // 重启策略
      watch: false,
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
