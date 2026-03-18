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
      exec_mode: 'fork', // 使用 fork 模式（非 cluster）

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },

      // 环境变量文件（可选）
      env_production: {
        NODE_ENV: 'production',
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
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',

      // 资源限制
      max_memory_restart: '500M',

      // 集群配置（如果需要使用 cluster 模式）
      // instances: 'max',
      // exec_mode: 'cluster',

      // 健康检查（需要 pm2-plus 或 pm2.io）
      // health_check: {
      //   interval: 30000,
      //   url: 'http://localhost:3000/api/health',
      // },
    },
    {
      name: 'mizuki-api',
      script: './api/.next/standalone/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '0.0.0.0',
      },

      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_file: './logs/pm2-api-combined.log',
      error_file: './logs/pm2-api-error.log',
      out_file: './logs/pm2-api-out.log',
      merge_logs: true,
      auto_restart: true,

      // 重启策略
      watch: false,
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
