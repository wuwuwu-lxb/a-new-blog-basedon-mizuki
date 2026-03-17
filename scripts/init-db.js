#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 自动创建数据库、推送 Schema 并初始化数据
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = join(__dirname, '..');

console.log('🚀 开始初始化 Mizuki 数据库...\n');

try {
  // 检查 .env 文件
  const envPath = join(apiDir, '.env');
  try {
    readFileSync(envPath, 'utf-8');
    console.log('✅ .env 文件存在\n');
  } catch {
    console.error('❌ 未找到 .env 文件');
    console.error('请先创建 api/.env 文件，参考 api/.env.example\n');
    process.exit(1);
  }

  // 步骤 1: 生成 Prisma Client
  console.log('📦 步骤 1/3: 生成 Prisma Client...');
  execSync('pnpm db:generate', {
    cwd: apiDir,
    stdio: 'inherit',
  });
  console.log('✅ Prisma Client 生成成功\n');

  // 步骤 2: 推送数据库结构
  console.log('📐 步骤 2/3: 推送数据库结构...');
  execSync('pnpm db:push', {
    cwd: apiDir,
    stdio: 'inherit',
  });
  console.log('✅ 数据库结构推送成功\n');

  // 步骤 3: 初始化测试数据
  console.log('🌱 步骤 3/3: 初始化测试数据...');
  console.log('提示：跳过此步骤可按 Ctrl+C，之后手动运行 pnpm db:seed\n');

  const readline = await new Promise((resolve) => {
    process.stdout.write('是否初始化测试数据？(Y/n): ');
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase());
    });
  });

  if (readline !== 'n' && readline !== 'no') {
    execSync('pnpm db:seed', {
      cwd: apiDir,
      stdio: 'inherit',
    });
    console.log('✅ 测试数据初始化成功\n');
  }

  console.log('=================================');
  console.log('✨ 数据库初始化完成！');
  console.log('=================================\n');

  console.log('下一步:');
  console.log('1. 运行 pnpm dev:all 启动开发服务器');
  console.log('2. 访问 http://localhost:4321 查看前端');
  console.log('3. 访问 http://localhost:3001/api 查看 API\n');

} catch (error) {
  console.error('\n❌ 初始化失败:', error.message);
  console.error('\n请检查:');
  console.error('1. PostgreSQL 是否正在运行');
  console.error('2. api/.env 中的 DATABASE_URL 是否正确');
  console.error('3. 数据库用户是否有足够权限\n');
  process.exit(1);
}
