#!/usr/bin/env node

/**
 * 创建管理员账号脚本
 * 使用：node scripts/create-admin.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库路径（与 prisma/schema.prisma 保持一致）
const DATABASE_PATH = path.resolve(process.cwd(), 'prisma/dev.db');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${DATABASE_PATH}`,
    },
  },
});

async function createAdmin() {
  const email = '2752825104@qq.com';
  const name = '唔唔唔';
  const password = '20070521';

  try {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`⚠️  用户 ${email} 已存在，正在删除后重新创建...`);

      // 删除旧用户
      await prisma.user.delete({
        where: { email },
      });

      console.log('✅ 旧用户已删除');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建管理员
    const admin = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('✅ 管理员账号创建成功！');
    console.log('');
    console.log('账号信息:');
    console.log(`  邮箱：${email}`);
    console.log(`  姓名：${name}`);
    console.log(`  密码：${password}`);
    console.log(`  角色：管理员`);
    console.log('');
    console.log('登录地址：http://localhost:4321/admin/login');
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
