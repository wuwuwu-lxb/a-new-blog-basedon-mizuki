#!/usr/bin/env node

/**
 * Mizuki 开发服务器启动脚本
 * 同时启动 Astro 前端和 Next.js API 后端
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const apiDir = join(rootDir, 'api');

console.log('🚀 启动 Mizuki 开发服务器...\n');

// 启动 API 服务
console.log('📡 [API] 启动 Next.js API 服务 (端口 3001)');
const apiProcess = spawn('pnpm', ['dev'], {
  cwd: apiDir,
  shell: true,
  stdio: 'inherit',
});

// 等待 API 服务启动
setTimeout(() => {
  console.log('\n🎨 [Frontend] 启动 Astro 开发服务器 (端口 4321)');
  const frontendProcess = spawn('pnpm', ['dev'], {
    cwd: rootDir,
    shell: true,
    stdio: 'inherit',
  });

  frontendProcess.on('error', (err) => {
    console.error('❌ 前端服务启动失败:', err.message);
  });
}, 3000);

// 错误处理
apiProcess.on('error', (err) => {
  console.error('❌ API 服务启动失败:', err.message);
  console.log('\n请确保：');
  console.log('1. 已运行 pnpm install 安装依赖');
  console.log('2. api/.env 文件已正确配置');
  console.log('3. PostgreSQL 数据库正在运行\n');
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n⏹️  正在停止所有服务...');
  apiProcess.kill();
  process.exit();
});
