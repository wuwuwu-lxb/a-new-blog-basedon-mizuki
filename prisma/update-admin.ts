/**
 * 更新管理员账户脚本
 * 1. 创建新管理员：2752825104@qq.com / 20070521
 * 2. 删除旧管理员：admin@mizuki.com
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始更新管理员账户...');

  // 新管理员信息
  const newAdminEmail = '2752825104@qq.com';
  const newAdminPassword = await bcrypt.hash('20070521', 12);
  const oldAdminEmail = 'admin@mizuki.com';

  // 1. 创建新管理员
  const newAdmin = await prisma.user.upsert({
    where: { email: newAdminEmail },
    update: {
      password: newAdminPassword,
      role: 'ADMIN',
      name: '管理员',
    },
    create: {
      email: newAdminEmail,
      name: '管理员',
      password: newAdminPassword,
      role: 'ADMIN',
      bio: '网站管理员',
    },
  });
  console.log(`✓ 创建/更新管理员账户：${newAdminEmail} / 20070521`);

  // 2. 删除旧管理员
  try {
    await prisma.user.delete({
      where: { email: oldAdminEmail },
    });
    console.log(`✓ 已删除旧管理员账户：${oldAdminEmail}`);
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.log(`ℹ 旧管理员账户不存在：${oldAdminEmail}`);
    } else {
      throw error;
    }
  }

  console.log('\n=================================');
  console.log('新管理员账户：2752825104@qq.com / 20070521');
  console.log('=================================\n');
}

main()
  .catch((e) => {
    console.error('更新失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
